import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";

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

  const supabase = createServerClient();

  // OAuth code'u session'a çevir
  const { data: sessionData, error: authError } = await supabase.auth.exchangeCodeForSession(code);

  if (authError || !sessionData?.user) {
    console.error("OAuth callback error:", authError);
    return NextResponse.redirect(`${origin}/login?error=auth_failed`);
  }

  const userId = sessionData.user.id;

  // Profil var mı kontrol et, yoksa oluştur (ilk giriş)
  const { data: existingProfile } = await supabase
    .from("profiles")
    .select("role, tenant_id")
    .eq("user_id", userId)
    .single();

  if (!existingProfile) {
    // İlk kez giriş yapan kullanıcı => varsayılan olarak tenant_admin profili oluştur
    await supabase.from("profiles").insert({
      user_id: userId,
      role: "tenant_admin",
      display_name: sessionData.user.user_metadata?.full_name || sessionData.user.email,
      avatar_url: sessionData.user.user_metadata?.avatar_url || null,
    });
    return NextResponse.redirect(`${origin}/admin`);
  }

  // Rol tabanlı yönlendirme
  if (existingProfile.role === "super_admin") {
    return NextResponse.redirect(`${origin}/super-admin`);
  }

  return NextResponse.redirect(`${origin}${next}`);
}
