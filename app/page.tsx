"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { 
  ArrowRight, QrCode, MessageCircle, Coffee, LineChart, 
  Megaphone, HardDrive, CheckCircle2, MonitorSmartphone, Users 
} from "lucide-react";
import { toast } from "sonner";

export default function LandingPage() {

  const handleCheckout = async (plan: 'standard' | 'professional') => {
    toast.loading("Ödeme sayfası hazırlanıyor...", { id: "checkout" });
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plan,
          email: '', // Kullanıcıdan alınacak veya giriş sonrası
          name: '',
        }),
      });
      const data = await res.json();
      if (data.success && data.checkoutUrl) {
        toast.success("Yönlendiriliyorsunuz...", { id: "checkout" });
        window.location.href = data.checkoutUrl;
      } else {
        throw new Error(data.error || "Ödeme başlatılamadı.");
      }
    } catch (err: any) {
      toast.error("Hata: " + err.message, { id: "checkout" });
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans selection:bg-primary/20">
      {/* NAVBAR MOVED TO LAYOUT.TSX */}

      {/* HERO SECTION */}
      <section className="pt-40 pb-20 px-6 overflow-hidden relative">
        {/* Dekoratif Arka Plan Glow Efektleri */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/5 rounded-full blur-3xl -z-10"></div>
        <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-blue-500/5 rounded-full blur-3xl -z-10"></div>
        
        <div className="container mx-auto text-center max-w-4xl">
          <Badge className="mb-6 px-4 py-1.5 bg-green-100 text-green-700 hover:bg-green-200 border-none rounded-full text-sm font-bold tracking-wide">
            Yeni Nesil Eğitim Merkezi Otomasyonu
          </Badge>
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-slate-900 leading-[1.1] mb-8">
            Okul Sonrası Mekanınızı <br className="hidden md:block" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-blue-600">Güvenli ve Otomatik </span>
            Bir Öğrenci Kulübüne Dönüştürün.
          </h1>
          <p className="text-xl md:text-2xl text-slate-500 mb-10 max-w-3xl mx-auto leading-relaxed">
            Giriş Kiosk Terminali, Veliye Otomatik WhatsApp Bildirimi ve Limitli Veresiye Takip Sistemi Tek Platformda. Mekanınızda düzeni sağlayın, velilere güven verin.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Link href="/register">
              <Button size="lg" className="w-full sm:w-auto h-14 px-8 text-lg rounded-full font-bold shadow-xl shadow-primary/25 hover:-translate-y-1 transition-all">
                14 Gün Ücretsiz Dene <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </Link>
            <Link href="/kiosk">
              <Button size="lg" variant="outline" className="w-full sm:w-auto h-14 px-8 text-lg rounded-full font-bold border-2 hover:bg-slate-100">
                Kiosk Demosunu İncele
              </Button>
            </Link>
          </div>
        </div>
      </section>



      {/* FEATURES GRID */}
      <section id="features" className="py-24 bg-white border-y">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-extrabold text-slate-900 tracking-tight mb-4">İhtiyacınız Olan Her Şey</h2>
            <p className="text-lg text-slate-500 max-w-2xl mx-auto">İşletmenizi modern bir kuruma dönüştürecek tüm teknolojik altyapı tek bir çatı altında birleşti.</p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              { icon: QrCode, title: "Otomatik QR & PIN Kiosk", desc: "Öğrenciler kapıdaki tabletten QR okutarak veya PIN girerek saniyeler içinde giriş yapar." },
              { icon: MessageCircle, title: "Anlık WhatsApp Bildirimi", desc: "Öğrenci giriş yaptığında veya harcama gerçekleştirdiğinde veliye otomatik mesaj gider." },
              { icon: Coffee, title: "Limitli Kafe Veresiye Motoru", desc: "Öğrenciler haftalık harcama limiti dahilinde kantinden veresiye alışveriş yapabilir." },
              { icon: LineChart, title: "Otomatik Pazar Dökümü", desc: "Her Pazar, haftalık ciro ve harcama dökümleri ödeme linkleriyle velilere raporlanır." },
              { icon: Megaphone, title: "Toplu Kampanya Duyurusu", desc: "Aktif velilerinize veya bugün gelenlere tek tıkla toplu kampanya duyuruları gönderin." },
              { icon: HardDrive, title: "Google Drive Yedeklemesi", desc: "Tüm sistem kayıtlarınız otomatik olarak kişisel Google Drive klasörünüze JSON aktarılır." }
            ].map((feat, i) => (
              <div key={i} className="p-8 rounded-3xl bg-slate-50 border border-slate-100 hover:border-primary/30 transition-all group">
                <div className="w-14 h-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <feat.icon className="w-7 h-7" />
                </div>
                <h3 className="text-xl font-bold mb-3 text-slate-900">{feat.title}</h3>
                <p className="text-slate-500 leading-relaxed font-medium">{feat.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how-it-works" className="py-24 bg-slate-900 text-white overflow-hidden relative">
        <div className="container mx-auto px-6 relative z-10">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-extrabold tracking-tight mb-4">3 Adımda Kolay Kurulum</h2>
            <p className="text-lg text-slate-400 max-w-2xl mx-auto">Sistemi mekanınıza entegre etmek için teknik bilgiye ihtiyacınız yok.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="flex flex-col items-center text-center">
              <div className="w-20 h-20 rounded-full bg-white/10 flex items-center justify-center text-3xl font-black mb-6 relative">
                1
                <div className="absolute top-1/2 left-full w-full h-1 bg-gradient-to-r from-white/20 to-transparent hidden md:block -z-10"></div>
              </div>
              <h3 className="text-2xl font-bold mb-3">Hesabınızı Açın</h3>
              <p className="text-slate-400">Admin paneline girip öğrenci listenizi ve kafe menünüzü dakikalar içinde ekleyin.</p>
            </div>
            
            <div className="flex flex-col items-center text-center">
              <div className="w-20 h-20 rounded-full bg-primary flex items-center justify-center text-3xl font-black mb-6 relative shadow-lg shadow-primary/50">
                2
                <div className="absolute top-1/2 left-full w-full h-1 bg-gradient-to-r from-white/20 to-transparent hidden md:block -z-10"></div>
              </div>
              <h3 className="text-2xl font-bold mb-3">Kiosk'u Başlatın</h3>
              <p className="text-slate-400">Kapı girişindeki herhangi bir tabletten (iPad/Android) /kiosk ekranını açıp sistemi aktif edin.</p>
            </div>

            <div className="flex flex-col items-center text-center">
              <div className="w-20 h-20 rounded-full bg-white/10 flex items-center justify-center text-3xl font-black mb-6">
                3
              </div>
              <h3 className="text-2xl font-bold mb-3">Gelirinizi Katlayın</h3>
              <p className="text-slate-400">Velilere güven vererek yeni kayıtlar alın, POS veresiye modülüyle kantin gelirinizi düzenli toplayın.</p>
            </div>
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section id="pricing" className="py-24 bg-slate-50">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-extrabold text-slate-900 tracking-tight mb-4">Basit ve Şeffaf Fiyatlandırma</h2>
            <p className="text-lg text-slate-500 max-w-2xl mx-auto">Gizli ücret yok, sürpriz yok. İşletmenizin büyüklüğüne en uygun paketi seçin.</p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
            {/* Standart Paket */}
            <Card className="rounded-3xl border-2 hover:border-primary/30 transition-all p-2 bg-white">
              <CardHeader className="p-8">
                <CardTitle className="text-2xl font-bold mb-2">Standart Paket</CardTitle>
                <CardDescription className="text-base">Küçük ve orta ölçekli mekanlar için başlangıç.</CardDescription>
                <div className="my-6">
                  <span className="text-5xl font-black tracking-tight">₺1.250</span>
                  <span className="text-slate-500 font-semibold"> /ay</span>
                </div>
              </CardHeader>
              <CardContent className="px-8 pb-8 space-y-4">
                {['Maksimum 30 Öğrenci', 'Kiosk Giriş Ekranı', 'Kafe POS Modülü', 'Temel Raporlar', 'Email Destek'].map((feat, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0" />
                    <span className="font-medium text-slate-700">{feat}</span>
                  </div>
                ))}
              </CardContent>
              <CardFooter className="px-8 pb-8">
                <Button variant="outline" className="w-full h-14 rounded-xl text-lg font-bold border-2" onClick={() => handleCheckout('standard')}>Hemen Başla</Button>
              </CardFooter>
            </Card>

            {/* Profesyonel Paket */}
            <Card className="rounded-3xl border-2 border-primary shadow-2xl shadow-primary/10 relative p-2 bg-white transform md:-translate-y-4">
              <div className="absolute -top-4 inset-x-0 flex justify-center">
                <Badge className="bg-primary text-primary-foreground uppercase tracking-widest font-extrabold py-1.5 px-4 shadow-md">
                  En Çok Tercih Edilen
                </Badge>
              </div>
              <CardHeader className="p-8">
                <CardTitle className="text-2xl font-bold mb-2">Profesyonel Paket</CardTitle>
                <CardDescription className="text-base">Büyüyen kulüpler için tüm özellikler sınırsız.</CardDescription>
                <div className="my-6">
                  <span className="text-5xl font-black tracking-tight">₺1.950</span>
                  <span className="text-slate-500 font-semibold"> /ay</span>
                </div>
              </CardHeader>
              <CardContent className="px-8 pb-8 space-y-4">
                {['Sınırsız Öğrenci Yönetimi', 'Tüm Standart Özellikler', 'Otomatik WhatsApp Bildirimleri', 'Velilere Toplu Kampanya Duyurusu', 'Özel Logo Entegrasyonu', 'Öncelikli Destek'].map((feat, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-primary shrink-0" />
                    <span className="font-medium text-slate-700">{feat}</span>
                  </div>
                ))}
              </CardContent>
              <CardFooter className="px-8 pb-8">
                <Button className="w-full h-14 rounded-xl text-lg font-bold" onClick={() => handleCheckout('professional')}>14 Gün Ücretsiz Dene</Button>
              </CardFooter>
            </Card>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-24 bg-white border-t">
        <div className="container mx-auto px-6 max-w-3xl">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-extrabold text-slate-900 tracking-tight mb-4">Sıkça Sorulan Sorular</h2>
          </div>
          <Accordion className="w-full">
            <AccordionItem value="item-1" className="px-2">
              <AccordionTrigger className="text-left text-lg font-bold hover:no-underline hover:text-primary">Ekstra cihaz satın almam gerekiyor mu?</AccordionTrigger>
              <AccordionContent className="text-base text-slate-600 leading-relaxed pt-2">
                Hayır, herhangi bir tablet veya bilgisayar (iPad, Android, Windows) yeterlidir. Kiosk ekranı internet tarayıcısı üzerinden kamera erişimiyle çalışır ve özel bir donanım kurulumu gerektirmez.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-2" className="px-2">
              <AccordionTrigger className="text-left text-lg font-bold hover:no-underline hover:text-primary">WhatsApp mesajları için ekstra ücret öder miyim?</AccordionTrigger>
              <AccordionContent className="text-base text-slate-600 leading-relaxed pt-2">
                Hayır, Profesyonel Paket'e dahil olduğunuzda sistem WhatsApp Web cihazınızı QR kod ile eşleştirir. Kendi numaranız üzerinden ücretsiz olarak otomatik mesaj gönderimi sağlanır.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-3" className="px-2">
              <AccordionTrigger className="text-left text-lg font-bold hover:no-underline hover:text-primary">Haftalık limit aşılırsa ne olur?</AccordionTrigger>
              <AccordionContent className="text-base text-slate-600 leading-relaxed pt-2">
                Öğrenci için velisi tarafından belirlenen haftalık veresiye limiti (örneğin 250 TL) dolduğunda, POS sistemi satışı otomatik olarak durdurur ve kasiyeri uyarır. Öğrenci isterse o anlık harcamasını "Peşin/Kredi Kartı" seçeneği ile gerçekleştirebilir.
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      </section>

      {/* FOOTER MOVED TO LAYOUT.TSX */}
    </div>
  );
}
