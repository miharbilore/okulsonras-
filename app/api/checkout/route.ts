import { NextResponse } from "next/server";
import Iyzipay from "iyzipay";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { plan, email, name, tenantId } = body;

    if (!plan || !email) {
      return NextResponse.json({ error: "Plan ve e-posta zorunludur." }, { status: 400 });
    }

    // Yetkilendirme Kontrolü (Opsiyonel ama güvenli)
    const supabase = await createClient();
    const { data: authData } = await supabase.auth.getUser();

    // Tenant ID'yi body'den alıyoruz (veya session'dan doğrulayabiliriz)
    let activeTenantId = tenantId;
    if (!activeTenantId && authData?.user) {
       const { data: profile } = await supabase.from('profiles').select('tenant_id').eq('user_id', authData.user.id).single();
       if (profile?.tenant_id) activeTenantId = profile.tenant_id;
    }

    if (!activeTenantId) {
      return NextResponse.json({ error: "İşletme kimliği bulunamadı." }, { status: 400 });
    }

    const price = plan === "professional" ? "1950.0" : "1250.0";
    const planName = plan === "professional" ? "Profesyonel Paket" : "Standart Paket";

    const iyzipay = new Iyzipay({
      apiKey: process.env.IYZICO_API_KEY || "sandbox-...",
      secretKey: process.env.IYZICO_SECRET_KEY || "sandbox-...",
      uri: process.env.IYZICO_BASE_URL || "https://sandbox-api.iyzipay.com"
    });

    const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    
    // conversationId içine tenant_id ve plan bilgisini gömüyoruz ki callback'te yakalayabilelim
    const conversationId = `tenant_${activeTenantId}_plan_${plan}_t_${Date.now()}`;
    const basketId = `bsk_${Date.now()}`;

    const requestData = {
      locale: Iyzipay.LOCALE.TR,
      conversationId: conversationId,
      price: price,
      paidPrice: price,
      currency: Iyzipay.CURRENCY.TRY,
      basketId: basketId,
      paymentGroup: Iyzipay.PAYMENT_GROUP.SUBSCRIPTION,
      callbackUrl: `${APP_URL}/api/checkout/callback`,
      enabledInstallments: [1],
      buyer: {
        id: `buyer_${activeTenantId}`,
        name: name || "İşletme",
        surname: "Sahibi",
        gsmNumber: "+905000000000",
        email: email,
        identityNumber: "11111111111", // Gerçekte kullanıcıdan alınmalı
        lastLoginDate: "2023-10-10 10:10:10",
        registrationDate: "2023-10-10 10:10:10",
        registrationAddress: "Türkiye",
        ip: "85.34.78.112",
        city: "Istanbul",
        country: "Turkey",
        zipCode: "34732"
      },
      shippingAddress: {
        contactName: name || "İşletme",
        city: "Istanbul",
        country: "Turkey",
        address: "Türkiye",
        zipCode: "34732"
      },
      billingAddress: {
        contactName: name || "İşletme",
        city: "Istanbul",
        country: "Turkey",
        address: "Türkiye",
        zipCode: "34732"
      },
      basketItems: [
        {
          id: plan,
          name: planName,
          category1: "SaaS Abonelik",
          itemType: Iyzipay.BASKET_ITEM_TYPE.VIRTUAL,
          price: price,
        },
      ],
    };

    // Promise wrapper for iyzipay callback
    const initializeCheckout = (): Promise<any> => {
      return new Promise((resolve, reject) => {
        iyzipay.checkoutFormInitialize.create(requestData, function (err: any, result: any) {
          if (err) reject(err);
          else resolve(result);
        });
      });
    };

    const result = await initializeCheckout();

    if (result.status === "success") {
      return NextResponse.json({
        success: true,
        checkoutUrl: result.paymentPageUrl,
        token: result.token,
        message: "İyzico ödeme formu oluşturuldu.",
      });
    } else {
      console.error("[Iyzico Init Error]", result);
      return NextResponse.json({ 
        success: false, 
        error: result.errorMessage || "Ödeme başlatılamadı." 
      }, { status: 400 });
    }

  } catch (error: any) {
    console.error("[Checkout] Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
