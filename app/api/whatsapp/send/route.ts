import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { phone, message } = await request.json();

    if (!phone || !message) {
      return NextResponse.json({ success: false, error: 'Telefon numarası ve mesaj zorunludur.' }, { status: 400 });
    }

    const GREENAPI_INSTANCE_ID = process.env.GREEN_API_INSTANCE_ID || "";
    const GREENAPI_TOKEN = process.env.GREEN_API_TOKEN || "";
    const GREENAPI_BASE = `https://api.green-api.com/waInstance${GREENAPI_INSTANCE_ID}`;

    if (!GREENAPI_INSTANCE_ID || !GREENAPI_TOKEN || GREENAPI_INSTANCE_ID === 'mock_instance' || GREENAPI_TOKEN === 'mock_token') {
      return NextResponse.json({ 
        success: false, 
        error: 'WhatsApp henüz yapılandırılmamış. İşletme Ayarları > WhatsApp bölümünden QR kod ile cihazınızı eşleştirin.' 
      });
    }

    // Phone formatting
    let formattedPhone = phone.replace(/\D/g, "");
    if (formattedPhone.startsWith("0")) {
      formattedPhone = "9" + formattedPhone;
    } else if (!formattedPhone.startsWith("90")) {
      formattedPhone = "90" + formattedPhone;
    }

    const chatId = `${formattedPhone}@c.us`;

    const response = await fetch(`${GREENAPI_BASE}/sendMessage/${GREENAPI_TOKEN}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        chatId,
        message,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("WhatsApp API Error:", data);
      return NextResponse.json({ success: false, error: 'WhatsApp API hatası' }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });

  } catch (error: any) {
    console.error("Error sending WhatsApp message:", error);
    return NextResponse.json({ success: false, error: error.message || 'Sunucu hatası' }, { status: 500 });
  }
}
