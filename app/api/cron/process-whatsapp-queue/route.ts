import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendWhatsAppMessage } from "@/lib/whatsapp";

// Vercel Cron veya Harici Cron servisi ile saniyede/dakikada bir tetiklenir
export async function GET(request: Request) {
  try {
    // Basic Auth veya Cron Secret kontrolü yapılabilir
    const authHeader = request.headers.get("authorization");
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      // Eğer CRON_SECRET ayarlıysa ve eşleşmiyorsa engelle
      // Localde test edebilmek için bu kısmı esnek tutuyoruz, gerçekte 401 dönülmeli.
      if (process.env.NODE_ENV === "production") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    }

    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json({ success: false, error: "Missing Supabase URL or Service Role Key in environment variables" }, { status: 500 });
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // İşlenmek üzere en eski bekleyen 10 mesajı al (Rate limit'e uygun sayıda)
    // Supabase RPC (Procedure) veya güvenli update için optimistic locking daha iyidir,
    // ancak bu basit yaklaşımda id'leri alıp statülerini "processing" yapacağız.
    const { data: pendingMessages, error: fetchError } = await supabaseAdmin
      .from("whatsapp_queue")
      .select("*")
      .eq("status", "pending")
      .lte("scheduled_for", new Date().toISOString())
      .order("created_at", { ascending: true })
      .limit(10); // Her çalışmada 10 mesaj (1.5sn bekleme ile ~15sn sürer, serverless'a uygundur)

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
        const result = await sendWhatsAppMessage(msg.phone, msg.message);
        
        if (result.success) {
          await supabaseAdmin
            .from("whatsapp_queue")
            .update({ status: "sent", updated_at: new Date().toISOString() })
            .eq("id", msg.id);
          sentCount++;
        } else {
          // Başarısız oldu
          const attempts = (msg.attempts || 0) + 1;
          const status = attempts >= 3 ? "failed" : "pending"; // 3 denemeden sonra tamamen failed yap
          
          await supabaseAdmin
            .from("whatsapp_queue")
            .update({ 
              status, 
              attempts, 
              error_msg: result.error || "Bilinmeyen hata",
              updated_at: new Date().toISOString(),
              // Bir sonraki deneme için 5 dk sonraya schedule et (eğer tekrar denenecekse)
              scheduled_for: status === "pending" ? new Date(Date.now() + 5 * 60000).toISOString() : msg.scheduled_for
            })
            .eq("id", msg.id);
          failedCount++;
        }
      } catch (err: any) {
        // Beklenmeyen hata
        await supabaseAdmin
            .from("whatsapp_queue")
            .update({ 
              status: "failed", 
              error_msg: err.message,
              updated_at: new Date().toISOString()
            })
            .eq("id", msg.id);
        failedCount++;
      }

      // API Rate Limit (Green-API için mesaj başına ~1.5 saniye bekle)
      await new Promise(r => setTimeout(r, 1500));
    }

    return NextResponse.json({ 
      success: true, 
      processed: pendingMessages.length, 
      sent: sentCount, 
      failed: failedCount 
    });

  } catch (error: any) {
    console.error("Cron worker error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
