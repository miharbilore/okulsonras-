"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import Link from "next/link";
import {
  Shield, Users, Building2, Plus, Eye, Power,
  Search, LogOut, BarChart3, Settings2, Pencil, Trash2,
  TrendingUp, CreditCard, PlayCircle, StopCircle
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

  useEffect(() => {
    fetchTenants();
  }, []);

  async function fetchTenants() {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("tenants")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      const tenantsWithCounts = await Promise.all(
        (data || []).map(async (tenant: any) => {
          const { count } = await supabase
            .from("students")
            .select("*", { count: "exact", head: true })
            .eq("tenant_id", tenant.id);

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
      toast.error("Müşteri listesi yüklenemedi: " + err.message);
    } finally {
      setIsLoading(false);
    }
  }

  // Dashboard Metrics
  const activeTenants = tenants.filter((t) => t.status === "active").length;
  const totalStudents = tenants.reduce((acc, t) => acc + (t.student_count || 0), 0);
  
  // Calculate MRR (Monthly Recurring Revenue) roughly based on plans
  const mrr = tenants.reduce((acc, t) => {
    if (t.status !== "active") return acc;
    if (t.plan_type === "standard") return acc + 499;
    if (t.plan_type === "professional") return acc + 999;
    if (t.plan_type === "enterprise") return acc + 2499;
    return acc;
  }, 0);

  const handleAddTenant = async () => {
    if (!newTenant.name || !newTenant.slug) {
      toast.error("Lütfen işletme adı ve slug alanlarını doldurun.");
      return;
    }
    try {
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
      toast.success(`"${data.name}" başarıyla eklendi.`);
    } catch (err: any) {
      toast.error("Müşteri eklenemedi: " + err.message);
    }
  };

  const handleToggleStatus = async (tenant: Tenant) => {
    const newStatus = tenant.status === "active" ? "suspended" : "active";
    const actionWord = newStatus === "suspended" ? "askıya almak" : "aktifleştirmek";
    
    if (!confirm(`DİKKAT: "${tenant.name}" adlı işletmeyi ${actionWord} istediğinize emin misiniz?`)) return;

    try {
      const { error } = await supabase
        .from("tenants")
        .update({ status: newStatus })
        .eq("id", tenant.id);

      if (error) throw error;

      setTenants((prev) =>
        prev.map((t) => (t.id === tenant.id ? { ...t, status: newStatus } : t))
      );
      toast.success(`İşletme ${newStatus === "suspended" ? "askıya alındı" : "aktifleştirildi"}.`);
    } catch (err: any) {
      toast.error("İşlem başarısız: " + err.message);
    }
  };

  const handleImpersonate = async (tenant: Tenant) => {
    toast.loading(`"${tenant.name}" paneline giriş yapılıyor...`, { id: "imp" });
    try {
      const res = await fetch("/api/super-admin/impersonate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tenantId: tenant.id, tenantName: tenant.name }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Geçiş yapılamadı.");
      toast.success(`Yönlendiriliyorsunuz.`, { id: "imp" });
      setTimeout(() => { window.location.href = "/admin"; }, 800);
    } catch (err: any) {
      toast.error("Hata: " + err.message, { id: "imp" });
    }
  };

  const filteredTenants = tenants.filter(t => t.name.toLowerCase().includes(searchTerm.toLowerCase()));
  const suspendedTenants = filteredTenants.filter(t => t.status === "suspended");
  const trialTenants = filteredTenants.filter(t => t.plan_type === "deneme");

  const renderTable = (dataList: Tenant[]) => (
    <div className="rounded-xl border bg-white overflow-hidden shadow-sm">
      <Table>
        <TableHeader className="bg-slate-50/80">
          <TableRow>
            <TableHead className="font-semibold text-slate-600">İşletme Adı</TableHead>
            <TableHead className="font-semibold text-slate-600">Öğrenci</TableHead>
            <TableHead className="font-semibold text-slate-600">Durum</TableHead>
            <TableHead className="font-semibold text-slate-600">Plan</TableHead>
            <TableHead className="font-semibold text-slate-600 text-right">Aksiyonlar</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {dataList.length === 0 && (
            <TableRow>
              <TableCell colSpan={5} className="text-center py-8 text-slate-500">
                Hiç kayıt bulunamadı.
              </TableCell>
            </TableRow>
          )}
          {dataList.map((tenant) => (
            <TableRow key={tenant.id} className="hover:bg-slate-50/50 transition-colors">
              <TableCell>
                <div className="font-bold text-slate-900">{tenant.name}</div>
                <div className="text-xs text-slate-500 font-mono mt-0.5">/{tenant.slug}</div>
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-1.5 text-slate-700 font-medium">
                  <Users className="w-4 h-4 text-slate-400" />
                  {tenant.student_count}
                </div>
              </TableCell>
              <TableCell>
                <Badge variant="outline" className={`font-semibold ${
                  tenant.status === 'active' ? 'border-green-200 text-green-700 bg-green-50' :
                  tenant.status === 'suspended' ? 'border-red-200 text-red-700 bg-red-50' : 'border-slate-200'
                }`}>
                  {tenant.status === 'active' ? 'Aktif' : 'Askıda'}
                </Badge>
              </TableCell>
              <TableCell>
                <div className="flex flex-col gap-1 items-start">
                  <Badge className="bg-slate-800 text-white hover:bg-slate-700 shadow-sm capitalize">
                    {tenant.plan_type}
                  </Badge>
                  {tenant.plan_type === 'deneme' && (
                    <span className="text-[10px] font-bold text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded-sm">
                      {tenant.trial_days_left} gün kaldı
                    </span>
                  )}
                </div>
              </TableCell>
              <TableCell className="text-right">
                <div className="flex items-center justify-end gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleImpersonate(tenant)}
                    className="h-8 border-slate-200 hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-200 transition-colors shadow-sm"
                    title="Müşteri Gözünden Gör"
                  >
                    <Eye className="w-3.5 h-3.5 mr-1.5" /> Sız
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleToggleStatus(tenant)}
                    className={`h-8 transition-colors shadow-sm ${
                      tenant.status === "active" 
                        ? "border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300"
                        : "border-green-200 text-green-600 hover:bg-green-50 hover:border-green-300"
                    }`}
                    title={tenant.status === "active" ? "İşletmeyi Askıya Al" : "İşletmeyi Aktifleştir"}
                  >
                    {tenant.status === "active" ? <StopCircle className="w-3.5 h-3.5" /> : <PlayCircle className="w-3.5 h-3.5" />}
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-md shadow-indigo-200">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-lg font-extrabold text-slate-900 leading-none">Süper Admin</h1>
              <p className="text-xs font-semibold text-slate-500 mt-0.5">SaaS Yönetim Merkezi</p>
            </div>
          </div>
          <Link href="/">
            <Button variant="ghost" className="text-slate-500 hover:text-slate-900 font-semibold">
              <LogOut className="w-4 h-4 mr-2" /> Çıkış
            </Button>
          </Link>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        
        {/* Metrikler (Pro Dashboard) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="bg-white border-slate-200 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-1">Aylık Gelir (MRR)</p>
                  <h3 className="text-3xl font-black text-slate-900">₺{mrr.toLocaleString('tr-TR')}</h3>
                </div>
                <div className="w-12 h-12 bg-green-100 rounded-2xl flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white border-slate-200 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-1">Aktif İşletmeler</p>
                  <h3 className="text-3xl font-black text-slate-900">{activeTenants} <span className="text-lg text-slate-400 font-medium">/{tenants.length}</span></h3>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-2xl flex items-center justify-center">
                  <Building2 className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white border-slate-200 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-1">Sistemdeki Öğrenciler</p>
                  <h3 className="text-3xl font-black text-slate-900">{totalStudents.toLocaleString('tr-TR')}</h3>
                </div>
                <div className="w-12 h-12 bg-purple-100 rounded-2xl flex items-center justify-center">
                  <Users className="w-6 h-6 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Araç Çubuğu */}
        <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
          <div className="relative w-full sm:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <Input
              placeholder="İşletme adı ile ara..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 h-12 rounded-xl border-slate-200 shadow-sm bg-white focus-visible:ring-indigo-500"
            />
          </div>

          <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
            <DialogTrigger asChild>
              <Button className="h-12 px-6 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-md shadow-indigo-200 transition-all w-full sm:w-auto">
                <Plus className="w-5 h-5 mr-2" /> Yeni İşletme
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle className="text-xl font-bold">Yeni Müşteri Ekle</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>İşletme Adı</Label>
                  <Input
                    placeholder="Örn: Yıldız Etüt Merkezi"
                    value={newTenant.name}
                    onChange={(e) => setNewTenant({ ...newTenant, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Sistem Slug (URL için benzersiz)</Label>
                  <Input
                    placeholder="yildiz-etut"
                    value={newTenant.slug}
                    onChange={(e) => setNewTenant({ ...newTenant, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Abonelik Planı</Label>
                  <Select
                    value={newTenant.plan}
                    onValueChange={(val) => setNewTenant({ ...newTenant, plan: val })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Plan Seçin" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="deneme">14 Günlük Deneme</SelectItem>
                      <SelectItem value="standard">Standart</SelectItem>
                      <SelectItem value="professional">Profesyonel</SelectItem>
                      <SelectItem value="enterprise">Kurumsal</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={handleAddTenant} className="w-full bg-indigo-600 hover:bg-indigo-700">
                  Oluştur ve Kaydet
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Sekmeler ve Tablolar */}
        <Tabs defaultValue="all" className="w-full">
          <TabsList className="bg-white border border-slate-200 p-1 rounded-xl shadow-sm mb-6 inline-flex h-12">
            <TabsTrigger value="all" className="rounded-lg px-6 font-semibold data-[state=active]:bg-indigo-50 data-[state=active]:text-indigo-700">Tümü</TabsTrigger>
            <TabsTrigger value="trials" className="rounded-lg px-6 font-semibold data-[state=active]:bg-orange-50 data-[state=active]:text-orange-700">Deneme Sürümündekiler</TabsTrigger>
            <TabsTrigger value="suspended" className="rounded-lg px-6 font-semibold data-[state=active]:bg-red-50 data-[state=active]:text-red-700">Askıya Alınanlar</TabsTrigger>
          </TabsList>
          
          <TabsContent value="all" className="mt-0">
            {isLoading ? <div className="p-8 text-center text-slate-500 font-medium">Yükleniyor...</div> : renderTable(filteredTenants)}
          </TabsContent>
          <TabsContent value="trials" className="mt-0">
            {renderTable(trialTenants)}
          </TabsContent>
          <TabsContent value="suspended" className="mt-0">
            {renderTable(suspendedTenants)}
          </TabsContent>
        </Tabs>
        
      </main>
    </div>
  );
}
