import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

export async function POST(request: Request) {
  try {
    const { key, type } = await request.json();

    if (!key || !type) {
      return NextResponse.json({ success: false, error: "Anahtar ve cihaz tipi gerekli." }, { status: 400 });
    }

    const keyHash = crypto.createHash("sha256").update(key).digest("hex");

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: apiKeyData, error } = await supabaseAdmin
      .from('tenant_api_keys')
      .select('tenant_id, id')
      .eq('key_hash', keyHash)
      .eq('device_type', type)
      .eq('is_active', true)
      .single();

    if (error || !apiKeyData) {
      return NextResponse.json({ success: false, error: "Geçersiz veya yetkisi alınmış anahtar." }, { status: 401 });
    }

    // Update last_used_at
    await supabaseAdmin
      .from('tenant_api_keys')
      .update({ last_used_at: new Date().toISOString() })
      .eq('id', apiKeyData.id);

    return NextResponse.json({ success: true, tenantId: apiKeyData.tenant_id });
  } catch (error: any) {
    console.error("Device Verify Error:", error);
    return NextResponse.json({ success: false, error: "Sunucu hatası oluştu." }, { status: 500 });
  }
}
