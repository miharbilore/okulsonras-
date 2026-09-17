import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { sendCheckInMessage } from '@/lib/whatsapp';
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

    const { data: student, error } = await supabaseAdmin
      .from('students')
      .select('full_name, parent_phone, tenant_id')
      .eq('id', studentId)
      .single();

    if (error || !student) {
      return NextResponse.json({ success: false, error: 'Öğrenci bulunamadı' }, { status: 404 });
    }

    if (authorizedTenantId && student.tenant_id !== authorizedTenantId) {
      return NextResponse.json({ success: false, error: 'Öğrenci bu işletmeye ait değil' }, { status: 403 });
    }

    const phone = student.parent_phone;
    if (!phone) {
      // Veli telefonu yoksa cache güncelleyip dön
      revalidatePath(`/veli/${studentId}`, 'page');
      return NextResponse.json({ success: true, message: 'Öğrenci giriş yaptı ama veli telefonu yok' });
    }

    const GREENAPI_INSTANCE_ID = process.env.GREEN_API_INSTANCE_ID || "";
    const GREENAPI_TOKEN = process.env.GREEN_API_TOKEN || "";
    const isWhatsAppEnabled = GREENAPI_INSTANCE_ID && GREENAPI_TOKEN && GREENAPI_INSTANCE_ID !== 'mock_instance' && GREENAPI_TOKEN !== 'mock_token';

    const action = checkInType === 'qr' ? 'QR Kod' : 'PIN Kodu';
    const message = `Sayın velimiz, öğrenciniz ${student.full_name} şu an ${action} ile giriş yapmıştır.\n\nCanlı takip: ${process.env.NEXT_PUBLIC_APP_URL}/veli/${studentId}`;

    if (isWhatsAppEnabled) {
      // Kuyruğa Ekleme (Asenkron)
      const { enqueueWhatsAppMessage } = await import('@/lib/whatsapp');
      await enqueueWhatsAppMessage(student.tenant_id, phone, message);
    }

    // Cache'i Anında Temizle
    revalidatePath(`/veli/${studentId}`, 'page');

    return NextResponse.json({ success: true, queued: isWhatsAppEnabled });

  } catch (error: any) {
    console.error("Check-in error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
