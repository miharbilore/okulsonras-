import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

function resolveOrigin(request: Request) {
  const url = new URL(request.url);
  const forwardedHost = request.headers.get("x-forwarded-host");
  const forwardedProto = request.headers.get("x-forwarded-proto") ?? "https";

  if (forwardedHost) {
    return `${forwardedProto}://${forwardedHost}`;
  }

  return url.origin;
}

function getSafeNextPath(next: string | null) {
  if (!next) return "/admin";
  if (!next.startsWith("/") || next.startsWith("//")) return "/admin";
  return next;
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const nextPath = getSafeNextPath(requestUrl.searchParams.get("next"));
  const origin = resolveOrigin(request);

  if (!code) {
    return NextResponse.redirect(new URL("/login?error=no_code", origin));
  }

  const supabase = await createClient();
  const { data: sessionData, error: authError } = await supabase.auth.exchangeCodeForSession(code);

  if (authError || !sessionData?.user || !sessionData.session) {
    return NextResponse.redirect(new URL("/login?error=auth_failed", origin));
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role, tenant_id")
    .eq("user_id", sessionData.user.id)
    .maybeSingle();

  if (profileError) {
    return NextResponse.redirect(new URL("/login?error=profile_lookup_failed", origin));
  }

  if (!profile || (!profile.tenant_id && profile.role !== "super_admin")) {
    return NextResponse.redirect(new URL("/onboarding", origin));
  }

  if (profile.role === "super_admin") {
    return NextResponse.redirect(new URL("/super-admin", origin));
  }

  return NextResponse.redirect(new URL(nextPath, origin));
}
