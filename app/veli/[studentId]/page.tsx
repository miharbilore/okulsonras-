"use client";

import { useParams } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { MapPin, Clock, CreditCard, Coffee, LogIn, ChevronLeft } from "lucide-react";
import Link from "next/link";
import { LiveCameraModal } from "@/components/veli/LiveCameraModal";
import { useState, useEffect } from "react";

export default function ParentTrackingPage() {
  const params = useParams();
  const studentId = params.studentId as string;
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadStudentData() {
      const { createClient } = await import("@/lib/supabase");
      const supabase = createClient();
      
      try {
        const { data: student, error: studentError } = await supabase
          .from('students')
          .select('*, tenants(name, camera_stream_url, camera_stream_type)')
          .eq('id', studentId)
          .single();

        if (studentError || !student) throw new Error("Öğrenci bulunamadı");

        const { data: attendances } = await supabase
          .from('attendances')
          .select('*')
          .eq('student_id', studentId)
          .order('created_at', { ascending: false })
          .limit(10);

        const { data: transactions } = await supabase
          .from('transactions')
          .select('*')
          .eq('student_id', studentId)
          .order('created_at', { ascending: false })
          .limit(10);

        const isCurrentlyIn = attendances && attendances.length > 0 && attendances[0].check_in_type !== 'checkout';
        
        // Calculate weekly spending simply from recent transactions
        const weeklySpending = (transactions || []).reduce((acc: number, t: any) => acc + (t.total_amount || 0), 0);

        setData({
          id: student.id,
          fullName: student.full_name,
          status: isCurrentlyIn ? "Şu an mekanda" : "Mekanda değil",
          tenantName: student.tenants?.name || "Kayıtlı İşletme",
          cameraStreamUrl: student.tenants?.camera_stream_url || null,
          cameraStreamType: student.tenants?.camera_stream_type || 'none',
          checkInTime: attendances?.[0] ? new Date(attendances[0].created_at).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }) : "-",
          weeklySpending: weeklySpending,
          weeklyLimit: student.weekly_limit || 0,
          attendances: attendances?.map((a: any) => ({
            id: a.id,
            date: new Date(a.created_at).toLocaleDateString('tr-TR'),
            time: new Date(a.created_at).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }),
            type: a.check_in_type?.toUpperCase(),
            action: a.check_in_type === 'checkout' ? 'Çıkış' : 'Giriş'
          })) || [],
          transactions: transactions?.map((t: any) => ({
            id: t.id,
            date: new Date(t.created_at).toLocaleDateString('tr-TR') + " " + new Date(t.created_at).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }),
            items: (t.items || []).map((i:any) => i.name).join(" + "),
            amount: t.total_amount
          })) || []
        });
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadStudentData();
  }, [studentId]);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-slate-50">Yükleniyor...</div>;
  }

  if (!data) {
    return <div className="min-h-screen flex items-center justify-center bg-slate-50 text-red-500 font-bold">Öğrenci kaydı bulunamadı.</div>;
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:max-w-md md:mx-auto md:shadow-2xl md:border-x">
      {/* HEADER */}
      <header className="bg-primary px-6 pt-12 pb-6 rounded-b-[2.5rem] shadow-lg sticky top-0 z-10">
        <div className="flex items-center justify-between text-primary-foreground mb-6">
          <h1 className="font-bold text-lg tracking-wide">CANLI TAKİP</h1>
          <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
            <span className="font-extrabold">{data.fullName.charAt(0)}</span>
          </div>
        </div>
        
        <div className="bg-white rounded-3xl p-5 shadow-xl transform translate-y-2">
          <h2 className="text-2xl font-extrabold text-slate-800">{data.fullName}</h2>
          
          <div className="mt-4 flex items-center gap-2 text-sm text-slate-600 font-medium">
            <MapPin className="w-4 h-4 text-primary" />
            <span>{data.tenantName}</span>
          </div>
          
          <div className="mt-4 flex items-center justify-between">
            <Badge className="bg-green-100 text-green-700 hover:bg-green-100 border-none px-3 py-1 font-bold">
              <span className="w-2 h-2 rounded-full bg-green-500 mr-2 animate-pulse"></span>
              {data.status}
            </Badge>
            <span className="text-sm font-semibold text-slate-400">ID: {data.id.substring(0,6).toUpperCase()}</span>
          </div>
        </div>
      </header>

      <main className="flex-1 px-6 pt-8 pb-10">
        <div className="mb-8">
          <LiveCameraModal 
            isCheckedIn={data.status === "Şu an mekanda"}
            streamType={data.cameraStreamType || "none"}
            streamUrl={data.cameraStreamUrl || ""}
          />
        </div>

        {/* İSTATİSTİK KARTLARI */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          <Card className="border-none shadow-sm bg-blue-50/50">
            <CardContent className="p-4 flex flex-col items-center text-center">
              <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center mb-2">
                <Clock className="w-5 h-5" />
              </div>
              <span className="text-xs text-slate-500 font-semibold mb-1">GİRİŞ SAATİ</span>
              <span className="text-xl font-black text-slate-800">{data.checkInTime}</span>
            </CardContent>
          </Card>
          
          <Card className="border-none shadow-sm bg-orange-50/50">
            <CardContent className="p-4 flex flex-col items-center text-center">
              <div className="w-10 h-10 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center mb-2">
                <CreditCard className="w-5 h-5" />
              </div>
              <span className="text-xs text-slate-500 font-semibold mb-1">KALAN LİMİT</span>
              <span className="text-xl font-black text-slate-800">₺{(data.weeklyLimit - data.weeklySpending).toFixed(2)}</span>
            </CardContent>
          </Card>
        </div>

        {/* TABS: GİRİŞLER & HARCAMALAR */}
        <Tabs defaultValue="attendances" className="w-full">
          <TabsList className="grid w-full grid-cols-2 h-14 bg-slate-200/50 rounded-xl mb-6 p-1">
            <TabsTrigger value="attendances" className="rounded-lg font-bold data-[state=active]:bg-white data-[state=active]:shadow-sm">
              <LogIn className="w-4 h-4 mr-2" />
              Giriş/Çıkış
            </TabsTrigger>
            <TabsTrigger value="purchases" className="rounded-lg font-bold data-[state=active]:bg-white data-[state=active]:shadow-sm">
              <Coffee className="w-4 h-4 mr-2" />
              Harcamalar
            </TabsTrigger>
          </TabsList>

          <TabsContent value="attendances" className="space-y-4 focus-visible:outline-none mt-0">
            {data.attendances.map((att: any) => (
              <div key={att.id} className="flex items-center justify-between p-4 bg-white rounded-2xl shadow-sm border border-slate-100">
                <div>
                  <h4 className="font-bold text-slate-800">{att.action} İşlemi</h4>
                  <p className="text-xs text-slate-500 font-medium mt-1">{att.date} • {att.type}</p>
                </div>
                <div className="text-lg font-black text-slate-700 bg-slate-50 px-3 py-1 rounded-lg">
                  {att.time}
                </div>
              </div>
            ))}
          </TabsContent>

          <TabsContent value="purchases" className="space-y-4 focus-visible:outline-none mt-0">
            {/* Toplam Harcama Özeti */}
            <div className="flex justify-between items-center p-4 bg-primary/5 rounded-2xl border border-primary/10 mb-4">
              <span className="font-semibold text-primary">Bu Haftaki Toplam</span>
              <span className="text-xl font-black text-primary">₺{data.weeklySpending.toFixed(2)}</span>
            </div>

            {data.transactions.map((trx: any) => (
              <div key={trx.id} className="flex items-center justify-between p-4 bg-white rounded-2xl shadow-sm border border-slate-100">
                <div>
                  <h4 className="font-bold text-slate-800">{trx.items}</h4>
                  <p className="text-xs text-slate-500 font-medium mt-1">{trx.date}</p>
                </div>
                <div className="text-lg font-black text-slate-700">
                  ₺{trx.amount.toFixed(2)}
                </div>
              </div>
            ))}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
