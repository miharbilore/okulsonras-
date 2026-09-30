import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

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

    const cleanPhone = phone.replace(/\D/g, "");
    const formattedPhone = cleanPhone.startsWith("0")
      ? "9" + cleanPhone
      : cleanPhone.startsWith("90")
      ? cleanPhone
      : "90" + cleanPhone;

    const message = "✅ Tebrikler! OkulSonrası WhatsApp Business entegrasyonunuz başarıyla bağlandı ve kullanıma hazır.";

    const url = `https://graph.facebook.com/v20.0/${metaPhoneId}/messages`;
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${metaToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: formattedPhone,
        type: "text",
        text: { preview_url: false, body: message }
      })
    });
    
    const result = await response.json();
    
    if (!response.ok) {
      // Error handling to display user-friendly message
      const errorMsg = result.error?.message || `HTTP ${response.status}`;
      return NextResponse.json({ success: false, error: errorMsg }, { status: 400 });
    }
    
    return NextResponse.json({ success: true, messageId: result.messages?.[0]?.id });

  } catch (error: any) {
    console.error("WhatsApp Test API Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
