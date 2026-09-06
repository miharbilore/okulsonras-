import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";
import { createAdminClient } from "@/lib/supabase";

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

  // Profil var mı kontrol et (Bypass RLS ile yapıyoruz)
  const adminClient = createAdminClient();
  
  const { data: existingProfile } = await adminClient
    .from("profiles")
    .select("id, role, tenant_id")
    .eq("user_id", userId)
    .single();

  let currentProfile = existingProfile;

  // Eğer profil hiç yoksa, önce boş bir profil oluşturalım
  if (!currentProfile) {
    const { data: newProfile, error: profileError } = await adminClient
      .from("profiles")
      .insert({
        user_id: userId,
        role: "tenant_admin",
        display_name: sessionData.user.user_metadata?.full_name || sessionData.user.email,
        avatar_url: sessionData.user.user_metadata?.avatar_url || null,
      })
      .select()
      .single();
      
    if (profileError) console.error("Profile creation error:", profileError);
    currentProfile = newProfile;
  }

  // Profil var ama henüz bir işletmeye (tenant) bağlı değilse (ve super_admin değilse)
  if (currentProfile && !currentProfile.tenant_id && currentProfile.role !== "super_admin") {
    const tenantName = sessionData.user.user_metadata?.tenant_name
      || (sessionData.user.user_metadata?.full_name ? `${sessionData.user.user_metadata.full_name} İşletmesi` : "Yeni İşletme");
      
    const { data: newTenant, error: tenantError } = await adminClient
      .from("tenants")
      .insert({
        name: tenantName,
        slug: `tenant-${Date.now()}`
      })
      .select()
      .single();

    if (tenantError) {
      console.error("Tenant creation failed during OAuth:", tenantError);
    } else if (newTenant) {
      // Oluşturulan yeni tenant'ı profile bağla
      await adminClient
        .from("profiles")
        .update({ tenant_id: newTenant.id })
        .eq("id", currentProfile.id);
        
      currentProfile.tenant_id = newTenant.id;
    }
  }

  // Rol tabanlı yönlendirme
  if (currentProfile?.role === "super_admin") {
    return NextResponse.redirect(`${origin}/super-admin`);
  }

  return NextResponse.redirect(`${origin}${next}`);
}
