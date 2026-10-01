import { NextResponse } from 'next/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import crypto from 'crypto';

export async function POST(request: Request) {
  try {
    const apiKey = request.headers.get("x-api-key");
    const { studentId, items, totalAmount } = await request.json();

    if (!studentId || !items || !items.length || totalAmount === undefined) {
      return NextResponse.json({ success: false, error: 'Eksik veri gönderildi.' }, { status: 400 });
    }

    const supabaseAdmin = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    
    let authorizedTenantId = null;

    if (apiKey) {
      // API Key Doğrulaması (Kiosk / POS cihazları için)
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
    } else {
      return NextResponse.json({ success: false, error: 'API Anahtarı eksik' }, { status: 401 });
    }

    // 1. Öğrenciyi kontrol et
    const { data: student, error: studentError } = await supabaseAdmin
      .from('students')
      .select('id, full_name, tenant_id, parent_phone, tracking_token, weekly_limit')
      .eq('id', studentId)
      .single();

    if (studentError || !student || student.tenant_id !== authorizedTenantId) {
      return NextResponse.json({ success: false, error: 'Öğrenci bulunamadı veya yetkisiz işlem.' }, { status: 404 });
    }

    // Haftanın başlangıcını bul
    const now = new Date();
    const startOfWeek = new Date(now);
    const day = now.getDay() || 7; // Pazar = 7
    startOfWeek.setHours(0, 0, 0, 0);
    startOfWeek.setDate(now.getDate() - day + 1);

    // Öğrencinin bu haftaki toplam harcamasını bul
    const { data: currentWeekTransactions } = await supabaseAdmin
      .from('transactions')
      .select('total_amount')
      .eq('student_id', studentId)
      .gte('created_at', startOfWeek.toISOString());
      
    const spentThisWeek = currentWeekTransactions?.reduce((acc, tx) => acc + Number(tx.total_amount), 0) || 0;
    const remainingLimit = Number(student.weekly_limit) - spentThisWeek;

    // Limit kontrolü (İstenirse limit aşımında engellenebilir, ama şu an sadece frontend'de uyarı veriyoruz)
    // if (totalAmount > remainingLimit) return error;

    // 2. Transaction'ı kaydet
    const { error: txError } = await supabaseAdmin
      .from('transactions')
      .insert({
        tenant_id: authorizedTenantId,
        student_id: studentId,
        items: items, // JSONB array of products
        total_amount: totalAmount
      });

    if (txError) {
      throw txError;
    }

    // 3. WhatsApp Kuyruğuna Bildirim Ekle
    const phone = student.parent_phone;
    if (phone) {
      const itemsList = items.map((i: any) => `${i.qty}x ${i.name}`).join(", ");
      const newRemaining = remainingLimit - totalAmount;
      const trackingUrl = student.tracking_token 
        ? `${process.env.NEXT_PUBLIC_APP_URL}/veli/takip/${student.tracking_token}`
        : `${process.env.NEXT_PUBLIC_APP_URL}`;
        
      const message = `Sayın Velimiz, öğrencimiz ${student.full_name} kantinden ₺${totalAmount.toFixed(2)} tutarında alışveriş yapmıştır.\n(Alınanlar: ${itemsList} - Kalan Haftalık Harcama Limiti: ₺${newRemaining.toFixed(2)}).\n\nÇocuğunuzun durumunu canlı izlemek için: ${trackingUrl}`;
      
      const { enqueueWhatsAppMessage } = await import('@/lib/whatsapp');
      await enqueueWhatsAppMessage(student.tenant_id, phone, message);
    }

    return NextResponse.json({ success: true, message: 'İşlem başarıyla kaydedildi' });

  } catch (error: any) {
    console.error("POS checkout error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
