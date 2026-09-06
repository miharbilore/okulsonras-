import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";

/**
 * Google OAuth Callback Handler
 * Supabase, OAuth başarılı olduğunda kullanıcıyı bu endpoint'e yönlendirir.
 * Kod (code) alınır, session oluşturulur ve kullanıcı rolüne göre yönlendirilir.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/admin";

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=no_code`);
  }

  const supabase = await createServerClient();

  // OAuth code'u session'a çevir
  const { data: sessionData, error: authError } = await supabase.auth.exchangeCodeForSession(code);

  if (authError || !sessionData?.user) {
    console.error("OAuth callback error:", authError);
    return NextResponse.redirect(`${origin}/login?error=auth_failed`);
  }

  const userId = sessionData.user.id;

  // Profil var mı kontrol et
  const { data: existingProfile } = await supabase
    .from("profiles")
    .select("id, role, tenant_id")
    .eq("user_id", userId)
    .single();

  let currentProfile = existingProfile;

  // Profil yoksa veya işletmesi yoksa RPC ile güvenli (RLS bypass) oluştur
  if (!currentProfile || (!currentProfile.tenant_id && currentProfile.role !== "super_admin")) {
    const tenantName = sessionData.user.user_metadata?.tenant_name
      || (sessionData.user.user_metadata?.full_name ? `${sessionData.user.user_metadata.full_name} İşletmesi` : "Yeni İşletme");
    const tenantSlug = `tenant-${Date.now()}`;
    const displayName = sessionData.user.user_metadata?.full_name || sessionData.user.email;
    const avatarUrl = sessionData.user.user_metadata?.avatar_url || null;

    const { data: rpcData, error: rpcError } = await supabase.rpc('create_tenant_and_profile', {
      p_tenant_name: tenantName,
      p_tenant_slug: tenantSlug,
      p_user_id: userId,
      p_display_name: displayName,
      p_avatar_url: avatarUrl
    });

    if (rpcError) {
      console.error("RPC Onboarding Error:", rpcError);
    } else if (!currentProfile) {
      currentProfile = { role: "tenant_admin", tenant_id: rpcData.tenant_id, id: rpcData.profile_id };
    }
  }

  // Rol tabanlı yönlendirme
  if (currentProfile?.role === "super_admin") {
    return NextResponse.redirect(`${origin}/super-admin`);
  }

  return NextResponse.redirect(`${origin}${next}`);
}
