"use server";

import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";

// Mevcut tenant context'ini okur (Impersonate varsa onu, yoksa asıl tenant'ı döner)
export async function getCurrentTenant() {
  const cookieStore = await cookies();
  const impersonateTenantId = cookieStore.get("impersonate_tenant_id")?.value;
  const impersonateTenantName = cookieStore.get("impersonate_tenant_name")?.value;

  if (impersonateTenantId) {
    return {
      tenantId: impersonateTenantId,
      tenantName: impersonateTenantName || "İşletme Paneli",
      isImpersonating: true,
    };
  }

  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();

  if (authData?.user) {
    // Önce JWT app_metadata'ya bakalım
    const tenantIdFromJWT = authData.user.app_metadata?.tenant_id;
    
    if (tenantIdFromJWT) {
      const { data: tenant } = await supabase
         .from("tenants")
         .select("name")
         .eq("id", tenantIdFromJWT)
         .single();
         
      return {
         tenantId: tenantIdFromJWT,
         tenantName: tenant?.name || "İşletme Paneli",
         isImpersonating: false,
      };
    }
    
    // Fallback: Profiles tablosuna bak
    const { data: profile } = await supabase
      .from("profiles")
      .select("tenant_id")
      .eq("user_id", authData.user.id)
      .single();

    if (profile?.tenant_id) {
       const { data: tenant } = await supabase
         .from("tenants")
         .select("name")
         .eq("id", profile.tenant_id)
         .single();
       return {
         tenantId: profile.tenant_id,
         tenantName: tenant?.name || "İşletme Paneli",
         isImpersonating: false,
       };
    }
  }

  return null;
}

// Super admin impersonate modundan çıkış yapar
export async function clearImpersonation() {
  const cookieStore = await cookies();
  cookieStore.delete("impersonate_tenant_id");
  cookieStore.delete("impersonate_tenant_name");
  return { success: true };
}
