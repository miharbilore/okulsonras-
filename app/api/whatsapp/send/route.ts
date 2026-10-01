import { NextResponse } from 'next/server';
import { enqueueWhatsAppMessage } from '@/lib/whatsapp';
import { getCurrentTenant } from '@/app/actions/tenant';

export async function POST(request: Request) {
  try {
    const { phone, message } = await request.json();

    if (!phone || !message) {
      return NextResponse.json({ success: false, error: 'Telefon numarası ve mesaj zorunludur.' }, { status: 400 });
    }

    const tenantInfo = await getCurrentTenant();
    if (!tenantInfo || !tenantInfo.tenantId) {
      return NextResponse.json({ success: false, error: 'Oturum yetkisi yok veya işletme bulunamadı.' }, { status: 401 });
    }

    await enqueueWhatsAppMessage(tenantInfo.tenantId, phone, message);

    return NextResponse.json({ success: true, message: 'Mesaj kuyruğa eklendi.' });

  } catch (error: any) {
    console.error("Error queueing WhatsApp message:", error);
    return NextResponse.json({ success: false, error: error.message || 'Sunucu hatası' }, { status: 500 });
  }
}
