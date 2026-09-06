"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogTrigger, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Building2, Save, Smartphone, CheckCircle2, ShieldCheck, Crown, KeyRound, Copy, Camera, Info, Loader2, CreditCard, Lock, RefreshCw, AlertCircle, PlayCircle } from "lucide-react";
import { createClient } from "@/lib/supabase";

export function TenantSettings() {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [tenant, setTenant] = useState<any>(null);

  // Form States
  const [name, setName] = useState("");
  const [whatsappKey, setWhatsappKey] = useState("");
  const [phone, setPhone] = useState("0555 123 4567");
  const [cameraStreamUrl, setCameraStreamUrl] = useState("");
  const [cameraStreamType, setCameraStreamType] = useState("none");
  const [kioskToken, setKioskToken] = useState("osk_kiosk_8f92a3b1c4e5d6");
  const [posToken, setPosToken] = useState("osk_pos_x7y8z9w0a1b2c3");
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  useEffect(() => {
    fetchTenantDetails();
  }, []);

  const fetchTenantDetails = async () => {
    try {
      const tenantId = localStorage.getItem("impersonate_tenant_id");
      if (!tenantId) {
        toast.error("İşletme kimliği bulunamadı! Lütfen Süper Admin'den giriş yapın.");
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('tenants')
        .select('*')
        .eq('id', tenantId)
        .single();

      if (error) throw error;
      
      setTenant(data);
      setName(data.name || "");
      setWhatsappKey(data.whatsapp_api_key || "");
    } catch (err: any) {
      console.error(err);
      toast.error("İşletme bilgileri yüklenemedi.");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveGeneral = async () => {
    setSaving(true);
    try {
      const tenantId = localStorage.getItem("impersonate_tenant_id");
      if (!tenantId) throw new Error("Tenant ID eksik");

      const { error } = await supabase
        .from('tenants')
        .update({ name })
        .eq('id', tenantId);

      if (error) throw error;
      toast.success("Genel işletme ayarları kaydedildi.");
    } catch (err: any) {
      toast.error("Kaydetme başarısız: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveIntegration = async () => {
    setSaving(true);
    try {
      const tenantId = localStorage.getItem("impersonate_tenant_id");
      if (!tenantId) throw new Error("Tenant ID eksik");

      const { error } = await supabase
        .from('tenants')
        .update({ whatsapp_api_key: whatsappKey })
        .eq('id', tenantId);

      if (error) throw error;
      toast.success("Entegrasyon ayarları kaydedildi.");
    } catch (err: any) {
      toast.error("Kaydetme başarısız: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} panoya kopyalandı.`);
  };

  if (loading) {
    return <div className="flex justify-center items-center h-64"><Loader2 className="w-8 h-8 animate-spin text-slate-400" /></div>;
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-12 h-12 rounded-xl bg-slate-900 flex items-center justify-center shadow-md">
          <SettingsIcon className="w-6 h-6 text-white" />
        </div>
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-slate-900">İşletme Ayarları</h2>
          <p className="text-slate-500">Sistem yapılandırması, cihaz güvenliği ve entegrasyonlar</p>
        </div>
      </div>

      <div className="bg-slate-50 border border-slate-200 text-slate-900 rounded-xl p-5 flex gap-4 items-start shadow-sm mb-6">
        <div className="w-10 h-10 bg-slate-200 rounded-full flex items-center justify-center shrink-0">
          <Info className="w-5 h-5 text-slate-600" />
        </div>
        <div>
          <h3 className="font-bold text-lg mb-1">Sistem Odası ve Bağlantı Ayarları</h3>
          <p className="text-sm leading-relaxed text-slate-700">
            Burası işletmenizin teknik kontrol panelidir. Profilinizi düzenleyebilir, abonelik paketinizi görüntüleyebilir, Veli iletişimini (WhatsApp) entegre edebilir ve cihaz (Kiosk/POS) güvenlik anahtarlarınızı yönetebilirsiniz.<br/>
            <span className="block mt-2 font-medium text-slate-900">
              👉 Değişiklik yaptığınız sekmelerdeki "Değişiklikleri Kaydet" butonuna basmayı unutmayın.
            </span>
          </p>
        </div>
      </div>

      <Tabs defaultValue="general" className="w-full">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 mb-6 bg-slate-100 p-1 rounded-xl">
          <TabsTrigger value="general" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm py-2"><Building2 className="w-4 h-4 mr-2"/> Genel</TabsTrigger>
          <TabsTrigger value="integrations" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm py-2"><Smartphone className="w-4 h-4 mr-2"/> Entegrasyon</TabsTrigger>
          <TabsTrigger value="security" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm py-2"><Lock className="w-4 h-4 mr-2"/> Güvenlik</TabsTrigger>
          <TabsTrigger value="billing" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm py-2"><Crown className="w-4 h-4 mr-2"/> Abonelik</TabsTrigger>
        </TabsList>

        {/* GENEL AYARLAR */}
        <TabsContent value="general" className="space-y-6">
          <Card className="shadow-sm border-slate-200">
            <CardHeader>
              <CardTitle>Profil Bilgileri</CardTitle>
              <CardDescription>Müşterilerinizin ve velilerin göreceği temel işletme bilgileriniz.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label>Mekan/İşletme Adı</Label>
                  <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="İşletme Adı" className="h-11" />
                </div>
                <div className="space-y-2">
                  <Label>İletişim Numarası</Label>
                  <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="0555..." className="h-11" />
                </div>
              </div>
            </CardContent>
            <CardFooter className="bg-slate-50 border-t justify-end p-4 rounded-b-xl">
              <Button onClick={handleSaveGeneral} disabled={saving} className="bg-slate-900 hover:bg-slate-800 text-white shadow-md">
                {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                Değişiklikleri Kaydet
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>

        {/* ENTEGRASYONLAR */}
        <TabsContent value="integrations" className="space-y-6">
          <Card className="shadow-sm border-green-100 bg-green-50/20">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Smartphone className="w-6 h-6 text-green-600" />
                <CardTitle className="text-green-700">WhatsApp Bildirim Altyapısı</CardTitle>
              </div>
              <CardDescription>Velilere gönderilecek giriş-çıkış bildirimleri ve raporlar için entegrasyonu kurun.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-white border border-green-200 rounded-xl">
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${whatsappKey ? 'bg-green-500' : 'bg-red-400'}`}></div>
                  <div>
                    <h4 className="font-semibold text-slate-800">Bağlantı Durumu</h4>
                    <p className="text-sm text-slate-500">{whatsappKey ? 'API Anahtarı Tanımlı (Aktif)' : 'Kurulum Bekleniyor'}</p>
                  </div>
                </div>
                {!whatsappKey && <div className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-xs font-bold uppercase">Pasif</div>}
                {whatsappKey && <div className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-bold uppercase">Bağlı</div>}
              </div>

              <div className="space-y-2 pt-2">
                <Label>WhatsApp API Key (3. Parti Sağlayıcı)</Label>
                <div className="flex gap-2">
                  <Input 
                    type="password" 
                    value={whatsappKey} 
                    onChange={(e) => setWhatsappKey(e.target.value)} 
                    placeholder="WHA-XXXXXXXXXXXXXXXXX" 
                    className="h-11 font-mono"
                  />
                </div>
                <p className="text-xs text-slate-500 mt-1">Sistem tarafından sağlanan API anahtarınızı buraya yapıştırın.</p>
              </div>
            </CardContent>
            <CardFooter className="bg-white border-t border-green-100 justify-end p-4 rounded-b-xl">
              <Button onClick={handleSaveIntegration} disabled={saving} className="bg-green-600 hover:bg-green-700 text-white shadow-md">
                {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                Bağlantıyı Kaydet
              </Button>
            </CardFooter>
          </Card>

          <Card className="shadow-sm border-slate-200">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Camera className="w-6 h-6 text-slate-700" />
                <CardTitle>Canlı Kamera Yayını (Veli Ekranı)</CardTitle>
              </div>
              <CardDescription>Velilerin çocuklarını izleyebilmesi için HLS/iFrame kodunuzu ekleyin.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Yayın Tipi</Label>
                    <Select value={cameraStreamType} onValueChange={(val) => val && setCameraStreamType(val)}>
                      <SelectTrigger className="h-11">
                        <SelectValue placeholder="Seçiniz..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Yayın Yok (Kapalı)</SelectItem>
                        <SelectItem value="hls">HLS (M3U8) Linki</SelectItem>
                        <SelectItem value="iframe">iFrame Yerleştirme</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Yayın URL'si</Label>
                    <Input 
                      value={cameraStreamUrl} 
                      onChange={(e) => setCameraStreamUrl(e.target.value)} 
                      disabled={cameraStreamType === "none"} 
                      placeholder="https://..." 
                      className="h-11"
                    />
                  </div>
               </div>
            </CardContent>
             <CardFooter className="bg-slate-50 border-t justify-end p-4 rounded-b-xl">
              <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
                <DialogTrigger render={
                  <Button variant="outline" className="shadow-sm border-dashed mr-2" disabled={!cameraStreamUrl || cameraStreamType === "none"}>
                    <PlayCircle className="w-4 h-4 mr-2" /> Önizleme Testi
                  </Button>
                } />
                <DialogContent className="sm:max-w-[600px] p-0 overflow-hidden bg-black border-none">
                  <div className="aspect-video w-full flex items-center justify-center bg-zinc-900 text-white">
                    {cameraStreamType === "iframe" ? (
                      <div className="w-full h-full" dangerouslySetInnerHTML={{ __html: cameraStreamUrl }} />
                    ) : (
                      <div className="text-center p-6">
                        <PlayCircle className="w-12 h-12 opacity-50 mx-auto mb-3" />
                        <p className="font-mono text-sm break-all">{cameraStreamUrl}</p>
                        <p className="text-xs text-zinc-400 mt-2">(HLS oynatıcı simülasyonu)</p>
                      </div>
                    )}
                  </div>
                </DialogContent>
              </Dialog>
              <Button variant="outline" className="shadow-sm">
                Kaydet
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>

        {/* GÜVENLİK VE CİHAZ YÖNETİMİ */}
        <TabsContent value="security" className="space-y-6">
          <Card className="shadow-sm border-slate-200 border-l-4 border-l-blue-500">
            <CardHeader>
              <CardTitle>Donanım Cihazları (Token)</CardTitle>
              <CardDescription>Kiosk (Turnike) ve POS (Yazar Kasa) tabletlerinizi bu işletmeye bağlamak için bu şifreleri kullanın.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              
              {/* Kiosk Token */}
              <div className="bg-slate-50 border rounded-xl p-4">
                <div className="flex justify-between items-center mb-3">
                  <h4 className="font-semibold text-slate-800 flex items-center gap-2">
                    <KeyRound className="w-4 h-4 text-slate-500"/>
                    Kiosk (Yoklama) Cihazı Token
                  </h4>
                  <div className="px-2 py-0.5 bg-white border text-xs font-semibold rounded-md text-slate-500">Tablet 1</div>
                </div>
                <div className="flex gap-2">
                  <Input readOnly value={kioskToken} className="font-mono bg-white h-11" />
                  <Button variant="outline" className="h-11 px-3 shadow-sm bg-white" onClick={() => copyToClipboard(kioskToken, 'Kiosk Token')}>
                    <Copy className="w-4 h-4" />
                  </Button>
                  <Button variant="outline" className="h-11 px-3 shadow-sm bg-white text-blue-600 hover:text-blue-700">
                    <RefreshCw className="w-4 h-4" />
                  </Button>
                </div>
                <p className="text-xs text-slate-500 mt-2">Tabletinizde Kiosk uygulamasını açtığınızda ekrana bu token'ı girin.</p>
              </div>

              {/* POS Token */}
              <div className="bg-slate-50 border rounded-xl p-4">
                <div className="flex justify-between items-center mb-3">
                  <h4 className="font-semibold text-slate-800 flex items-center gap-2">
                    <KeyRound className="w-4 h-4 text-slate-500"/>
                    POS (Kasa) Cihazı Token
                  </h4>
                  <div className="px-2 py-0.5 bg-white border text-xs font-semibold rounded-md text-slate-500">Tablet 2</div>
                </div>
                <div className="flex gap-2">
                  <Input readOnly value={posToken} className="font-mono bg-white h-11" />
                  <Button variant="outline" className="h-11 px-3 shadow-sm bg-white" onClick={() => copyToClipboard(posToken, 'POS Token')}>
                    <Copy className="w-4 h-4" />
                  </Button>
                  <Button variant="outline" className="h-11 px-3 shadow-sm bg-white text-blue-600 hover:text-blue-700">
                    <RefreshCw className="w-4 h-4" />
                  </Button>
                </div>
                <p className="text-xs text-slate-500 mt-2">Kasadaki POS uygulamasını sisteme entegre etmek için bu token'ı girin.</p>
              </div>

            </CardContent>
          </Card>
        </TabsContent>

        {/* ABONELİK (FATURALANDIRMA) */}
        <TabsContent value="billing" className="space-y-6">
          <Card className="shadow-sm border-amber-200 bg-amber-50/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-amber-800">
                <Crown className="w-6 h-6" />
                Mevcut Paketiniz
              </CardTitle>
              <CardDescription>Abonelik planınız ve kullanım detaylarınız.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col md:flex-row gap-6">
                
                {/* Plan Kutusu */}
                <div className="flex-1 bg-white border border-amber-200 rounded-xl p-6 shadow-sm text-center relative overflow-hidden">
                  <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-amber-400 to-amber-600"></div>
                  <h3 className="text-sm font-bold tracking-widest uppercase text-slate-500 mb-2">Aktif Plan</h3>
                  <div className="text-4xl font-extrabold text-amber-600 mb-2">
                    {tenant?.plan_type === 'trial' ? 'Deneme Paketi' : (tenant?.plan_type?.toUpperCase() || 'BİLİNMİYOR')}
                  </div>
                  
                  {tenant?.plan_type === 'trial' && (
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-100 text-amber-800 rounded-full text-sm font-semibold mt-2">
                      <AlertCircle className="w-4 h-4" />
                      14 Günlük Süre
                    </div>
                  )}

                  <div className="mt-6 pt-6 border-t border-slate-100 flex flex-col items-center justify-center">
                    <p className="text-sm text-slate-500 mb-1">Hesap Durumu</p>
                    <div className="flex items-center gap-1 text-green-600 font-bold">
                      <ShieldCheck className="w-5 h-5" /> Aktif
                    </div>
                  </div>
                </div>

                {/* Detay Kutusu */}
                <div className="flex-1 space-y-4">
                  <div className="bg-white border rounded-xl p-4 shadow-sm flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-slate-600">Yenilenme / Bitiş Tarihi</p>
                      <p className="text-lg font-bold text-slate-900 mt-1">
                        {tenant?.trial_ends_at ? new Date(tenant?.trial_ends_at).toLocaleDateString('tr-TR') : 'Sınırsız'}
                      </p>
                    </div>
                    <CreditCard className="w-8 h-8 text-slate-300" />
                  </div>
                  
                  <div className="bg-white border rounded-xl p-4 shadow-sm flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-slate-600">Kullanılan Öğrenci Kotası</p>
                      <p className="text-lg font-bold text-slate-900 mt-1">Sınırsız / Limitsiz</p>
                    </div>
                    <UsersIcon className="w-8 h-8 text-slate-300" />
                  </div>
                </div>

              </div>
            </CardContent>
            <CardFooter className="bg-white border-t border-amber-200 justify-end p-4 rounded-b-xl">
              <Button className="bg-amber-500 hover:bg-amber-600 text-white shadow-md">
                Planı Yükselt / Ödeme Yap
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>

      </Tabs>
    </div>
  );
}

function UsersIcon(props: any) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}
function SettingsIcon(props: any) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}
