import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import crypto from 'crypto';

export async function POST(request: Request) {
  try {
    const apiKey = request.headers.get("x-api-key");
    const { studentId, checkInType } = await request.json();

    if (!studentId) {
      return NextResponse.json({ success: false, error: 'Student ID is required' }, { status: 400 });
    }

    const supabaseAdmin = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    
    let authorizedTenantId = null;

    if (apiKey) {
      // API Key Doğrulaması (Fiziksel Kiosk cihazları için)
      const keyHash = crypto.createHash("sha256").update(apiKey).digest("hex");
      const { data: keyData, error: keyError } = await supabaseAdmin
        .from('tenant_api_keys')
        .select('tenant_id')
        .eq('key_hash', keyHash)
        .eq('is_active', true)
        .single();

      if (keyError || !keyData) {
        return NextResponse.json({ success: false, error: 'Geçersiz veya iptal edilmiş API Anahtarı' }, { status: 403 });
      }
      authorizedTenantId = keyData.tenant_id;
      // Update last_used_at async
      supabaseAdmin.from('tenant_api_keys').update({ last_used_at: new Date().toISOString() }).eq('key_hash', keyHash).then();
    } else {
      // JWT Doğrulaması (Web Kiosk simülatörü için)
      const cookieStore = await cookies();
      const supabaseAuth = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          cookies: {
            getAll() { return cookieStore.getAll(); },
            setAll() { },
          },
        }
      );
      const { data: authData } = await supabaseAuth.auth.getUser();
      if (!authData?.user) {
         return NextResponse.json({ success: false, error: 'Yetkisiz işlem (API Key veya Oturum eksik)' }, { status: 401 });
      }
      // Kullanıcının tenant_id'sini belirle (impersonate cookie veya JWT)
      const impersonateTenantId = cookieStore.get("impersonate_tenant_id")?.value;
      if (impersonateTenantId) {
        authorizedTenantId = impersonateTenantId;
      } else {
        const { data: profile } = await supabaseAdmin.from('profiles').select('tenant_id').eq('user_id', authData.user.id).single();
        authorizedTenantId = profile?.tenant_id;
      }
    }

    // Öğrenciyi getir
    const { data: student, error } = await supabaseAdmin
      .from('students')
      .select('full_name, parent_phone, tenant_id, tracking_token')
      .eq('id', studentId)
      .single();

    if (error || !student) {
      return NextResponse.json({ success: false, error: 'Öğrenci bulunamadı' }, { status: 404 });
    }

    if (authorizedTenantId && student.tenant_id !== authorizedTenantId) {
      return NextResponse.json({ success: false, error: 'Öğrenci bu işletmeye ait değil' }, { status: 403 });
    }

    // --- OTURUM MANTIĞI (GİRİŞ/ÇIKIŞ) ---
    // En son "active" durumundaki kaydı bul
    const { data: activeAttendance } = await supabaseAdmin
      .from('attendances')
      .select('*')
      .eq('student_id', studentId)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    let action: 'in' | 'out' | 'cooldown' = 'in';

    if (activeAttendance) {
      // Aktif kayıt varsa, ne kadar süre geçmiş?
      const checkInTime = new Date(activeAttendance.check_in_at || activeAttendance.created_at).getTime();
      const now = new Date().getTime();
      const diffMinutes = (now - checkInTime) / 1000 / 60;

      if (diffMinutes < 5) {
        action = 'cooldown';
        return NextResponse.json({ success: true, action }); // İşlem yapma
      } else {
        // Çıkış yap
        action = 'out';
        await supabaseAdmin.from('attendances')
          .update({
            status: 'completed',
            check_out_at: new Date().toISOString(),
            check_out_type: checkInType
          })
          .eq('id', activeAttendance.id);
      }
    } else {
      // Giriş yap
      action = 'in';
      await supabaseAdmin.from('attendances')
        .insert({
          tenant_id: student.tenant_id,
          student_id: studentId,
          check_in_type: checkInType,
          status: 'active',
          check_in_at: new Date().toISOString()
        });
    }

    // --- BİLDİRİM GÖNDERİMİ ---
    const phone = student.parent_phone;
    if (phone) {
      const GREENAPI_INSTANCE_ID = process.env.GREEN_API_INSTANCE_ID || "";
      const GREENAPI_TOKEN = process.env.GREEN_API_TOKEN || "";
      const isWhatsAppEnabled = GREENAPI_INSTANCE_ID && GREENAPI_TOKEN && GREENAPI_INSTANCE_ID !== 'mock_instance' && GREENAPI_TOKEN !== 'mock_token';

      if (isWhatsAppEnabled) {
        const time = new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Istanbul' });
        // Eğer token migration'ı henüz çalıştırılmadıysa fallback (eski yapı veya 404 durumu)
        const trackingUrl = student.tracking_token 
          ? `${process.env.NEXT_PUBLIC_APP_URL}/veli/takip/${student.tracking_token}`
          : `${process.env.NEXT_PUBLIC_APP_URL}`;
        
        let message = '';
        if (action === 'in') {
          message = `Sayın Velimiz, öğrencimiz ${student.full_name} saat ${time} itibarıyla kurumumuza giriş yapmıştır.\n\nÇocuğunuzun durumunu ve kantin hareketlerini canlı takip etmek için: ${trackingUrl}`;
        } else if (action === 'out') {
          message = `Sayın Velimiz, öğrencimiz ${student.full_name} saat ${time} itibarıyla kurumumuzdan ayrılmıştır.\n\nÇocuğunuzun durumunu ve kantin hareketlerini canlı takip etmek için: ${trackingUrl}`;
        }
        
        const { enqueueWhatsAppMessage } = await import('@/lib/whatsapp');
        await enqueueWhatsAppMessage(student.tenant_id, phone, message);
      }
    }

    // Cache'i Anında Temizle
    revalidatePath(`/veli/${studentId}`, 'page');

    return NextResponse.json({ success: true, action, studentName: student.full_name });

  } catch (error: any) {
    console.error("Check-in error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
