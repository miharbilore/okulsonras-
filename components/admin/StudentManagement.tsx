"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Search, UserPlus, CreditCard, RefreshCw, MessageCircle, Send, Loader2, Info, Printer } from "lucide-react";
import { toast } from "sonner";
import { StudentCard } from "./StudentCard";
import { createClient } from "@/lib/supabase";

export function StudentManagement() {
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedStudentForCard, setSelectedStudentForCard] = useState<any>(null);
  
  // Message Modal State
  const [selectedStudentForMessage, setSelectedStudentForMessage] = useState<any>(null);
  const [customMessage, setCustomMessage] = useState("");

  // New Student State
  const [newStudent, setNewStudent] = useState({
    fullName: "",
    parentName: "",
    parentPhone: "",
    weeklyLimit: 100,
    qrCodeId: "",
    pinCode: ""
  });

  const supabase = createClient();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    
    // Check if we are impersonating a tenant (from Super Admin)
    const impersonatedTenantId = localStorage.getItem("impersonate_tenant_id");
    let activeTenantId = impersonatedTenantId;

    if (!activeTenantId) {
      // Get actual user's tenant ID
      const { data: authData } = await supabase.auth.getUser();
      if (authData?.user) {
        const { data: profile } = await supabase.from('profiles').select('tenant_id').eq('user_id', authData.user.id).single();
        if (profile?.tenant_id) {
          activeTenantId = profile.tenant_id;
        }
      }
    }
    
    setTenantId(activeTenantId);

    if (!activeTenantId) {
       toast.error("Bağlı olduğunuz bir işletme bulunamadı. Lütfen sisteme tekrar giriş yapın.");
       setLoading(false);
       return;
    }

    if (activeTenantId) {
      // Sadece bu tenant'a ait öğrencileri çek (RLS kapalı olsa bile)
      const { data: studentData, error } = await supabase
        .from('students')
        .select('*')
        .eq('tenant_id', activeTenantId)
        .order('created_at', { ascending: false });

      if (!error && studentData) {
        setStudents(studentData);
      }
    }
    setLoading(false);
  };

  const generateCredentials = () => {
    setNewStudent(prev => ({
      ...prev,
      qrCodeId: "STU-" + Math.random().toString(36).substring(2, 8).toUpperCase(),
      pinCode: Math.floor(1000 + Math.random() * 9000).toString()
    }));
  };

  const handleAddStudent = async () => {
    if (!newStudent.fullName || !newStudent.qrCodeId) {
      toast.error("Lütfen tüm alanları ve giriş kodlarını doldurun.");
      return;
    }
    
    if (!tenantId) {
      toast.error("İşletme (Tenant) bulunamadı. Lütfen önce veritabanına bir işletme ekleyin.");
      return;
    }

    const studentToInsert = {
      tenant_id: tenantId,
      full_name: newStudent.fullName,
      parent_name: newStudent.parentName,
      parent_phone: newStudent.parentPhone,
      weekly_limit: newStudent.weeklyLimit,
      qr_code_id: newStudent.qrCodeId,
      pin_code: newStudent.pinCode
    };

    const { data, error } = await supabase.from('students').insert([studentToInsert]).select().single();

    if (error) {
      toast.error("Öğrenci eklenirken bir hata oluştu: " + error.message);
      return;
    }

    setStudents(prev => [data, ...prev]);
    setIsAddModalOpen(false);
    toast.success("Öğrenci başarıyla veritabanına eklendi.");
    setNewStudent({ fullName: "", parentName: "", parentPhone: "", weeklyLimit: 100, qrCodeId: "", pinCode: "" });
  };

  const handleSendMessage = async (text: string) => {
    if (!selectedStudentForMessage) return;
    const phone = selectedStudentForMessage.parent_phone || selectedStudentForMessage.parentPhone;
    if (!phone) {
      toast.error("Bu öğrencinin veli telefon numarası kayıtlı değil.");
      return;
    }
    toast.loading("Mesaj gönderiliyor...", { id: "msg" });
    try {
      const res = await fetch('/api/whatsapp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, message: text }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`${selectedStudentForMessage.parent_name || selectedStudentForMessage.parentName || 'Veli'}ye mesaj başarıyla iletildi!`, { id: "msg" });
      } else {
        toast.error(data.error || "Mesaj gönderilemedi.", { id: "msg" });
      }
    } catch {
      toast.error("Mesaj gönderilirken bir hata oluştu.", { id: "msg" });
    } finally {
      setSelectedStudentForMessage(null);
      setCustomMessage("");
    }
  };

  const filteredStudents = students.filter(s => 
    (s.full_name || s.fullName || "").toLowerCase().includes(searchTerm.toLowerCase()) || 
    (s.parent_phone || s.parentPhone || "").includes(searchTerm)
  );

  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) setSelectedIds(filteredStudents.map(s => s.id));
    else setSelectedIds([]);
  };

  const handleSelect = (id: string, checked: boolean) => {
    if (checked) setSelectedIds(prev => [...prev, id]);
    else setSelectedIds(prev => prev.filter(i => i !== id));
  };

  if (loading) {
    return <div className="flex items-center justify-center p-12 text-slate-400"><Loader2 className="w-8 h-8 animate-spin" /></div>;
  }

  return (
    <>
      {/* NORMAL EKRAN GÖRÜNÜMÜ */}
      <div className={`${selectedIds.length > 0 ? "print:hidden" : ""} space-y-6`}>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <h2 className="text-3xl font-bold tracking-tight">Öğrenciler</h2>
          
          <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
            <DialogTrigger render={
              <Button className="h-12 px-6 rounded-xl shadow-md">
                <UserPlus className="w-5 h-5 mr-2" />
                Yeni Öğrenci Ekle
              </Button>
            } />
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle className="text-2xl font-bold">Yeni Öğrenci Kaydı</DialogTitle>
              </DialogHeader>
              <div className="grid gap-6 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="fullName">Öğrenci Adı Soyadı</Label>
                  <Input id="fullName" value={newStudent.fullName} onChange={(e) => setNewStudent({...newStudent, fullName: e.target.value})} placeholder="Örn: Can Demir" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="parentName">Veli Adı Soyadı</Label>
                    <Input id="parentName" value={newStudent.parentName} onChange={(e) => setNewStudent({...newStudent, parentName: e.target.value})} placeholder="Örn: Ali Demir" />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="parentPhone">Veli Telefonu</Label>
                    <Input 
                      id="parentPhone" 
                      type="tel"
                      value={newStudent.parentPhone} 
                      onChange={(e) => {
                        const val = e.target.value.replace(/[^0-9]/g, '');
                        setNewStudent({...newStudent, parentPhone: val})
                      }} 
                      maxLength={11}
                      placeholder="0555..." 
                    />
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="limit">Haftalık Harcama Limiti (₺)</Label>
                  <Input id="limit" type="number" value={newStudent.weeklyLimit} onChange={(e) => setNewStudent({...newStudent, weeklyLimit: Number(e.target.value)})} />
                </div>
                
                <div className="p-4 bg-muted/50 rounded-xl border space-y-4">
                  <div className="flex items-center justify-between">
                    <Label className="font-semibold text-primary">Giriş Bilgileri (Kiosk)</Label>
                    <Button type="button" variant="outline" size="sm" onClick={generateCredentials}>
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Otomatik Üret
                    </Button>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label className="text-xs text-muted-foreground">QR Kodu (ID)</Label>
                      <Input readOnly value={newStudent.qrCodeId} className="bg-background font-mono" placeholder="Oluşturulmadı" />
                    </div>
                    <div className="grid gap-2">
                      <Label className="text-xs text-muted-foreground">4 Haneli PIN</Label>
                      <Input readOnly value={newStudent.pinCode} className="bg-background font-mono text-center tracking-widest font-bold" placeholder="----" />
                    </div>
                  </div>
                </div>

                <Button onClick={handleAddStudent} className="w-full h-12 text-lg font-bold">Kaydet</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="bg-blue-50 border border-blue-200 text-blue-900 rounded-xl p-5 flex gap-4 items-start shadow-sm">
          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center shrink-0">
            <Info className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h3 className="font-bold text-lg mb-1">Öğrenci Kayıt ve Dijital Kimlik Merkezi</h3>
            <p className="text-sm leading-relaxed text-blue-800/80">
              Burası işletmenizin <strong>Müşteri Veritabanıdır (CRM)</strong>. Öğrencilerinizi buraya kaydederek onlara sistemde sanal bir hesap açmış olursunuz.<br/>
              <span className="block mt-2 font-medium text-blue-900">
                👉 Buraya eklediğiniz her öğrenci için otomatik bir <strong>QR Kod ve PIN</strong> üretilir. Öğrenciler bu kodları kullanarak girişteki <strong>Kiosk cihazından</strong> yoklama yaparlar ve <strong>POS ekranında</strong> burada belirlediğiniz harcama limitleri dahilinde alışveriş yapabilirler.
              </span>
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="relative w-full sm:max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="İsim veya telefon ile ara..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          
          {selectedIds.length > 0 && (
            <Button onClick={() => window.print()} className="bg-primary text-white shadow-md w-full sm:w-auto">
              <Printer className="w-4 h-4 mr-2" />
              {selectedIds.length} Seçili Kartı Yazdır
            </Button>
          )}
        </div>

        <div className="border rounded-xl bg-card shadow-sm overflow-hidden">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead className="w-12 text-center">
                  <input 
                    type="checkbox" 
                    className="w-4 h-4 rounded border-slate-300 text-primary focus:ring-primary cursor-pointer accent-primary"
                    checked={selectedIds.length > 0 && selectedIds.length === filteredStudents.length}
                    onChange={handleSelectAll}
                  />
                </TableHead>
                <TableHead className="font-semibold">Öğrenci</TableHead>
                <TableHead className="font-semibold">Veli Bilgisi</TableHead>
                <TableHead className="font-semibold text-right">Haftalık Limit</TableHead>
                <TableHead className="font-semibold text-center">Giriş Bilgileri</TableHead>
                <TableHead className="text-right font-semibold">İşlemler</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredStudents.map((student) => (
                <TableRow key={student.id} className="hover:bg-muted/30">
                  <TableCell className="text-center">
                    <input 
                      type="checkbox"
                      className="w-4 h-4 rounded border-slate-300 text-primary focus:ring-primary cursor-pointer accent-primary"
                      checked={selectedIds.includes(student.id)}
                      onChange={(e) => handleSelect(student.id, e.target.checked)}
                    />
                  </TableCell>
                  <TableCell className="font-medium">{student.full_name || student.fullName}</TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span>{student.parent_name || student.parentName}</span>
                      <span className="text-sm text-muted-foreground">{student.parent_phone || student.parentPhone}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <Badge variant="secondary" className="font-bold text-sm">₺{student.weekly_limit || student.weeklyLimit}</Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant="outline" className="font-mono text-xs">{student.pin_code || student.pinCode}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      
                      {/* Veliye Özel Mesaj Dialog */}
                      <Dialog open={selectedStudentForMessage?.id === student.id} onOpenChange={(open) => {
                        if (!open) setSelectedStudentForMessage(null);
                      }}>
                        <DialogTrigger render={<Button variant="outline" size="sm" onClick={() => setSelectedStudentForMessage(student)} className="text-green-600 border-green-200 hover:bg-green-50" />}>
                          <MessageCircle className="w-4 h-4 mr-2" />
                          Veliye Mesaj
                        </DialogTrigger>
                        {selectedStudentForMessage && (
                          <DialogContent className="sm:max-w-[450px]">
                            <DialogHeader>
                              <DialogTitle className="text-xl font-bold flex items-center gap-2 text-green-700">
                                <MessageCircle className="w-5 h-5" />
                                {selectedStudentForMessage.full_name || selectedStudentForMessage.fullName} Velisine Mesaj
                              </DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4 py-4">
                              <Label>Hızlı Şablonlar</Label>
                              <div className="flex flex-wrap gap-2 mb-4">
                                <Badge className="cursor-pointer hover:bg-green-600 bg-green-500" onClick={() => setCustomMessage("Öğrencimiz bugün ödevlerini eksiksiz olarak bitirmiştir. Bilginize.")}>
                                  Ödevini Bitirdi
                                </Badge>
                                <Badge className="cursor-pointer hover:bg-orange-600 bg-orange-500" onClick={() => setCustomMessage("Öğrencimiz kurumumuzdan planlanandan erken ayrılmıştır.")}>
                                  Erken Ayrıldı
                                </Badge>
                                <Badge className="cursor-pointer hover:bg-blue-600 bg-blue-500" onClick={() => setCustomMessage("Öğrencimiz şu an arkadaşlarıyla etkinlik saatine katılmıştır.")}>
                                  Etkinlikte
                                </Badge>
                              </div>
                              <div className="space-y-2">
                                <Label>Özel Mesaj</Label>
                                <Textarea 
                                  placeholder="Mesajınızı buraya yazın..."
                                  className="min-h-[100px] resize-none"
                                  value={customMessage}
                                  onChange={(e) => setCustomMessage(e.target.value)}
                                />
                              </div>
                              <Button onClick={() => handleSendMessage(customMessage)} className="w-full bg-green-600 hover:bg-green-700" disabled={!customMessage}>
                                <Send className="w-4 h-4 mr-2" />
                                Gönder
                              </Button>
                            </div>
                          </DialogContent>
                        )}
                      </Dialog>
  
                      {/* QR Kart Dialog */}
                      <Dialog>
                        <DialogTrigger render={<Button variant="outline" size="sm" onClick={() => setSelectedStudentForCard(student)} />}>
                          <CreditCard className="w-4 h-4 mr-2" />
                          Kartı Gör
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[400px] flex justify-center p-12 bg-slate-50">
                          {selectedStudentForCard && <StudentCard student={selectedStudentForCard} />}
                        </DialogContent>
                      </Dialog>
  
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* SADECE YAZDIRIRKEN GÖRÜNEN BÖLÜM (TOPLU KARTLAR) */}
      {selectedIds.length > 0 && (
        <div className="hidden print:flex flex-wrap gap-4 items-start justify-start w-full">
          {students
            .filter(s => selectedIds.includes(s.id))
            .map(student => (
              <StudentCard key={student.id} student={student} hidePrintButton />
            ))}
        </div>
      )}
    </>
  );
}
