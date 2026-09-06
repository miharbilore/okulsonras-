import { NextResponse } from 'next/server';
import { google } from 'googleapis';
import { createServerClient } from '@/lib/supabase-server';

export async function POST() {
  try {
    const supabase = await createServerClient();
    const { data: authData } = await supabase.auth.getUser();
    
    if (!authData?.user) {
      return NextResponse.json({ success: false, error: "Yetkisiz erişim" }, { status: 401 });
    }

    const { data: profile } = await supabase.from('profiles').select('tenant_id').eq('user_id', authData.user.id).single();
    if (!profile?.tenant_id) {
       return NextResponse.json({ success: false, error: "İşletme bulunamadı" }, { status: 404 });
    }

    // Gerçek Verileri Supabase'den Çek
    const [studentsRes, transactionsRes] = await Promise.all([
      supabase.from('students').select('*').eq('tenant_id', profile.tenant_id),
      supabase.from('transactions').select('*').eq('tenant_id', profile.tenant_id)
    ]);

    const backupData = {
      tenant_id: profile.tenant_id,
      export_date: new Date().toISOString(),
      students: studentsRes.data || [],
      transactions: transactionsRes.data || []
    };

    const fileContent = JSON.stringify(backupData, null, 2);
    const fileName = `okulsonrasi_yedek_${new Date().toISOString().split('T')[0]}.json`;

    const serviceAccountJson = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
    
    if (!serviceAccountJson) {
      throw new Error("Missing Google API credentials (GOOGLE_SERVICE_ACCOUNT_JSON)");
    }

    const credentials = JSON.parse(serviceAccountJson);
    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/drive.file'],
    });
    const drive = google.drive({ version: 'v3', auth });

    const fileMetadata = {
      name: fileName,
      mimeType: 'application/json'
    };
    
    const media = {
      mimeType: 'application/json',
      body: fileContent
    };

    await drive.files.create({
      requestBody: fileMetadata,
      media: media,
      fields: 'id'
    });
    
    console.log(`[Google Drive] ${fileName} başarıyla yüklendi.`);

    return NextResponse.json({ 
      success: true, 
      message: `${fileName} başarıyla Google Drive'a yedeklendi.` 
    });

  } catch (error: any) {
    console.error("Drive Backup Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
