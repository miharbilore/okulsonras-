import { createClient } from "@supabase/supabase-js";
import { Coffee, LogOut, CheckCircle2, Video } from "lucide-react";

// Server Component (Data fetching on the server)
export default async function VeliTakipPage({ params }: { params: { token: string } }) {
  // Use service role for public read-only access by token
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { token } = params;

  // 1. Öğrenciyi Token'a göre bul
  const { data: student, error: studentError } = await supabaseAdmin
    .from('students')
    .select('id, full_name, tenant_id, parent_phone')
    .eq('tracking_token', token)
    .single();

  if (studentError || !student) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="bg-white p-8 rounded-2xl shadow-sm text-center max-w-sm w-full">
          <div className="w-16 h-16 bg-red-100 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl font-bold">!</span>
          </div>
          <h1 className="text-xl font-bold text-slate-800 mb-2">Geçersiz Bağlantı</h1>
          <p className="text-slate-500">Bu takip bağlantısı geçersiz veya süresi dolmuş olabilir.</p>
        </div>
      </div>
    );
  }

  // 2. Bugünkü Yoklama (Giriş/Çıkış) Kayıtlarını Getir
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  
  const { data: attendances } = await supabaseAdmin
    .from('attendances')
    .select('*')
    .eq('student_id', student.id)
    .gte('created_at', startOfDay.toISOString())
    .order('created_at', { ascending: false });

  // 3. Bugünkü Kantin (Transaction) Hareketlerini Getir
  const { data: transactions } = await supabaseAdmin
    .from('transactions')
    .select('*')
    .eq('student_id', student.id)
    .gte('created_at', startOfDay.toISOString())
    .order('created_at', { ascending: false });

  // 4. Kurum Bilgilerini (Kamera Yayını) Getir
  const { data: tenant } = await supabaseAdmin
    .from('tenants')
    .select('camera_stream_type, camera_stream_url')
    .eq('id', student.tenant_id)
    .single();

  const currentStatus = attendances && attendances.length > 0 ? attendances[0].status : 'unknown';
  const isInside = currentStatus === 'active';

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-6 md:p-10 font-sans selection:bg-primary/20 text-slate-900">
      <div className="max-w-xl mx-auto space-y-6">
        
        {/* HEADER / STATUS CARD */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-100 relative overflow-hidden">
          <div className={`absolute top-0 left-0 w-full h-2 ${isInside ? 'bg-green-500' : 'bg-slate-300'}`}></div>
          
          <div className="flex flex-col items-center text-center space-y-4 pt-4">
            <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center text-3xl font-bold text-slate-400 border-4 border-white shadow-sm">
              {student.full_name.charAt(0)}
            </div>
            
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight mb-1">{student.full_name}</h1>
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-50 border font-medium text-sm">
                {isInside ? (
                  <>
                    <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                    <span className="text-green-700">Şu an Kurumda</span>
                  </>
                ) : (
                  <>
                    <span className="w-2 h-2 rounded-full bg-slate-400"></span>
                    <span className="text-slate-600">Kurum Dışında (Çıktı)</span>
                  </>
                )}
              </div>
            </div>
            </div>
          </div>

        {/* CANLI KAMERA YAYINI */}
        {tenant?.camera_stream_type && tenant.camera_stream_type !== 'none' && tenant.camera_stream_url && (
          <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-100">
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
               <Video className="w-5 h-5 text-blue-500" />
               Kurum Canlı Yayını
            </h2>
            <div className="aspect-video w-full rounded-2xl overflow-hidden bg-black flex items-center justify-center">
              {tenant.camera_stream_type === 'iframe' ? (
                <div className="w-full h-full" dangerouslySetInnerHTML={{ __html: tenant.camera_stream_url.startsWith('<') ? tenant.camera_stream_url : `<iframe width="100%" height="100%" src="${tenant.camera_stream_url}" frameborder="0" allowfullscreen></iframe>` }} />
              ) : (
                <div className="text-center p-6 text-white">
                   {/* Normally you'd use a real HLS player here like video.js or hls.js. Since this is just an MVP/Demo, we render a simulated player or plain HTML5 video */}
                   <video src={tenant.camera_stream_url} controls className="w-full h-full" />
                </div>
              )}
            </div>
          </div>
        )}

        {/* YOKLAMA GEÇMİŞİ (Bugün) */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-100">
          <h2 className="text-lg font-bold mb-6 flex items-center gap-2">
             Bugünkü Giriş/Çıkış Hareketleri
          </h2>
          
          <div className="space-y-4">
            {(!attendances || attendances.length === 0) ? (
              <p className="text-slate-500 text-sm text-center py-4">Bugün henüz giriş kaydı bulunmuyor.</p>
            ) : (
              attendances.map((att) => (
                <div key={att.id} className="flex justify-between items-center p-4 rounded-2xl bg-slate-50/50 border border-slate-100">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-green-100 text-green-600 flex items-center justify-center">
                      <CheckCircle2 className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="font-semibold text-slate-800">Giriş</p>
                      <p className="text-xs text-slate-500 font-mono">
                        {new Date(att.check_in_at || att.created_at).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                  
                  {att.check_out_at && (
                    <div className="flex items-center gap-3 text-right">
                      <div>
                        <p className="font-semibold text-slate-800">Çıkış</p>
                        <p className="text-xs text-slate-500 font-mono">
                          {new Date(att.check_out_at).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                      <div className="w-10 h-10 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center">
                        <LogOut className="w-5 h-5" />
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* KANTİN GEÇMİŞİ (Bugün) */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-100">
          <h2 className="text-lg font-bold mb-6 flex items-center gap-2">
            <Coffee className="w-5 h-5 text-amber-500" />
            Bugünkü Kantin Harcamaları
          </h2>
          
          <div className="space-y-3">
            {(!transactions || transactions.length === 0) ? (
              <p className="text-slate-500 text-sm text-center py-4">Bugün kantin harcaması bulunmuyor.</p>
            ) : (
              transactions.map((tx) => (
                <div key={tx.id} className="flex justify-between items-center p-4 rounded-2xl border border-slate-100">
                  <div>
                    <p className="font-semibold text-slate-800">{tx.description || "Kantin Alışverişi"}</p>
                    <p className="text-xs text-slate-500 font-mono mt-1">
                      {new Date(tx.created_at).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-lg text-slate-900">₺{Number(tx.total_amount).toFixed(2)}</p>
                    <p className="text-xs text-amber-600 font-medium">{tx.payment_method === 'credit' ? 'Veresiye (Hesaba Yazıldı)' : 'Peşin Ödendi'}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
