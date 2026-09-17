import { createClient as createBrowserClient } from "@/lib/supabase/client";

export const createClient = createBrowserClient;

export async function getUserRole(userId: string) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("role, tenant_id")
    .eq("user_id", userId)
    .maybeSingle();

  if (error || !data) {
    return { role: null, tenantId: null };
  }

  return {
    role: data.role as string,
    tenantId: data.tenant_id as string | null,
  };
}
