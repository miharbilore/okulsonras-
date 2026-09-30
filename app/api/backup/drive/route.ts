import { NextResponse } from 'next/server';
import { google } from 'googleapis';
import { createClient } from '@supabase/supabase-js';
import { PassThrough } from 'stream';

// Vercel Pro/Hobby için opsiyonel uzun çalışma süresi limiti (Saniye)
// export const maxDuration = 300; 

// Yardımcı fonksiyon: Belli bir tenant için yedekleme akışını başlatır
async function backupTenant(tenant: any, drive: any, supabaseAdmin: any) {
  const passThrough = new PassThrough();
  
  // Örn: Yedek_IsletmeAdi_2026-09-29_2359.json
  const dateStr = new Date().toISOString().replace(/T/, '_').replace(/:/g, '').split('.')[0];
  const safeName = (tenant.name || "Isletme").replace(/[^a-zA-Z0-9]/g, "_");
  const fileName = `Yedek_${safeName}_${dateStr}.json`;
  
  const driveUploadPromise = drive.files.create({
    requestBody: { 
      name: fileName, 
      mimeType: 'application/x-ndjson',
      parents: tenant.google_drive_folder_id ? [tenant.google_drive_folder_id] : undefined
    },
    media: { mimeType: 'application/x-ndjson', body: passThrough },
    fields: 'id'
  });

  const CHUNK_SIZE = 500;
  const tables = ['students', 'attendances', 'transactions', 'products'];

  try {
    for (const table of tables) {
      let lastId = '00000000-0000-0000-0000-000000000000';
      let hasMore = true;
      
      while (hasMore) {
        let query = supabaseAdmin
          .from(table)
          .select('*')
          .gt('id', lastId)
          .eq('tenant_id', tenant.id)
          .order('id', { ascending: true })
          .limit(CHUNK_SIZE);
          
        const { data, error } = await query;
        if (error) throw error;
        
        if (data && data.length > 0) {
          data.forEach((row: any) => {
            passThrough.write(JSON.stringify({ table, data: row }) + '\n');
          });
          lastId = data[data.length - 1].id;
        } else {
          hasMore = false;
        }
      }
    }
    passThrough.end();
  } catch (err) {
    passThrough.destroy(err as Error);
    throw err;
  }

  const uploadResult = await driveUploadPromise;
  
  // Başarılı olursa last_backup_at güncelle
  await supabaseAdmin
    .from('tenants')
    .update({ last_backup_at: new Date().toISOString() })
    .eq('id', tenant.id);

  return uploadResult.data.id;
}

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get("authorization");
    const isCron = process.env.CRON_SECRET && authHeader === `Bearer ${process.env.CRON_SECRET}`;

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    let targetTenantId: string | null = null;
    
    if (!isCron) {
      const { createClient: createServerClient } = await import('@/lib/supabase/server');
      const supabase = await createServerClient();
      const { data: authData } = await supabase.auth.getUser();
      
      if (!authData?.user) {
        return NextResponse.json({ success: false, error: "Yetkisiz erişim." }, { status: 401 });
      }

      const { data: profile } = await supabaseAdmin.from('profiles').select('tenant_id').eq('user_id', authData.user.id).single();
      if (!profile?.tenant_id) {
         return NextResponse.json({ success: false, error: "İşletme bulunamadı" }, { status: 404 });
      }
      targetTenantId = profile.tenant_id;
    }

    // Google Drive Auth
    const serviceAccountJson = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
    if (!serviceAccountJson) throw new Error("Missing GOOGLE_SERVICE_ACCOUNT_JSON");

    const credentials = JSON.parse(serviceAccountJson);
    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/drive.file'],
    });
    const drive = google.drive({ version: 'v3', auth });

    // Hangi tenant(lar) yedeklenecek?
    let query = supabaseAdmin.from('tenants').select('*');
    
    if (isCron) {
      // Cron ise sadece auto_backup_enabled=true ve klasörü olanları bul
      query = query.eq('auto_backup_enabled', true).not('google_drive_folder_id', 'is', null);
    } else if (targetTenantId) {
      // Manuel yedekleme ise sadece hedef tenant
      query = query.eq('id', targetTenantId);
    }

    const { data: tenants, error: tenantsError } = await query;
    if (tenantsError) throw tenantsError;

    if (!tenants || tenants.length === 0) {
      return NextResponse.json({ success: true, message: "Yedeklenecek işletme bulunamadı veya klasör ID'leri eksik." });
    }

    const results = [];
    for (const tenant of tenants) {
      try {
        if (!tenant.google_drive_folder_id) {
          results.push({ tenant: tenant.name, success: false, error: "Klasör ID yok" });
          continue;
        }
        
        const fileId = await backupTenant(tenant, drive, supabaseAdmin);
        results.push({ tenant: tenant.name, success: true, fileId });
      } catch (err: any) {
        console.error(`[Backup Error] Tenant: ${tenant.name}`, err);
        results.push({ tenant: tenant.name, success: false, error: err.message });
      }
    }

    return NextResponse.json({ success: true, results });

  } catch (error: any) {
    console.error("Drive Backup Route Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
