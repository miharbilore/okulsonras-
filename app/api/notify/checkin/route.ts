import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { sendCheckInMessage } from '@/lib/whatsapp';

export async function POST(request: Request) {
  try {
    const { studentId, checkInType } = await request.json();

    if (!studentId) {
      return NextResponse.json({ success: false, error: 'Student ID is required' }, { status: 400 });
    }

    const supabase = await createClient();

    const { data: student, error } = await supabase
      .from('students')
      .select('full_name, parent_phone, tenant_id')
      .eq('id', studentId)
      .single();

    if (error || !student) {
      console.error("Student not found for check-in notification:", error);
      return NextResponse.json({ success: true }); // Return success to avoid blocking kiosk
    }

    const phone = student.parent_phone;
    if (!phone) {
      return NextResponse.json({ success: true });
    }

    const GREENAPI_INSTANCE_ID = process.env.GREEN_API_INSTANCE_ID || "";
    const GREENAPI_TOKEN = process.env.GREEN_API_TOKEN || "";

    if (GREENAPI_INSTANCE_ID && GREENAPI_TOKEN && GREENAPI_INSTANCE_ID !== 'mock_instance' && GREENAPI_TOKEN !== 'mock_token') {
      try {
        await sendCheckInMessage(phone, student.full_name, checkInType || 'qr', studentId);
      } catch (notifyError) {
        console.error("Failed to send check-in message:", notifyError);
      }
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error("Error processing check-in notification:", error);
    return NextResponse.json({ success: true }); // Always return success for kiosk
  }
}
