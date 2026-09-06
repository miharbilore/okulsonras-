"use client";

import { QRCodeSVG } from "qrcode.react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";

interface StudentCardProps {
  student: {
    fullName?: string;
    qrCodeId?: string;
    pinCode?: string;
    full_name?: string;
    qr_code_id?: string;
    pin_code?: string;
  };
  hidePrintButton?: boolean;
}

export function StudentCard({ student, hidePrintButton = false }: StudentCardProps) {
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="flex flex-col items-center gap-4">
      {/* 
        CR80 (Kredi Kartı / PVC Yaka Kartı) Boyutu Oranı: 
        Yaklaşık 54mm x 86mm. 
        Ekranda güzel görünmesi için css aspect-ratio ve ölçekleme kullanıyoruz.
        class="student-id-card" for batch print targeting.
      */}
      <Card className="student-id-card relative bg-white overflow-hidden shadow-xl rounded-xl border border-slate-200 flex flex-col items-center w-[54mm] h-[86mm] shrink-0 p-0">
        
        {/* Header */}
        <div className="w-full h-[22mm] bg-primary flex flex-col items-center justify-center rounded-b-3xl shrink-0 z-10 shadow-sm">
          <h2 className="text-primary-foreground font-black text-sm tracking-widest leading-none mt-1">
            OKULSONRASI
          </h2>
          <span className="text-[8px] text-primary-foreground/80 font-medium tracking-widest mt-0.5 uppercase">
            Öğrenci Kimliği
          </span>
        </div>

        {/* Avatar */}
        <div className="z-20 -mt-6 flex flex-col items-center">
          <div className="w-[16mm] h-[16mm] bg-slate-100 border-2 border-white rounded-full flex items-center justify-center shadow-sm">
            <span className="text-xl text-slate-400 font-bold">
              {(student.full_name || student.fullName || "A").charAt(0)}
            </span>
          </div>
          <h3 className="text-sm font-bold text-slate-800 leading-tight mt-1 text-center px-2 line-clamp-2 w-full">
            {student.full_name || student.fullName}
          </h3>
        </div>

        {/* QR KOD */}
        <div className="mt-auto mb-2 flex flex-col items-center w-full px-4">
          <div className="bg-white p-1.5 rounded-xl border border-slate-100 shadow-sm">
            <QRCodeSVG value={student.qr_code_id || student.qrCodeId || ""} size={70} level="M" />
          </div>
          <div className="mt-1 flex items-center justify-center gap-1.5 bg-slate-50 px-3 py-1 rounded-lg border border-slate-100">
            <span className="text-[10px] text-slate-500 font-medium">PIN:</span>
            <strong className="text-xs text-slate-900 tracking-widest font-bold">
              {student.pin_code || student.pinCode}
            </strong>
          </div>
        </div>

        <div className="w-full text-center pb-2 text-[7px] text-slate-400 font-medium bg-slate-50/50 pt-1 border-t border-slate-50 mt-auto">
          Geçiş Sistemleri & Kafe POS
        </div>
      </Card>

      {!hidePrintButton && (
        <div className="print:hidden w-full max-w-[54mm]">
          <Button onClick={handlePrint} className="w-full" variant="outline">
            <Printer className="w-4 h-4 mr-2" />
            Yazdır
          </Button>
        </div>
      )}
    </div>
  );
}
