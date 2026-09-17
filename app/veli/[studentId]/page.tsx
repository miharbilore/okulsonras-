import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, Clock, CreditCard } from "lucide-react";
import { unstable_cache } from "next/cache";
import { createClient } from "@supabase/supabase-js";
import { VeliClientView } from "@/components/veli/VeliClientView";

// Cache işlemi için yardımcı fonksiyon (30 saniye süreyle cacheler ve etiketler)
const getCachedStudentData = async (studentId: string) => {
  return unstable_cache(
    async () => {
      // Veritabanına doğrudan (ve hızlıca) erişmek için Service Role kullanıyoruz
      const supabaseAdmin = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );
      
      const { data: student, error: studentError } = await supabaseAdmin
        .from('students')
        .select('*, tenants(name, camera_stream_url, camera_stream_type)')
        .eq('id', studentId)
        .single();

      if (studentError || !student) throw new Error("Öğrenci bulunamadı");

      const { data: attendances } = await supabaseAdmin
        .from('attendances')
        .select('*')
        .eq('student_id', studentId)
        .order('created_at', { ascending: false })
        .limit(10);

      const { data: transactions } = await supabaseAdmin
        .from('transactions')
        .select('*')
        .eq('student_id', studentId)
        .order('created_at', { ascending: false })
        .limit(10);

      const isCurrentlyIn = attendances && attendances.length > 0 && attendances[0].check_in_type !== 'checkout';
      const weeklySpending = (transactions || []).reduce((acc: number, t: any) => acc + (t.total_amount || 0), 0);

      return {
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
      };
    },
    [`student-${studentId}`],
    {
      revalidate: 30, // 30 saniyede bir cache yenilenir
      tags: [`student-${studentId}`]
    }
  )();
};

export default async function ParentTrackingPage({ params }: { params: { studentId: string } }) {
  const { studentId } = params;

  let data;
  try {
    data = await getCachedStudentData(studentId);
  } catch (error) {
    return <div className="min-h-screen flex items-center justify-center bg-slate-50 text-red-500 font-bold">Öğrenci kaydı bulunamadı.</div>;
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:max-w-md md:mx-auto md:shadow-2xl md:border-x">
      {/* HEADER (Server Rendered) */}
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
        {/* İSTATİSTİK KARTLARI (Server Rendered) */}
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

        {/* INTERACTIVE CLIENT COMPONENTS (Live Camera, Tabs, Lists) */}
        <VeliClientView data={data} />
      </main>
    </div>
  );
}
