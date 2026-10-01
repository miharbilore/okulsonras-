"use client";
import { DeviceGuard } from "@/components/DeviceGuard";

import { useState } from "react";
import { KioskScanner } from "@/components/kiosk/KioskScanner";
import { PinModal } from "@/components/kiosk/PinModal";
import { SuccessCard } from "@/components/kiosk/SuccessCard";
import { Button } from "@/components/ui/button";
import { Grid3x3, Loader2, XCircle } from "lucide-react";

import { createClient } from "@/lib/supabase";

type KioskState = 'IDLE' | 'LOADING' | 'SUCCESS_IN' | 'SUCCESS_OUT' | 'ERROR';

export default function KioskPage() {
  const [state, setState] = useState<KioskState>('IDLE');
  const [studentName, setStudentName] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isPinModalOpen, setIsPinModalOpen] = useState(false);
  
  const supabase = createClient();

  const handleVerify = async (code: string, type: 'qr' | 'pin') => {
    setState('LOADING');
    setIsPinModalOpen(false);

    try {
      // 1. Öğrenciyi qr_code_id veya pin_code ile sorgula
      const column = type === 'qr' ? 'qr_code_id' : 'pin_code';
      const { data: student, error: studentError } = await supabase
        .from('students')
        .select('id, full_name, tenant_id')
        .eq(column, code)
        .single();
        
      if (studentError || !student) {
        throw new Error("Geçersiz Kod: Sistemde böyle bir öğrenci bulunamadı.");
      }

      // API'ye gönder (DB Insert, Check-in/Check-out mantığı ve Bildirimler orada)
      const response = await fetch('/api/notify/checkin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentId: student.id, checkInType: type }),
      });
      
      const result = await response.json();
      
      if (!response.ok || !result.success) {
        throw new Error(result.error || "İşlem başarısız.");
      }

      // API'den dönen aksiyona göre işlem
      setStudentName(student.full_name);
      
      if (result.action === 'cooldown') {
        setErrorMessage("Zaten az önce giriş yaptınız! Çıkış için lütfen bekleyin.");
        setState('ERROR');
      } else if (result.action === 'out') {
        setState('SUCCESS_OUT');
      } else {
        setState('SUCCESS_IN');
      }
      
      // 3 Saniye Sonra Auto-Reset
      setTimeout(() => {
        resetKiosk();
      }, 3000);

    } catch (err: any) {
      setErrorMessage(err.message || "Bir hata oluştu.");
      setState('ERROR');
      
      setTimeout(() => {
        resetKiosk();
      }, 3000);
    }
  };

  const resetKiosk = () => {
    setState('IDLE');
    setStudentName("");
    setErrorMessage("");
    setIsPinModalOpen(false);
  };

  return (<DeviceGuard type="kiosk">
    <div className="min-h-screen bg-background flex items-center justify-center p-8 selection:bg-transparent overflow-hidden relative">
      {/* TEST / EXIT BUTTON */}
      <a href="/" className="absolute top-6 right-6 z-50 flex items-center gap-2 px-4 py-2 bg-white/50 hover:bg-white/90 backdrop-blur text-sm font-bold rounded-full shadow-sm transition-all text-slate-600 hover:text-red-600">
        <XCircle className="w-4 h-4" /> Çıkış
      </a>

      {/* BACKGROUND ELEMENTS (Kitap Kafe Teması / Modern Dark Mode Dokunuşları) */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
      <div className="absolute left-0 right-0 top-0 -z-10 m-auto h-[310px] w-[310px] rounded-full bg-primary opacity-20 blur-[100px]"></div>

      <div className="relative z-10 w-full max-w-7xl grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
        
        {/* SOL KOLON: TARAYICI VEYA DURUM KARTLARI */}
        <div className="flex flex-col items-center justify-center min-h-[600px]">
          {state === 'IDLE' && (
            <div className="w-full animate-in fade-in slide-in-from-bottom-8 duration-700">
              <div className="text-center mb-10">
                <h1 className="text-5xl font-extrabold mb-4 text-foreground tracking-tight">
                  OkulSonrası<span className="text-primary">.</span>
                </h1>
                <p className="text-2xl text-muted-foreground font-medium">
                  Giriş veya Çıkış yapmak için QR kodunuzu okutun
                </p>
              </div>
              
              <KioskScanner 
                isActive={state === 'IDLE' && !isPinModalOpen} 
                onScan={(qr) => handleVerify(qr, 'qr')} 
              />
            </div>
          )}

          {state === 'LOADING' && (
            <div className="flex flex-col items-center justify-center space-y-6 animate-in fade-in zoom-in duration-300">
              <Loader2 className="w-24 h-24 text-primary animate-spin" />
              <p className="text-3xl font-medium text-foreground">Doğrulanıyor...</p>
            </div>
          )}

          {state === 'SUCCESS_IN' && (
            <div className="w-full">
              <SuccessCard studentName={studentName} type="in" />
            </div>
          )}

          {state === 'SUCCESS_OUT' && (
            <div className="w-full">
              <SuccessCard studentName={studentName} type="out" />
            </div>
          )}

          {state === 'ERROR' && (
            <div className="flex flex-col items-center justify-center p-12 bg-destructive/10 rounded-3xl border-2 border-destructive animate-in shake duration-300 shadow-2xl">
              <XCircle className="w-32 h-32 text-destructive mb-6" />
              <h2 className="text-4xl font-bold text-foreground mb-4 text-center">İşlem Başarısız</h2>
              <p className="text-2xl text-destructive font-medium text-center">{errorMessage}</p>
            </div>
          )}
        </div>

        {/* SAĞ KOLON: PIN BUTONU */}
        <div className="flex flex-col justify-center items-center lg:items-start lg:pl-16 border-t-2 lg:border-t-0 lg:border-l-2 border-border pt-12 lg:pt-0">
          <div className="max-w-md w-full space-y-10">
            <div className="space-y-6">
              <h2 className="text-5xl font-bold text-foreground tracking-tight">QR Kodum Yok</h2>
              <p className="text-2xl text-muted-foreground leading-relaxed">
                Telefonunuz yanınızda değilse veya QR kodunuzu bulamıyorsanız, sistemde kayıtlı <strong className="text-foreground">4 haneli PIN kodunuz</strong> ile giriş yapabilirsiniz.
              </p>
            </div>

            <Button 
              size="lg" 
              className="w-full h-32 text-3xl font-semibold rounded-3xl shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all bg-primary text-primary-foreground"
              onClick={() => setIsPinModalOpen(true)}
              disabled={state !== 'IDLE'}
            >
              <Grid3x3 className="w-12 h-12 mr-6" />
              PIN ile Giriş Yap
            </Button>
          </div>
        </div>

      </div>

      <PinModal 
        isOpen={isPinModalOpen} 
        onClose={() => setIsPinModalOpen(false)} 
        onSubmit={(pin) => handleVerify(pin, 'pin')}
      />
    </div></DeviceGuard>);}


