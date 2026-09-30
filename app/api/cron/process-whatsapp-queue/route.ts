import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendWhatsAppMessage } from "@/lib/whatsapp";

// Vercel Pro/Hobby için opsiyonel
// export const maxDuration = 300; 

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    // Sadece Cron Job'dan veya yetkili bir servisten tetiklenebilir
    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json({ success: false, error: "Missing Supabase URL or Service Role Key" }, { status: 500 });
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // İşlenmek üzere en eski bekleyen 10 mesajı al (Rate limit'e uygun sayıda)
    const { data: pendingMessages, error: fetchError } = await supabaseAdmin
      .from("whatsapp_queue")
      .select("*, tenant:tenants(meta_phone_number_id, meta_access_token)")
      .eq("status", "pending")
      .lte("scheduled_for", new Date().toISOString())
      .order("created_at", { ascending: true })
      .limit(10); 

    if (fetchError || !pendingMessages || pendingMessages.length === 0) {
      return NextResponse.json({ success: true, processed: 0, message: "No pending messages." });
    }

    const messageIds = pendingMessages.map(m => m.id);

    // Kilitlenmeyi önlemek için bu mesajları 'processing' durumuna al
    await supabaseAdmin
      .from("whatsapp_queue")
      .update({ status: "processing", updated_at: new Date().toISOString() })
      .in("id", messageIds);

    let sentCount = 0;
    let failedCount = 0;

    // Mesajları sırayla gönder
    for (const msg of pendingMessages) {
      try {
        const tenant = msg.tenant || {};
        
        // Eğer Meta API bilgileri girilmemişse 'waiting_config' yapıp geç (crash yapma)
        if (!tenant.meta_phone_number_id || !tenant.meta_access_token) {
           await supabaseAdmin
             .from("whatsapp_queue")
             .update({ status: "waiting_config", updated_at: new Date().toISOString(), error_log: "Meta API bilgileri eksik." })
             .eq("id", msg.id);
           failedCount++;
           continue;
        }

        const config = {
          meta_phone_id: tenant.meta_phone_number_id,
          meta_token: tenant.meta_access_token
        };

        const result = await sendWhatsAppMessage(msg.phone, msg.message, config);
        
        if (result.success) {
          await supabaseAdmin
            .from("whatsapp_queue")
            .update({ status: "sent", updated_at: new Date().toISOString() })
            .eq("id", msg.id);
          sentCount++;
        } else {
          await supabaseAdmin
            .from("whatsapp_queue")
            .update({ status: "failed", updated_at: new Date().toISOString(), error_log: result.error })
            .eq("id", msg.id);
          failedCount++;
        }
      } catch (err: any) {
        await supabaseAdmin
          .from("whatsapp_queue")
          .update({ status: "failed", updated_at: new Date().toISOString(), error_log: err.message })
          .eq("id", msg.id);
        failedCount++;
      }
      
      // Meta Rate limit yememek için kısa bir bekleme
      await new Promise(r => setTimeout(r, 1000));
    }

    return NextResponse.json({ success: true, processed: pendingMessages.length, sent: sentCount, failed: failedCount });
  } catch (error: any) {
    console.error("WhatsApp Cron Worker Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
