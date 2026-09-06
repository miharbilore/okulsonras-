import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";

/**
 * GET /api/checkout/callback
 * Ödeme başarılı olduktan sonra İyzico/LemonSqueezy bu endpoint'e yönlendirir.
 * Otomatik olarak yeni tenant ve profil kaydı oluşturur.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const status = searchParams.get("status");
  const plan = searchParams.get("plan");
  const email = searchParams.get("email");
  const conversationId = searchParams.get("conversationId");

  if (status !== "success") {
    return NextResponse.redirect(`${origin}/?payment=failed`);
  }

  try {
    const supabase = createAdminClient();

    // 1. Yeni Tenant oluştur
    const slug = `tenant-${Date.now().toString(36)}`;
    const { data: tenant, error: tenantError } = await supabase
      .from("tenants")
      .insert({
        name: `${email?.split("@")[0] || "Yeni"} İşletmesi`,
        slug,
      })
      .select()
      .single();

    if (tenantError) throw tenantError;

    // 2. Kullanıcıyı bul veya oluştur (Supabase Auth)
    // Not: Ödeme callback'inde kullanıcı henüz auth olmamış olabilir.
    // Bu durumda invite linki oluşturulur.
    let userId: string | null = null;

    if (email) {
      // Mevcut kullanıcıyı ara
      const { data: existingUsers } = await supabase.auth.admin.listUsers();
      const existingUser = existingUsers?.users?.find((u: any) => u.email === email);

      if (existingUser) {
        userId = existingUser.id;
      } else {
        // Yeni kullanıcı davet et
        const { data: inviteData } = await supabase.auth.admin.inviteUserByEmail(email);
        userId = inviteData?.user?.id || null;
      }
    }

    // 3. Profil oluştur
    if (userId) {
      await supabase.from("profiles").upsert({
        user_id: userId,
        role: "tenant_admin",
        tenant_id: tenant.id,
        display_name: email?.split("@")[0],
      });
    }

    console.log(`[Checkout Callback] Yeni tenant oluşturuldu: ${tenant.name} (${tenant.id}), Plan: ${plan}`);

    // Başarı sayfasına yönlendir
    return NextResponse.redirect(
      `${origin}/login?signup=success&tenant=${tenant.slug}`
    );
  } catch (error: any) {
    console.error("[Checkout Callback] Error:", error);
    return NextResponse.redirect(`${origin}/?payment=error&message=${encodeURIComponent(error.message)}`);
  }
}

/**
 * POST /api/checkout/callback
 * İyzico Webhook (sunucudan sunucuya) bildirimi için.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();

    console.log("[Checkout Webhook] Payload:", JSON.stringify(body));

    // İyzico webhook doğrulaması
    // Gerçek ortamda: HMAC imza kontrolü yapılmalıdır
    if (body.status === "SUCCESS" || body.paymentStatus === "SUCCESS") {
      // Ödeme onaylandı - gerekli işlemleri yap
      console.log("[Checkout Webhook] Ödeme onaylandı:", body.conversationId);
      return NextResponse.json({ received: true });
    }

    return NextResponse.json({ received: true, status: "ignored" });
  } catch (error: any) {
    console.error("[Checkout Webhook] Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
