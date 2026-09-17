import { NextResponse } from 'next/server';
import { google } from 'googleapis';
import { createClient } from '@supabase/supabase-js';
import { PassThrough } from 'stream';

// Vercel Pro/Hobby için opsiyonel uzun çalışma süresi limiti (Saniye)
// export const maxDuration = 300; 

export async function POST(request: Request) {
  try {
    // 1. GÜVENLİK VE YETKİLENDİRME (Cron vs Manuel İşlem)
    const authHeader = request.headers.get("authorization");
    const isCron = process.env.CRON_SECRET && authHeader === `Bearer ${process.env.CRON_SECRET}`;

    let tenantIdToBackup: string | null = null;
    
    // Cron işi her şeyi yedekleyeceği için Admin (Service Role) yetkisine ihtiyaç duyar
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    if (!isCron) {
      // Dışarıdan veya uygulamadan gelen standart yedekleme talebi
      // @/lib/supabase-server veya @/lib/supabase/server (versiyona göre)
      const { createClient } = await import('@/lib/supabase/server');
      const supabase = await createClient();
      const { data: authData } = await supabase.auth.getUser();
      
      if (!authData?.user) {
        return NextResponse.json({ success: false, error: "Yetkisiz erişim. Geçerli JWT veya CRON_SECRET gerekli." }, { status: 401 });
      }

      const { data: profile } = await supabaseAdmin.from('profiles').select('tenant_id').eq('user_id', authData.user.id).single();
      if (!profile?.tenant_id) {
         return NextResponse.json({ success: false, error: "İşletme bulunamadı" }, { status: 404 });
      }
      tenantIdToBackup = profile.tenant_id;
    }

    // 2. GOOGLE DRIVE YETKİLENDİRMESİ
    const serviceAccountJson = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
    if (!serviceAccountJson) throw new Error("Missing Google API credentials (GOOGLE_SERVICE_ACCOUNT_JSON)");

    const credentials = JSON.parse(serviceAccountJson);
    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/drive.file'],
    });
    const drive = google.drive({ version: 'v3', auth });

    // 3. BELLEK DOSTU (MEMORY-EFFICIENT) AKIŞ (STREAM) YÖNETİMİ
    // Tüm veriyi RAM'e doldurmak yerine PassThrough Stream kullanıyoruz.
    const passThrough = new PassThrough();

    const fileName = `okulsonrasi_yedek_${isCron ? 'full_system' : tenantIdToBackup}_${new Date().toISOString().split('T')[0]}.ndjson`;
    
    // Drive'a Stream'i bağlıyoruz, henüz veri yokken yükleme kanalını açar.
    const driveUploadPromise = drive.files.create({
      requestBody: { name: fileName, mimeType: 'application/x-ndjson' },
      media: { mimeType: 'application/x-ndjson', body: passThrough },
      fields: 'id'
    });

    // 4. VERİTABANINDAN CHUNK (500'LÜK) HALİNDE OKUYUP STREAM'E YAZMA
    const fetchAndWriteStream = async () => {
      const CHUNK_SIZE = 500;
      
      try {
        // --- ÖĞRENCİLER (STUDENTS) YEDEĞİ ---
        let lastId = '00000000-0000-0000-0000-000000000000'; // UUID başlangıç değeri
        let hasMore = true;
        
        while (hasMore) {
          let query = supabaseAdmin
            .from('students')
            .select('*')
            .gt('id', lastId)
            .order('id', { ascending: true })
            .limit(CHUNK_SIZE);
            
          if (tenantIdToBackup) query = query.eq('tenant_id', tenantIdToBackup);
          
          const { data, error } = await query;
          if (error) throw error;
          
          if (data && data.length > 0) {
            data.forEach(row => {
              // NDJSON (Newline Delimited JSON) formatı, her satır bağımsız bir JSON
              passThrough.write(JSON.stringify({ table: 'students', data: row }) + '\n');
            });
            lastId = data[data.length - 1].id;
          } else {
            hasMore = false;
          }
        }

        // --- İŞLEMLER (TRANSACTIONS) YEDEĞİ ---
        lastId = '00000000-0000-0000-0000-000000000000';
        hasMore = true;
        
        while (hasMore) {
          let query = supabaseAdmin
            .from('transactions')
            .select('*')
            .gt('id', lastId)
            .order('id', { ascending: true })
            .limit(CHUNK_SIZE);
            
          if (tenantIdToBackup) query = query.eq('tenant_id', tenantIdToBackup);
          
          const { data, error } = await query;
          if (error) throw error;
          
          if (data && data.length > 0) {
            data.forEach(row => {
              passThrough.write(JSON.stringify({ table: 'transactions', data: row }) + '\n');
            });
            lastId = data[data.length - 1].id;
          } else {
            hasMore = false;
          }
        }

        // 5. TÜM VERİLER BİTTİĞİNDE STREAM KANALINI KAPAT (DRIVE DOSYAYI KAYDETSİN)
        passThrough.end();
      } catch (err) {
        console.error("Stream yazma hatası:", err);
        passThrough.destroy(err as Error);
      }
    };

    // Veritabanı çekimini başlat
    await fetchAndWriteStream();
    
    // Drive API'nin dosya yüklemesini tamamlamasını bekle
    const uploadResult = await driveUploadPromise;
    console.log(`[Google Drive] ${fileName} başarıyla yüklendi. ID: ${uploadResult.data.id}`);

    return NextResponse.json({ 
      success: true, 
      message: `${fileName} başarıyla yedeklendi.`,
      fileId: uploadResult.data.id
    });

  } catch (error: any) {
    console.error("Drive Backup Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
