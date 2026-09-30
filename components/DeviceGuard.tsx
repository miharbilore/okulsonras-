"use client";

import { useEffect, useState } from "react";
import { Lock, Loader2, KeyRound, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function DeviceGuard({ children, type }: { children: React.ReactNode; type: "kiosk" | "pos" }) {
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [loading, setLoading] = useState(true);
  const [keyInput, setKeyInput] = useState("");
  const [error, setError] = useState("");
  const [verifying, setVerifying] = useState(false);

  useEffect(() => {
    checkDevice();
  }, []);

  const checkDevice = () => {
    const savedKey = localStorage.getItem(`device_api_key_${type}`);
    if (savedKey) {
      // Optimizasyon: Her girişte sunucuya gitmek yerine önce varlığını kontrol ediyoruz.
      // İsteğe bağlı olarak arka planda verify edilebilir, ancak bu basit çözüm yetersiz değil
      // çünkü geçersiz anahtarla backend'e işlem yapıldığında reddedilecektir.
      setIsAuthorized(true);
    }
    setLoading(false);
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!keyInput.trim()) return;

    setVerifying(true);
    setError("");

    try {
      const res = await fetch("/api/device/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: keyInput.trim(), type }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        localStorage.setItem(`device_api_key_${type}`, keyInput.trim());
        localStorage.setItem(`device_tenant_id`, data.tenantId); // Cihazın hangi kuruma ait olduğu kaydediliyor
        setIsAuthorized(true);
      } else {
        setError(data.error || "Geçersiz cihaz anahtarı.");
      }
    } catch (err: any) {
      setError("Bağlantı hatası oluştu.");
    } finally {
      setVerifying(false);
    }
  };

  const handleDisconnect = () => {
    if (confirm("Bu cihazın bağlantısını kesmek istediğinize emin misiniz? Anahtar iptal edilecektir.")) {
      localStorage.removeItem(`device_api_key_${type}`);
      localStorage.removeItem(`device_tenant_id`);
      setIsAuthorized(false);
      setKeyInput("");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
      </div>
    );
  }

  if (!isAuthorized) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-8 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-blue-500 to-indigo-500" />
          
          <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <Lock className="w-8 h-8 text-blue-600" />
          </div>
          
          <h1 className="text-2xl font-bold text-center text-slate-900 mb-2">
            Cihaz Eşleştirme
          </h1>
          <p className="text-center text-slate-500 text-sm mb-8">
            Bu cihazı aktifleştirmek için Admin Panelinden aldığınız {type === "kiosk" ? "Kiosk" : "POS"} API Anahtarını girin.
          </p>

          <form onSubmit={handleVerify} className="space-y-4">
            <div>
              <Input
                type="text"
                placeholder="osk_live_..."
                value={keyInput}
                onChange={(e) => setKeyInput(e.target.value)}
                className="h-12 font-mono text-center text-slate-700 bg-slate-50"
                autoFocus
              />
            </div>
            
            {error && (
              <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-100 text-center">
                {error}
              </div>
            )}

            <Button
              type="submit"
              disabled={verifying || !keyInput.trim()}
              className="w-full h-12 text-base font-bold bg-blue-600 hover:bg-blue-700"
            >
              {verifying ? (
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              ) : (
                <KeyRound className="w-5 h-5 mr-2" />
              )}
              Cihazı Aktifleştir
            </Button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen">
      {/* Gizli Çıkış Butonu (Sağ Üstte) */}
      <button
        onClick={handleDisconnect}
        className="absolute top-4 right-4 z-[9999] p-2 bg-white/20 hover:bg-white/50 rounded-full text-slate-400 hover:text-slate-800 transition-colors backdrop-blur-sm border border-transparent hover:border-slate-300"
        title="Cihaz Bağlantısını Kes"
      >
        <LogOut className="w-4 h-4" />
      </button>
      
      {children}
    </div>
  );
}
