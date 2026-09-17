import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Get auth status
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const url = request.nextUrl.clone();
  const path = url.pathname;

  // 1. Protected Routes (Admin Panels)
  if (path.startsWith("/admin") || path.startsWith("/super-admin")) {
    if (!user) {
      url.pathname = "/login";
      return NextResponse.redirect(url);
    }

    // Super Admin Authorization Check
    if (path.startsWith("/super-admin")) {
      const isSuperAdmin = user.app_metadata?.role === "super_admin";
      
      // Fallback: If not in app_metadata, query profiles if strictly necessary, 
      // but ideally use JWT claims.
      
      if (!isSuperAdmin) {
        url.pathname = "/";
        return NextResponse.redirect(url);
      }
    }
  }

  // 2. Protected API Routes
  if (path.startsWith("/api")) {
    // Exclude public API endpoints like webhooks or kiosk triggers
    const publicApiRoutes = ["/api/notify/checkin", "/api/checkout/callback"];
    const isPublicApi = publicApiRoutes.some((route) => path.startsWith(route));

    if (!isPublicApi && !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  // Redirect logged-in users away from auth pages
  if (user && (path === "/login" || path === "/register")) {
    url.pathname = "/admin";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
