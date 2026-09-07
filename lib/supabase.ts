import { createClient as createBrowserClient } from "@/lib/supabase/client";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

export const createClient = createBrowserClient;

export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error("Supabase admin environment variables are missing.");
  }

  return createSupabaseClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

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
