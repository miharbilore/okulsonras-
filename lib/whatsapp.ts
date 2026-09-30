/**
 * lib/whatsapp.ts
 * Meta WhatsApp Cloud API Entegrasyonu
 */

import { createClient } from "@supabase/supabase-js";

interface TenantWhatsAppConfig {
  meta_phone_id?: string;
  meta_token?: string;
}

/**
 * WhatsApp mesajı gönderir (Sadece resmi Meta Cloud API üzerinden).
 */
export async function sendWhatsAppMessage(phone: string, message: string, config?: TenantWhatsAppConfig) {
  const cleanPhone = phone.replace(/\D/g, "");
  const formattedPhone = cleanPhone.startsWith("0")
    ? "9" + cleanPhone
    : cleanPhone.startsWith("90")
    ? cleanPhone
    : "90" + cleanPhone;

  if (!config || !config.meta_phone_id || !config.meta_token) {
    return { success: false, error: "Meta WhatsApp API bilgileri eksik." };
  }
  
  try {
    const url = `https://graph.facebook.com/v20.0/${config.meta_phone_id}/messages`;
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${config.meta_token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: formattedPhone,
        type: "text",
        text: { preview_url: false, body: message }
      })
    });
    const result = await response.json();
    
    if (!response.ok) {
      throw new Error(result.error?.message || `HTTP ${response.status}`);
    }
    
    console.log(`[WhatsApp-Meta] Mesaj gönderildi -> ${formattedPhone}`, result.messages?.[0]?.id);
    return { success: true, messageId: result.messages?.[0]?.id };
  } catch (error: any) {
    console.error(`[WhatsApp-Meta] Gönderim hatası -> ${formattedPhone}:`, error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Mesajı veritabanındaki kuyruğa (whatsapp_queue) ekler
 */
export async function enqueueWhatsAppMessage(tenantId: string, phone: string, message: string) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { error } = await supabase.from("whatsapp_queue").insert({
    tenant_id: tenantId,
    phone,
    message,
    status: "pending",
  });

  if (error) {
    console.error("[WhatsApp Queue] Kuyruğa ekleme hatası:", error);
    return false;
  }
  return true;
}
