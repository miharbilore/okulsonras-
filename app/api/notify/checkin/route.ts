import { NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import { sendCheckInMessage } from '@/lib/whatsapp';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

export async function POST(request: Request) {
  try {
    const apiKey = request.headers.get("x-api-key");
    if (!apiKey) {
      return NextResponse.json({ success: false, error: 'API Key eksik' }, { status: 401 });
    }

    const { studentId, checkInType } = await request.json();

    if (!studentId) {
      return NextResponse.json({ success: false, error: 'Student ID is required' }, { status: 400 });
    }

    // Bypass RLS using service role to check the API Key and student
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Hash the incoming key to match DB
    const keyHash = crypto.createHash("sha256").update(apiKey).digest("hex");

    // Validate the API key
    const { data: keyData, error: keyError } = await supabaseAdmin
      .from('tenant_api_keys')
      .select('tenant_id')
      .eq('key_hash', keyHash)
      .eq('is_active', true)
      .single();

    if (keyError || !keyData) {
      return NextResponse.json({ success: false, error: 'Geçersiz veya iptal edilmiş API Anahtarı' }, { status: 403 });
    }

    // Optional: Update last_used_at async
    supabaseAdmin.from('tenant_api_keys').update({ last_used_at: new Date().toISOString() }).eq('key_hash', keyHash).then();

    const { data: student, error } = await supabaseAdmin
      .from('students')
      .select('full_name, parent_phone, tenant_id')
      .eq('id', studentId)
      .single();

    if (error || !student || student.tenant_id !== keyData.tenant_id) {
      console.error("Student not found or unauthorized for check-in notification");
      return NextResponse.json({ success: false, error: 'Öğrenci bulunamadı veya yetkisiz' }, { status: 403 });
    }

    const phone = student.parent_phone;
    if (!phone) {
      return NextResponse.json({ success: true });
    }

    const GREENAPI_INSTANCE_ID = process.env.GREEN_API_INSTANCE_ID || "";
    const GREENAPI_TOKEN = process.env.GREEN_API_TOKEN || "";

    if (GREENAPI_INSTANCE_ID && GREENAPI_TOKEN && GREENAPI_INSTANCE_ID !== 'mock_instance' && GREENAPI_TOKEN !== 'mock_token') {
      // Mesajı kuyruğa atıp (await ile ama db'ye yazmak hızlıdır) çıkıyoruz, kiosk beklemez
      sendCheckInMessage(student.tenant_id, phone, student.full_name, checkInType || 'qr', studentId).catch((err) => {
        console.error("Failed to enqueue check-in message:", err);
      });
    }

    // Anında Veli Sayfası önbelleğini (cache) temizle
    try {
      revalidateTag(`student-${studentId}`);
    } catch (cacheErr) {
      console.error("Cache purge failed:", cacheErr);
    }

    // Hemen yanıt dönüyoruz (Asenkron kuyruk)
    return NextResponse.json({ success: true, queued: true });

  } catch (error) {
    console.error("Error processing check-in notification:", error);
    return NextResponse.json({ success: true }); // Always return success for kiosk
  }
}
