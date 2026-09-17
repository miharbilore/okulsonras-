import { NextResponse } from "next/server";
import Iyzipay from "iyzipay";
import { createClient } from "@supabase/supabase-js";

/**
 * POST /api/checkout/callback
 * İyzico ödeme formundan yönlendirilen (POST) callback adresi.
 */
export async function POST(request: Request) {
  // İyzico formu x-www-form-urlencoded olarak token gönderir
  let token = "";
  try {
    const formData = await request.formData();
    token = formData.get("token") as string;
  } catch (e) {
    //
  }

  const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  if (!token) {
    return NextResponse.redirect(`${APP_URL}/admin?payment=failed&message=Token+bulunamadi`, 302);
  }

  const iyzipay = new Iyzipay({
    apiKey: process.env.IYZICO_API_KEY || "sandbox-...",
    secretKey: process.env.IYZICO_SECRET_KEY || "sandbox-...",
    uri: process.env.IYZICO_BASE_URL || "https://sandbox-api.iyzipay.com"
  });

  const retrieveCheckout = (): Promise<any> => {
    return new Promise((resolve, reject) => {
      iyzipay.checkoutForm.retrieve({
        locale: Iyzipay.LOCALE.TR,
        token: token
      }, function (err: any, result: any) {
        if (err) reject(err);
        else resolve(result);
      });
    });
  };

  try {
    const result = await retrieveCheckout();

    if (result.paymentStatus === "SUCCESS") {
      // conversationId içerisine gizlediğimiz referansı çöz (tenant_id ve plan)
      const conversationId = result.conversationId || "";
      const tenantMatch = conversationId.match(/tenant_(.*?)_plan_(.*?)_t_/);
      
      if (tenantMatch) {
        const tenantId = tenantMatch[1];
        const plan = tenantMatch[2];

        // Abonelik bitiş tarihi: 1 ay sonrası
        const nextMonth = new Date();
        nextMonth.setMonth(nextMonth.getMonth() + 1);

        // Supabase Service Role ile RLS'i bypass ederek aboneliği güncelle
        const supabaseAdmin = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.SUPABASE_SERVICE_ROLE_KEY!
        );

        const { error } = await supabaseAdmin.from("tenants").update({
          plan_type: plan,
          subscription_ends_at: nextMonth.toISOString(),
          is_active: true
        }).eq("id", tenantId);

        if (error) {
           console.error("[Checkout] Tenant abonelik güncellemesi başarısız:", error);
        } else {
           console.log(`[Checkout] Tenant (${tenantId}) aboneliği ${plan} paketi ile yenilendi.`);
        }

        // Başarılı ödeme
        return NextResponse.redirect(`${APP_URL}/admin?payment=success`, 302);
      }
    }

    // Ödeme başarısız ise
    console.error("[Iyzico Callback Failed]", result);
    return NextResponse.redirect(`${APP_URL}/admin?payment=failed&message=${encodeURIComponent(result.errorMessage || "Ödeme başarısız")}`, 302);

  } catch (error: any) {
    console.error("[Checkout Retrieve Error]", error);
    return NextResponse.redirect(`${APP_URL}/admin?payment=error`, 302);
  }
}

// Opsiyonel: GET metodu direkt tarayıcıdan girilirse hata vermesin diye
export async function GET() {
  const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  return NextResponse.redirect(`${APP_URL}/admin`, 302);
}
