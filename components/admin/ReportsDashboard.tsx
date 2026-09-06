"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MessageSquareShare, TrendingUp, Users, Info } from "lucide-react";
import { toast } from "sonner";

export function ReportsDashboard() {
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
            <div className="text-5xl font-extrabold text-primary">148</div>
            <p className="text-sm text-muted-foreground mt-2">
              Öğrenci Kiosk üzerinden giriş yaptı
            </p>
          </CardContent>
        </Card>

        <Card className="bg-green-500/5 border-green-500/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-lg font-bold">Bugünkü Ciro (POS)</CardTitle>
            <TrendingUp className="h-6 w-6 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-5xl font-extrabold text-green-600">₺4,250.00</div>
            <p className="text-sm text-muted-foreground mt-2">
              Kafeterya satışlarından elde edilen tutar
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Son Giriş Yapan Öğrenciler</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {["Ahmet Yılmaz (QR)", "Zeynep Kaya (PIN)", "Can Demir (QR)", "Elif Yılmaz (QR)"].map((name, i) => (
              <div key={i} className="flex items-center justify-between border-b pb-4 last:border-0 last:pb-0">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center font-bold text-muted-foreground">
                    {name.charAt(0)}
                  </div>
                  <div>
                    <p className="font-semibold">{name.split(" ")[0]} {name.split(" ")[1]}</p>
                    <p className="text-sm text-muted-foreground">Giriş Tipi: {name.includes("QR") ? "QR Kod" : "PIN"}</p>
                  </div>
                </div>
                <div className="text-sm text-muted-foreground font-mono">
                  {new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
