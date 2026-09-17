import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";

export async function POST(request: Request) {
  try {
    const { tenantId, tenantName } = await request.json();

    if (!tenantId) {
      return NextResponse.json({ success: false, error: "Tenant ID eksik" }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user || user.app_metadata?.role !== "super_admin") {
      return NextResponse.json({ success: false, error: "Yetkisiz işlem. Süper admin girişi gerekli." }, { status: 403 });
    }

    // Set cookies
    const cookieStore = await cookies();
    
    cookieStore.set("impersonate_tenant_id", tenantId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 2, // 2 saat geçerli
    });

    if (tenantName) {
      cookieStore.set("impersonate_tenant_name", tenantName, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 2,
      });
    }

    return NextResponse.json({ success: true, message: "Geçiş başarılı." });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE() {
  const cookieStore = await cookies();
  cookieStore.delete("impersonate_tenant_id");
  cookieStore.delete("impersonate_tenant_name");
  return NextResponse.json({ success: true, message: "Geçiş modu sonlandırıldı." });
}
