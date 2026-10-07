import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// GET: Webhook verification (Meta sends a challenge)
export async function GET(request: Request) {
  const url = new URL(request.url);
  const mode = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");

  const verifyToken = process.env.META_WEBHOOK_VERIFY_TOKEN || process.env.CRON_SECRET;

  if (mode === "subscribe" && token === verifyToken) {
    console.log("[Meta Webhook] Verification successful.");
    return new NextResponse(challenge, { status: 200, headers: { "Content-Type": "text/plain" } });
  }

  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}

// POST: Incoming webhook events from Meta
export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    console.log("[Meta Webhook] Event received:", JSON.stringify(body).substring(0, 500));

    // Handle account_update events from Embedded Signup
    if (body?.entry) {
      for (const entry of body.entry) {
        const changes = entry.changes || [];
        for (const change of changes) {
          if (change.field === "account_update") {
            const event = change.value;
            console.log("[Meta Webhook] Account update event:", event);
            // Future: handle phone number quality updates, account bans, etc.
          }

          if (change.field === "message_template_status_update") {
            console.log("[Meta Webhook] Template status update:", change.value);
          }
        }
      }
    }

    // Always respond 200 to Meta webhooks
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[Meta Webhook] Error processing:", error);
    return NextResponse.json({ success: true }); // Still 200 to prevent retries
  }
}
