import { NextResponse } from "next/server";

/**
 * POST /api/checkout
 * Ödeme başlatma endpoint'i.
 * İyzico Sandbox/Production API'sine checkout form isteği atar.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { plan, email, name } = body;

    if (!plan || !email) {
      return NextResponse.json({ error: "Plan ve e-posta zorunludur." }, { status: 400 });
    }

    const price = plan === "professional" ? "1950.00" : "1250.00";
    const planName = plan === "professional" ? "Profesyonel Paket" : "Standart Paket";

    const IYZICO_API_KEY = process.env.IYZICO_API_KEY || "";
    const IYZICO_SECRET_KEY = process.env.IYZICO_SECRET_KEY || "";
    const IYZICO_BASE_URL = process.env.IYZICO_BASE_URL || "https://sandbox-api.iyzipay.com";
    const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    // İyzico Checkout Form isteği
    const conversationId = `conv_${Date.now()}`;
    const basketId = `bsk_${Date.now()}`;

    const iyzicoPayload = {
      locale: "tr",
      conversationId,
      price,
      paidPrice: price,
      currency: "TRY",
      basketId,
      paymentGroup: "SUBSCRIPTION",
      callbackUrl: `${APP_URL}/api/checkout/callback`,
      enabledInstallments: [1],
      buyer: {
        id: `buyer_${Date.now()}`,
        name: name || "Müşteri",
        surname: ".",
        gsmNumber: "+905000000000",
        email,
        identityNumber: "00000000000",
        registrationAddress: "Türkiye",
        ip: "127.0.0.1",
        city: "Istanbul",
        country: "Turkey",
      },
      billingAddress: {
        contactName: name || "Müşteri",
        city: "Istanbul",
        country: "Turkey",
        address: "Türkiye",
      },
      basketItems: [
        {
          id: plan,
          name: planName,
          category1: "SaaS Abonelik",
          itemType: "VIRTUAL",
          price,
        },
      ],
    };

    // İyzico API çağrısı
    const response = await fetch(`${IYZICO_BASE_URL}/payment/iyzipos/checkoutform/initialize/auth/ecom`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `IYZWS ${IYZICO_API_KEY}`,
        // Not: Gerçek İyzico entegrasyonunda HMAC imza hesaplaması gerekir.
        // Bu kısım iyzipay-node SDK ile yapılmalıdır.
        "x-iyzi-rnd": conversationId,
      },
      body: JSON.stringify(iyzicoPayload),
    });

    if (!response.ok) {
      // İyzico bağlantısı yoksa Fallback: LemonSqueezy veya direkt yönlendirme
      console.warn("[Checkout] İyzico bağlantısı kurulamadı, fallback checkout.");

      return NextResponse.json({
        success: true,
        checkoutUrl: `${APP_URL}/api/checkout/callback?status=success&plan=${plan}&email=${encodeURIComponent(email)}&conversationId=${conversationId}`,
        message: "Ödeme sayfasına yönlendiriliyorsunuz (Demo Modu).",
      });
    }

    const data = await response.json();

    return NextResponse.json({
      success: true,
      checkoutUrl: data.paymentPageUrl || data.checkoutFormContent,
      token: data.token,
      message: "İyzico ödeme formu oluşturuldu.",
    });
  } catch (error: any) {
    console.error("[Checkout] Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
