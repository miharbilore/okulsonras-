"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import Link from "next/link";
import {
  Shield, Users, Building2, Plus, Eye, Power,
  Search, LogOut, BarChart3, Settings2, Pencil, Trash2
} from "lucide-react";
import { createClient } from "@/lib/supabase";

interface Tenant {
  id: string;
  name: string;
  slug: string;
  created_at: string;
  plan_type?: string;
  status?: string;
  trial_ends_at?: string;
  // Joined fields
  student_count?: number;
  trial_days_left?: number;
}

export default function SuperAdminPage() {
  const supabase = createClient();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [newTenant, setNewTenant] = useState({ name: "", slug: "", contactEmail: "", plan: "deneme" });

  // =============================================
  // VERİLERİ SUPABASE'DEN ÇEK
  // =============================================
  useEffect(() => {
    async function fetchTenants() {
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from("tenants")
          .select("*")
          .order("created_at", { ascending: false });

        if (error) throw error;

        // Her tenant için öğrenci sayısını çek
        const tenantsWithCounts = await Promise.all(
          (data || []).map(async (tenant: any) => {
            const { count } = await supabase
              .from("students")
              .select("*", { count: "exact", head: true })
              .eq("tenant_id", tenant.id);

            // Deneme süresi hesabı
            let trialDaysLeft = 0;
            if (tenant.plan_type === "deneme" && tenant.trial_ends_at) {
              const endsAt = new Date(tenant.trial_ends_at).getTime();
              const now = new Date().getTime();
              trialDaysLeft = Math.max(0, Math.ceil((endsAt - now) / (1000 * 60 * 60 * 24)));
            }

            return {
              ...tenant,
              student_count: count || 0,
              trial_days_left: trialDaysLeft,
            };
          })
        );

        setTenants(tenantsWithCounts);
      } catch (err: any) {
        console.error("Tenant fetch error:", err);
        toast.error("Müşteri listesi yüklenemedi: " + err.message);
      } finally {
        setIsLoading(false);
      }
    }
    fetchTenants();
  }, []);

  const activeTenants = tenants.filter((t) => t.status === "active").length;
  const totalStudents = tenants.reduce((acc, t) => acc + (t.student_count || 0), 0);

  // =============================================
  // YENİ MÜŞTERİ EKLE (Gerçek Supabase Insert)
  // =============================================
  const handleAddTenant = async () => {
    if (!newTenant.name || !newTenant.slug) {
      toast.error("Lütfen işletme adı ve slug alanlarını doldurun.");
      return;
    }

    try {
      // Deneme planı seçilmişse 14 gün sonrası hesaplanır.
      const isTrial = newTenant.plan === "deneme";
      let trialEndsAt = null;
      if (isTrial) {
        const d = new Date();
        d.setDate(d.getDate() + 14);
        trialEndsAt = d.toISOString();
      }

      const { data, error } = await supabase.from("tenants").insert({
        name: newTenant.name,
        slug: newTenant.slug,
        plan_type: newTenant.plan,
        status: "active",
        trial_ends_at: trialEndsAt
      }).select().single();

      if (error) throw error;

      setTenants((prev) => [
        { ...data, student_count: 0, trial_days_left: isTrial ? 14 : 0 },
        ...prev,
      ]);
      setIsAddOpen(false);
      setNewTenant({ name: "", slug: "", contactEmail: "", plan: "deneme" });
      toast.success(`"${data.name}" başarıyla eklendi ve lisansı tanımlandı.`);
    } catch (err: any) {
      toast.error("Müşteri eklenemedi: " + err.message);
    }
  };

  // =============================================
  // MÜŞTERİ GÜNCELLE & SİL
  // =============================================
  const [editingTenant, setEditingTenant] = useState<Tenant | null>(null);

  const handleUpdateTenant = async () => {
    if (!editingTenant) return;
    try {
      const { data, error } = await supabase
        .from("tenants")
        .update({
          plan_type: editingTenant.plan_type,
          status: editingTenant.status,
        })
        .eq("id", editingTenant.id)
        .select()
        .single();

      if (error) throw error;

      setTenants((prev) =>
        prev.map((t) => (t.id === editingTenant.id ? { ...t, ...data } : t))
      );
      setEditingTenant(null);
      toast.success("İşletme başarıyla güncellendi.");
    } catch (err: any) {
      toast.error("Güncelleme başarısız: " + err.message);
    }
  };

  const handleDeleteTenant = async (id: string, name: string) => {
    if (!confirm(`DİKKAT: "${name}" adlı müşteriyi kalıcı olarak silmek istediğinize emin misiniz? Bu işlem geri alınamaz!`)) return;
    
    try {
      const { error } = await supabase.from("tenants").delete().eq("id", id);
      if (error) throw error;

      setTenants((prev) => prev.filter((t) => t.id !== id));
      toast.success(`"${name}" adlı işletme silindi.`);
    } catch (err: any) {
      toast.error("Silme işlemi başarısız: " + err.message);
    }
  };

  // =============================================
  // IMPERSONATE (İşletme paneline geçici giriş)
  // =============================================
  const handleImpersonate = async (tenant: Tenant) => {
    toast.loading(`"${tenant.name}" paneline giriş yapılıyor...`, { id: "imp" });

    try {
      // Tenant bilgisini localStorage'a geçici olarak yaz
      // Gerçek üretimde: custom claims veya server-side session kullanılır
      localStorage.setItem("impersonate_tenant_id", tenant.id);
      localStorage.setItem("impersonate_tenant_name", tenant.name);
      localStorage.setItem("impersonate_mode", "true");

      toast.success(`"${tenant.name}" yönetim paneline yönlendiriliyorsunuz.`, { id: "imp" });

      setTimeout(() => {
        window.location.href = "/admin";
      }, 800);
    } catch (err: any) {
      toast.error("Giriş başarısız: " + err.message, { id: "imp" });
    }
  };

  const filtered = tenants.filter(
    (t) =>
      t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.slug.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* HEADER */}
      <header className="sticky top-0 z-50 bg-slate-900/80 backdrop-blur-lg border-b border-white/10">
        <div className="container mx-auto px-6 h-20 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
            <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-orange-500 rounded-xl flex items-center justify-center shadow-lg shadow-red-500/20">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-extrabold tracking-tight">
                OkulSonrası <span className="text-red-400">Süper Admin</span>
              </h1>
              <p className="text-xs text-slate-500 font-medium">Platform Yönetim Merkezi</p>
            </div>
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/admin">
              <Button variant="ghost" size="sm" className="text-slate-400 hover:text-white">
                <Settings2 className="w-4 h-4 mr-2" /> Tenant Admin
              </Button>
            </Link>
            <Button
              variant="ghost"
              size="sm"
              className="text-slate-400 hover:text-red-400"
              onClick={async () => {
                await supabase.auth.signOut();
                localStorage.removeItem("impersonate_tenant_id");
                localStorage.removeItem("impersonate_tenant_name");
                localStorage.removeItem("impersonate_mode");
                window.location.href = "/login";
              }}
            >
              <LogOut className="w-4 h-4 mr-2" /> Çıkış
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-10 space-y-10">
        {/* İSTATİSTİK KARTLARI */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="bg-slate-800/50 border-white/5 text-white rounded-2xl">
            <CardContent className="flex items-center gap-4 p-6">
              <div className="w-14 h-14 rounded-2xl bg-blue-500/20 flex items-center justify-center">
                <Building2 className="w-7 h-7 text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-slate-400 font-medium">Toplam Müşteri</p>
                <p className="text-3xl font-black">{tenants.length}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-slate-800/50 border-white/5 text-white rounded-2xl">
            <CardContent className="flex items-center gap-4 p-6">
              <div className="w-14 h-14 rounded-2xl bg-green-500/20 flex items-center justify-center">
                <Power className="w-7 h-7 text-green-400" />
              </div>
              <div>
                <p className="text-sm text-slate-400 font-medium">Aktif Müşteri</p>
                <p className="text-3xl font-black">{activeTenants}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-slate-800/50 border-white/5 text-white rounded-2xl">
            <CardContent className="flex items-center gap-4 p-6">
              <div className="w-14 h-14 rounded-2xl bg-purple-500/20 flex items-center justify-center">
                <Users className="w-7 h-7 text-purple-400" />
              </div>
              <div>
                <p className="text-sm text-slate-400 font-medium">Toplam Öğrenci</p>
                <p className="text-3xl font-black">{totalStudents}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-slate-800/50 border-white/5 text-white rounded-2xl">
            <CardContent className="flex items-center gap-4 p-6">
              <div className="w-14 h-14 rounded-2xl bg-amber-500/20 flex items-center justify-center">
                <BarChart3 className="w-7 h-7 text-amber-400" />
              </div>
              <div>
                <p className="text-sm text-slate-400 font-medium">Aylık Gelir (Tahmini)</p>
                <p className="text-3xl font-black">₺{(activeTenants * 1750).toLocaleString("tr-TR")}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* MÜŞTERİ LİSTESİ */}
        <Card className="bg-slate-900/50 border-white/5 rounded-2xl overflow-hidden">
          <CardHeader className="border-b border-white/5 px-6 py-5">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <CardTitle className="text-white text-2xl font-extrabold">Müşteriler (Tenants)</CardTitle>
                <CardDescription className="text-slate-500">Tüm SaaS müşterilerini yönetin.</CardDescription>
              </div>
              <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
                <DialogTrigger render={
                  <Button className="bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 text-white font-bold rounded-xl h-12 px-6 shadow-lg shadow-red-500/20">
                    <Plus className="w-5 h-5 mr-2" />
                    Yeni Müşteri Ekle
                  </Button>
                } />
                <DialogContent className="sm:max-w-[500px] bg-slate-900 border-white/10 text-white">
                  <DialogHeader>
                    <DialogTitle className="text-2xl font-extrabold text-white">Yeni Müşteri / Lisans Tanımla</DialogTitle>
                  </DialogHeader>
                  <div className="grid gap-5 py-4">
                    <div className="grid gap-2">
                      <Label className="text-slate-300">İşletme Adı</Label>
                      <Input value={newTenant.name} onChange={(e) => setNewTenant({ ...newTenant, name: e.target.value })} placeholder="Örn: Güneş Etüt Merkezi" className="bg-slate-800 border-white/10 text-white h-12 rounded-xl" />
                    </div>
                    <div className="grid gap-2">
                      <Label className="text-slate-300">URL Slug (Benzersiz)</Label>
                      <Input value={newTenant.slug} onChange={(e) => setNewTenant({ ...newTenant, slug: e.target.value.toLowerCase().replace(/\s+/g, "-") })} placeholder="Örn: gunes-etut" className="bg-slate-800 border-white/10 text-white h-12 rounded-xl font-mono" />
                    </div>
                    <div className="grid gap-2">
                      <Label className="text-slate-300">İletişim E-postası</Label>
                      <Input type="email" value={newTenant.contactEmail} onChange={(e) => setNewTenant({ ...newTenant, contactEmail: e.target.value })} placeholder="admin@isletme.com" className="bg-slate-800 border-white/10 text-white h-12 rounded-xl" />
                    </div>
                    <div className="grid gap-2">
                      <Label className="text-slate-300">Başlangıç Paketi</Label>
                      <div className="flex gap-3">
                        <Button type="button" variant={newTenant.plan === "deneme" ? "default" : "outline"} className={`flex-1 h-12 rounded-xl font-bold ${newTenant.plan !== "deneme" ? "border-white/10 text-slate-300 hover:text-white" : ""}`} onClick={() => setNewTenant({ ...newTenant, plan: "deneme" })}>14 Gün Deneme</Button>
                        <Button type="button" variant={newTenant.plan === "standart" ? "default" : "outline"} className={`flex-1 h-12 rounded-xl font-bold ${newTenant.plan !== "standart" ? "border-white/10 text-slate-300 hover:text-white" : ""}`} onClick={() => setNewTenant({ ...newTenant, plan: "standart" })}>Standart</Button>
                        <Button type="button" variant={newTenant.plan === "profesyonel" ? "default" : "outline"} className={`flex-1 h-12 rounded-xl font-bold ${newTenant.plan !== "profesyonel" ? "border-white/10 text-slate-300 hover:text-white" : ""}`} onClick={() => setNewTenant({ ...newTenant, plan: "profesyonel" })}>Profesyonel</Button>
                      </div>
                    </div>
                    <Button onClick={handleAddTenant} className="w-full h-14 text-lg font-bold rounded-xl bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 mt-2">Lisansı Tanımla ve Ekle</Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            <div className="relative max-w-md">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <Input placeholder="İşletme adı veya slug ile ara..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10 bg-slate-800 border-white/10 text-white h-12 rounded-xl" />
            </div>

            <div className="overflow-x-auto rounded-xl border border-white/5">
              <Table>
                <TableHeader className="bg-slate-800/50">
                  <TableRow className="border-white/5 hover:bg-transparent">
                    <TableHead className="text-slate-400 font-bold">İşletme</TableHead>
                    <TableHead className="text-slate-400 font-bold">Paket</TableHead>
                    <TableHead className="text-slate-400 font-bold text-center">Öğrenci</TableHead>
                    <TableHead className="text-slate-400 font-bold text-center">Durum</TableHead>
                    <TableHead className="text-slate-400 font-bold text-right">İşlemler</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow className="border-white/5">
                      <TableCell colSpan={5} className="text-center py-12 text-slate-500">Yükleniyor...</TableCell>
                    </TableRow>
                  ) : filtered.length === 0 ? (
                    <TableRow className="border-white/5">
                      <TableCell colSpan={5} className="text-center py-12 text-slate-500">Henüz müşteri bulunmuyor.</TableCell>
                    </TableRow>
                  ) : (
                    filtered.map((tenant) => (
                      <TableRow key={tenant.id} className="border-white/5 hover:bg-white/5">
                        <TableCell>
                          <div>
                            <p className="font-bold text-white">{tenant.name}</p>
                            <p className="text-xs text-slate-500 font-mono">/{tenant.slug}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={tenant.plan_type === "profesyonel" ? "default" : tenant.plan_type === "standart" ? "secondary" : "outline"} className={`font-bold ${tenant.plan_type === "profesyonel" ? "bg-primary/20 text-primary" : tenant.plan_type === "deneme" ? "border-amber-500/50 text-amber-400" : "bg-slate-700 text-slate-300"}`}>
                            {tenant.plan_type === "deneme" ? "Deneme Sürümü" : tenant.plan_type === "standart" ? "Standart" : "Profesyonel"}
                          </Badge>
                          {tenant.plan_type === "deneme" && (
                            <p className="text-xs text-amber-500/80 mt-1 font-mono">
                              {tenant.trial_days_left} gün kaldı
                            </p>
                          )}
                        </TableCell>
                        <TableCell className="text-center font-bold text-white">{tenant.student_count}</TableCell>
                        <TableCell className="text-center">
                          <Badge className={`font-bold ${tenant.status === "active" ? "bg-green-500/20 text-green-400" : tenant.status === "trial_expired" ? "bg-amber-500/20 text-amber-400" : "bg-red-500/20 text-red-400"}`}>
                            {tenant.status === "active" ? "Aktif" : tenant.status === "trial_expired" ? "Süre Bitti" : "Pasif"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button variant="ghost" size="icon" className="text-blue-400 hover:text-blue-300 hover:bg-blue-500/10" onClick={() => handleImpersonate(tenant)} title="Giriş Yap">
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="text-amber-400 hover:text-amber-300 hover:bg-amber-500/10" onClick={() => setEditingTenant(tenant)} title="Düzenle">
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="text-red-400 hover:text-red-300 hover:bg-red-500/10" onClick={() => handleDeleteTenant(tenant.id, tenant.name)} title="Sil">
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* DÜZENLEME MODALI */}
        <Dialog open={!!editingTenant} onOpenChange={(open) => !open && setEditingTenant(null)}>
          <DialogContent className="sm:max-w-[400px] bg-slate-900 border-white/10 text-white">
            <DialogHeader>
              <DialogTitle className="text-xl font-extrabold text-white">İşletme Düzenle: {editingTenant?.name}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-5 py-4">
              <div className="grid gap-2">
                <Label className="text-slate-300">Abonelik Paketi</Label>
                <div className="flex flex-col gap-2">
                  <Button type="button" variant={editingTenant?.plan_type === "deneme" ? "default" : "outline"} className={`w-full justify-start ${editingTenant?.plan_type !== "deneme" ? "border-white/10 text-slate-300 hover:text-white" : ""}`} onClick={() => editingTenant && setEditingTenant({ ...editingTenant, plan_type: "deneme" })}>14 Gün Deneme</Button>
                  <Button type="button" variant={editingTenant?.plan_type === "standart" ? "default" : "outline"} className={`w-full justify-start ${editingTenant?.plan_type !== "standart" ? "border-white/10 text-slate-300 hover:text-white" : ""}`} onClick={() => editingTenant && setEditingTenant({ ...editingTenant, plan_type: "standart" })}>Standart</Button>
                  <Button type="button" variant={editingTenant?.plan_type === "profesyonel" ? "default" : "outline"} className={`w-full justify-start ${editingTenant?.plan_type !== "profesyonel" ? "border-white/10 text-slate-300 hover:text-white" : ""}`} onClick={() => editingTenant && setEditingTenant({ ...editingTenant, plan_type: "profesyonel" })}>Profesyonel</Button>
                </div>
              </div>
              <div className="grid gap-2">
                <Label className="text-slate-300">Hesap Durumu</Label>
                <div className="flex flex-col gap-2">
                  <Button type="button" variant={editingTenant?.status === "active" ? "default" : "outline"} className={`w-full justify-start bg-green-500 hover:bg-green-600 border-none ${editingTenant?.status !== "active" ? "bg-transparent border-white/10 text-slate-300" : "text-white"}`} onClick={() => editingTenant && setEditingTenant({ ...editingTenant, status: "active" })}>Aktif (Giriş Yapabilir)</Button>
                  <Button type="button" variant={editingTenant?.status === "suspended" ? "default" : "outline"} className={`w-full justify-start bg-red-500 hover:bg-red-600 border-none ${editingTenant?.status !== "suspended" ? "bg-transparent border-white/10 text-slate-300" : "text-white"}`} onClick={() => editingTenant && setEditingTenant({ ...editingTenant, status: "suspended" })}>Askıya Alındı (Giriş Yasak)</Button>
                </div>
              </div>
              <Button onClick={handleUpdateTenant} className="w-full h-12 mt-2 bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 font-bold rounded-xl text-white">Değişiklikleri Kaydet</Button>
            </div>
          </DialogContent>
        </Dialog>

      </main>
    </div>
  );
}
