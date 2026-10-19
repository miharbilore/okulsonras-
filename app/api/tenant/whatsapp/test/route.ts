import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { sendWhatsAppMessage } from '@/lib/whatsapp';

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: authData } = await supabase.auth.getUser();
    
    if (!authData?.user) {
      return NextResponse.json({ success: false, error: "Yetkisiz erişim." }, { status: 401 });
    }

    const { phone, metaPhoneId, metaToken } = await request.json();

    if (!phone || !metaPhoneId || !metaToken) {
      return NextResponse.json({ success: false, error: "Eksik parametre." }, { status: 400 });
    }

    const message = "✅ Tebrikler! OkulSonrası WhatsApp Business entegrasyonunuz başarıyla bağlandı ve kullanıma hazır.";

    const result = await sendWhatsAppMessage(phone, message, {
      meta_phone_id: metaPhoneId,
      meta_token: metaToken
    });

    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error || "Mesaj gönderilemedi." }, { status: 400 });
    }

    return NextResponse.json({ success: true, messageId: result.messageId });

  } catch (error: any) {
    console.error("WhatsApp Test API Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
