import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

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

    // Kapatılmayan ('active') tüm oturumları bul ve 'auto_closed' olarak işaretle
    const { data: openAttendances, error: fetchError } = await supabaseAdmin
      .from('attendances')
      .select('id')
      .eq('status', 'active');

    if (fetchError) {
      throw fetchError;
    }

    if (!openAttendances || openAttendances.length === 0) {
      return NextResponse.json({ success: true, message: "No active sessions to close.", closed_count: 0 });
    }

    const idsToClose = openAttendances.map(a => a.id);

    const { error: updateError } = await supabaseAdmin
      .from('attendances')
      .update({
        status: 'auto_closed',
        check_out_at: new Date().toISOString(),
        check_out_type: 'system_auto'
      })
      .in('id', idsToClose);

    if (updateError) {
      throw updateError;
    }

    // Gece vakti mesaj atmamak (ve panik yaratmamak) için KESİNLİKLE WhatsApp kuyruğuna MESAJ EKLENMİYOR.

    return NextResponse.json({ 
      success: true, 
      message: "End of day check-out completed silently.", 
      closed_count: idsToClose.length 
    });

  } catch (error: any) {
    console.error("Auto-checkout cron error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
