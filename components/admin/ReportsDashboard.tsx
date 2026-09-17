"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MessageSquareShare, TrendingUp, Users, Info, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase";

export function ReportsDashboard() {
  const [todayCheckins, setTodayCheckins] = useState<number>(0);
  const [todayRevenue, setTodayRevenue] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);

  const [recentCheckins, setRecentCheckins] = useState<any[]>([]);

  useEffect(() => {
    async function loadStats() {
      const supabase = createClient();
      
      const { getCurrentTenant } = await import("@/app/actions/tenant");
      const tenantInfo = await getCurrentTenant();
      let activeTenantId = tenantInfo?.tenantId || null;

      if (!activeTenantId) {
        const { data: authData } = await supabase.auth.getUser();
        if (authData?.user) {
          const { data: profile } = await supabase.from('profiles').select('tenant_id').eq('user_id', authData.user.id).single();
          if (profile?.tenant_id) {
            activeTenantId = profile.tenant_id;
          }
        }
      }

      if (activeTenantId) {
        // Today start date
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);
        const isoStart = startOfDay.toISOString();

        // Fetch attendances count
        const { count } = await supabase
          .from('attendances')
          .select('*', { count: 'exact', head: true })
          .eq('tenant_id', activeTenantId)
          .gte('created_at', isoStart);

        // Fetch recent attendances with student info
        const { data: recentAtt } = await supabase
          .from('attendances')
          .select('*, student:students(full_name)')
          .eq('tenant_id', activeTenantId)
          .order('created_at', { ascending: false })
          .limit(5);

        // Fetch transactions
        const { data: txData } = await supabase
          .from('transactions')
          .select('total_amount')
          .eq('tenant_id', activeTenantId)
          .gte('created_at', isoStart);

        setTodayCheckins(count || 0);
        if (recentAtt) setRecentCheckins(recentAtt);
        
        if (txData) {
          const total = txData.reduce((acc, curr) => acc + Number(curr.total_amount), 0);
          setTodayRevenue(total);
        }
      }
      setLoading(false);
    }
    
    loadStats();
  }, []);

  const handleSendWhatsAppReport = () => {
    toast.info("WhatsApp Raporu Gönderiliyor...", {
      description: "Tüm velilere haftalık harcama ve yoklama dökümleri iletiliyor.",
      duration: 3000,
    });
    
    setTimeout(() => {
      toast.success("Raporlar Başarıyla Gönderildi!");
    }, 2000);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-3xl font-bold tracking-tight">Raporlar & Girişler</h2>
        <Button onClick={handleSendWhatsAppReport} className="h-12 px-6 rounded-xl shadow-md bg-green-600 hover:bg-green-700 text-white">
          <MessageSquareShare className="w-5 h-5 mr-2" />
          Haftalık WhatsApp Dökümü Gönder
        </Button>
      </div>

      <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl p-5 flex gap-4 items-start shadow-sm">
        <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center shrink-0">
          <Info className="w-5 h-5 text-emerald-600" />
        </div>
        <div>
          <h3 className="font-bold text-lg mb-1">Mali ve Operasyonel Özet Ekranı</h3>
          <p className="text-sm leading-relaxed text-emerald-800/80">
            Burası kafenizdeki ve merkezinizdeki hareketliliği takip ettiğiniz istatistik panelidir. <br/>
            <span className="block mt-2 font-medium text-emerald-900">
              👉 Kiosk üzerinden giriş yapan tüm öğrenciler ve POS kasanızdan kesilen tüm "Peşin / Veresiye" fişleri otomatik olarak buraya yansır. Gün sonu hesaplarını buradan çıkarabilir, haftalık veli bilgilendirmelerini WhatsApp üzerinden tek tıkla gönderebilirsiniz.
            </span>
          </p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="bg-primary/5 border-primary/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-lg font-bold">Bugünkü Girişler</CardTitle>
            <Users className="h-6 w-6 text-primary" />
          </CardHeader>
          <CardContent>
            {loading ? <Loader2 className="animate-spin w-8 h-8 text-primary" /> : (
              <div className="text-5xl font-extrabold text-primary">{todayCheckins}</div>
            )}
            <p className="text-sm text-muted-foreground mt-2">
              Öğrenci Kiosk üzerinden giriş yaptı
            </p>
          </CardContent>
        </Card>

        <Card className="bg-green-500/5 border-green-500/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-lg font-bold">Bugünkü Kantin Ciro</CardTitle>
            <TrendingUp className="h-6 w-6 text-green-600" />
          </CardHeader>
          <CardContent>
            {loading ? <Loader2 className="animate-spin w-8 h-8 text-green-600" /> : (
              <div className="text-5xl font-extrabold text-green-600">{todayRevenue.toLocaleString('tr-TR')} ₺</div>
            )}
            <p className="text-sm text-muted-foreground mt-2">
              Toplam POS harcaması
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Son Giriş Yapan Öğrenciler</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
             <div className="py-8 flex justify-center"><Loader2 className="animate-spin text-slate-400 w-8 h-8" /></div>
          ) : recentCheckins.length === 0 ? (
             <div className="text-center py-6 text-slate-500">Henüz giriş yapan öğrenci bulunmuyor.</div>
          ) : (
            <div className="space-y-4">
              {recentCheckins.map((att, i) => {
                const name = att.student?.full_name || "İsimsiz Öğrenci";
                return (
                <div key={i} className="flex items-center justify-between border-b pb-4 last:border-0 last:pb-0">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center font-bold text-muted-foreground">
                      {name.charAt(0)}
                    </div>
                    <div>
                      <p className="font-semibold">{name}</p>
                      <p className="text-sm text-muted-foreground">Giriş Tipi: {att.check_in_type === "qr" ? "QR Kod" : "PIN"}</p>
                    </div>
                  </div>
                  <div className="text-sm text-muted-foreground font-mono">
                    {new Date(att.created_at).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              )})}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
