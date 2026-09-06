import { createBrowserClient } from "@supabase/ssr";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// =============================================
// 1. BROWSER CLIENT (Client Components için)
// =============================================
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

// =============================================
// 3. ADMIN CLIENT (Service Role - sadece sunucu tarafı güvenli işlemler)
// =============================================
// NOT: SUPABASE_SERVICE_ROLE_KEY asla client'a sızmamalıdır.
// Bu client yalnızca API route'larında ve webhook'larda kullanılmalıdır.
export function createAdminClient() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY ortam değişkeni tanımlanmamış.");
  }
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceRoleKey,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

// =============================================
// 4. YARDIMCI: Kullanıcı rolünü çek
// =============================================
export async function getUserRole(userId: string) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("role, tenant_id")
    .eq("user_id", userId)
    .single();

  if (error || !data) {
    return { role: null, tenantId: null };
  }
  return { role: data.role as string, tenantId: data.tenant_id as string | null };
}
