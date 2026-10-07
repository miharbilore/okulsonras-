import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentTenant } from "@/app/actions/tenant";

export async function POST(request: Request) {
  try {
    const { accessToken, wabaId, phoneNumberId } = await request.json();

    if (!accessToken) {
      return NextResponse.json({ success: false, error: "Access token eksik." }, { status: 400 });
    }

    // 1. Get the current tenant from the session
    const tenantInfo = await getCurrentTenant();
    if (!tenantInfo) {
      return NextResponse.json({ success: false, error: "Yetkisiz işlem." }, { status: 401 });
    }

    const appId = process.env.META_APP_ID;
    const appSecret = process.env.META_APP_SECRET;

    let longLivedToken = accessToken;
    let resolvedWabaId = wabaId || "";
    let resolvedPhoneId = phoneNumberId || "";

    // 2. Exchange short-lived token for a long-lived token (if app credentials are set)
    if (appId && appSecret) {
      try {
        const exchangeRes = await fetch(
          `https://graph.facebook.com/v20.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${appId}&client_secret=${appSecret}&fb_exchange_token=${accessToken}`
        );
        const exchangeData = await exchangeRes.json();
        if (exchangeData.access_token) {
          longLivedToken = exchangeData.access_token;
        }
      } catch (err) {
        console.warn("[WhatsApp OAuth] Token exchange failed, using original token:", err);
      }
    }

    // 3. If WABA ID wasn't provided by the Embedded Signup callback, fetch it
    if (!resolvedWabaId) {
      try {
        const debugRes = await fetch(
          `https://graph.facebook.com/v20.0/debug_token?input_token=${longLivedToken}&access_token=${longLivedToken}`
        );
        const debugData = await debugRes.json();
        const granularScopes = debugData?.data?.granular_scopes || [];
        const wabaScope = granularScopes.find(
          (s: any) => s.scope === "whatsapp_business_management"
        );
        if (wabaScope?.target_ids?.[0]) {
          resolvedWabaId = wabaScope.target_ids[0];
        }
      } catch (err) {
        console.warn("[WhatsApp OAuth] Could not extract WABA ID from token debug:", err);
      }
    }

    // 4. If Phone Number ID wasn't provided, fetch it from the WABA
    if (!resolvedPhoneId && resolvedWabaId) {
      try {
        const phonesRes = await fetch(
          `https://graph.facebook.com/v20.0/${resolvedWabaId}/phone_numbers`,
          { headers: { Authorization: `Bearer ${longLivedToken}` } }
        );
        const phonesData = await phonesRes.json();
        if (phonesData?.data?.[0]?.id) {
          resolvedPhoneId = phonesData.data[0].id;
        }
      } catch (err) {
        console.warn("[WhatsApp OAuth] Could not fetch phone numbers:", err);
      }
    }

    // 5. Save everything to the tenant record
    const supabase = await createClient();
    const { error: updateError } = await supabase
      .from("tenants")
      .update({
        meta_access_token: longLivedToken,
        meta_waba_id: resolvedWabaId,
        meta_phone_number_id: resolvedPhoneId,
      })
      .eq("id", tenantInfo.tenantId);

    if (updateError) {
      console.error("[WhatsApp OAuth] DB update error:", updateError);
      return NextResponse.json({ success: false, error: "Veritabanı güncellemesi başarısız." }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      wabaId: resolvedWabaId,
      phoneNumberId: resolvedPhoneId,
      tokenSaved: true,
    });
  } catch (error: any) {
    console.error("[WhatsApp OAuth] Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
