"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LogIn, Coffee } from "lucide-react";
import { LiveCameraModal } from "@/components/veli/LiveCameraModal";

interface VeliClientViewProps {
  data: any;
}

export function VeliClientView({ data }: VeliClientViewProps) {
  return (
    <>
      <div className="mb-8">
        <LiveCameraModal 
          isCheckedIn={data.status === "Şu an mekanda"}
          streamType={data.cameraStreamType || "none"}
          streamUrl={data.cameraStreamUrl || ""}
        />
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
    </>
  );
}
