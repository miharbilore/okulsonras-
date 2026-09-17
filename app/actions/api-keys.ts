"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentTenant } from "./tenant";
import crypto from "crypto";

export async function getApiKeys() {
  const tenantInfo = await getCurrentTenant();
  if (!tenantInfo) throw new Error("Yetkisiz işlem.");

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tenant_api_keys")
    .select("id, name, device_type, key_prefix, created_at, last_used_at, is_active")
    .eq("tenant_id", tenantInfo.tenantId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data;
}

export async function generateApiKey(name: string, deviceType: "kiosk" | "pos") {
  const tenantInfo = await getCurrentTenant();
  if (!tenantInfo) throw new Error("Yetkisiz işlem.");

  // Güvenli rastgele key üretimi
  const randomBytes = crypto.randomBytes(24).toString("hex");
  const rawKey = `osk_live_${randomBytes}`;
  
  // SHA-256 ile hash'leme
  const keyHash = crypto.createHash("sha256").update(rawKey).digest("hex");
  
  // Ekranda güvenli bir şekilde göstereceğimiz (sadece başını) prefix
  const keyPrefix = rawKey.substring(0, 15) + "..." + rawKey.slice(-4);

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tenant_api_keys")
    .insert({
      tenant_id: tenantInfo.tenantId,
      name,
      device_type: deviceType,
      key_hash: keyHash,
      key_prefix: keyPrefix,
      is_active: true,
    })
    .select("id")
    .single();

  if (error) throw error;

  // SADECE 1 KERE rawKey dönülür. Veritabanında ASLA rawKey tutulmaz.
  return { id: data.id, rawKey };
}

export async function revokeApiKey(id: string) {
  const tenantInfo = await getCurrentTenant();
  if (!tenantInfo) throw new Error("Yetkisiz işlem.");

  const supabase = await createClient();
  const { error } = await supabase
    .from("tenant_api_keys")
    .delete()
    .eq("id", id)
    .eq("tenant_id", tenantInfo.tenantId);

  if (error) throw error;
  return { success: true };
}
