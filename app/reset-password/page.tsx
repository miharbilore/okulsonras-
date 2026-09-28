"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Lock, ArrowRight, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import Link from "next/link";
import { createClient } from "@/lib/supabase";

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isVerifying, setIsVerifying] = useState(true);
  const [isSessionReady, setIsSessionReady] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  // Supabase şifre sıfırlama linki tıklandığında URL'e hash fragment olarak
  // token bilgisi eklenir. Supabase JS client bunu otomatik olarak algılar
  // ve onAuthStateChange üzerinden PASSWORD_RECOVERY event'i fırlatır.
  // Biz bu event'i dinleyerek session'ın hazır olduğunu doğruluyoruz.
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === "PASSWORD_RECOVERY" && session) {
          setIsSessionReady(true);
          setIsVerifying(false);
        } else if (event === "SIGNED_IN" && session) {
          // Bazı Supabase versiyonlarında PASSWORD_RECOVERY yerine 
          // doğrudan SIGNED_IN event'i gelir
          setIsSessionReady(true);
          setIsVerifying(false);
        }
      }
    );

    // 5 saniye içinde event gelmezse, session zaten var mı kontrol et
    const timeout = setTimeout(async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setIsSessionReady(true);
      }
      setIsVerifying(false);
    }, 5000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, []);

  const getPasswordStrength = (pw: string): { label: string; color: string; width: string } => {
    if (pw.length === 0) return { label: "", color: "bg-slate-200", width: "w-0" };
    if (pw.length < 6) return { label: "Çok Zayıf", color: "bg-red-500", width: "w-1/5" };
    if (pw.length < 8) return { label: "Zayıf", color: "bg-orange-500", width: "w-2/5" };
    const hasUpper = /[A-Z]/.test(pw);
    const hasNumber = /\d/.test(pw);
    const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(pw);
    const score = [hasUpper, hasNumber, hasSpecial].filter(Boolean).length;
    if (score >= 2 && pw.length >= 10) return { label: "Güçlü", color: "bg-green-500", width: "w-full" };
    if (score >= 1) return { label: "Orta", color: "bg-yellow-500", width: "w-3/5" };
    return { label: "Zayıf", color: "bg-orange-500", width: "w-2/5" };
  };

  const strength = getPasswordStrength(password);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!password || !confirmPassword) {
      toast.error("Lütfen tüm alanları doldurun.");
      return;
    }
    if (password !== confirmPassword) {
      toast.error("Şifreler eşleşmiyor. Lütfen kontrol edin.");
      return;
    }
    if (password.length < 6) {
      toast.error("Şifreniz en az 6 karakter olmalıdır.");
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });

      if (error) throw error;

      setIsSuccess(true);
      toast.success("Şifreniz başarıyla güncellendi!");

      setTimeout(() => {
        router.replace("/login");
      }, 3000);
    } catch (error: any) {
      const msg = error.message?.toLowerCase() || "";
      if (msg.includes("same_password") || msg.includes("same password")) {
        toast.error("Yeni şifreniz mevcut şifrenizle aynı olamaz.");
      } else if (msg.includes("weak_password") || msg.includes("weak password")) {
        toast.error("Şifreniz çok zayıf. Lütfen daha güçlü bir şifre seçin.");
      } else if (msg.includes("session") || msg.includes("not authenticated") || msg.includes("token")) {
        toast.error("Oturum süresi dolmuş. Lütfen tekrar şifre sıfırlama bağlantısı isteyin.");
      } else {
        toast.error("Güncelleme başarısız: " + (error.message || "Bilinmeyen hata"));
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Loading / Verifying state
  if (isVerifying) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-primary/30 flex items-center justify-center p-6">
        <Card className="rounded-3xl shadow-2xl border-white/10 bg-white/95 backdrop-blur-xl w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center py-16 space-y-4">
            <Loader2 className="w-10 h-10 animate-spin text-primary" />
            <p className="text-lg font-semibold text-slate-700">Bağlantınız doğrulanıyor...</p>
            <p className="text-sm text-slate-400">Lütfen bekleyin</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Invalid / expired token
  if (!isSessionReady) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-primary/30 flex items-center justify-center p-6">
        <Card className="rounded-3xl shadow-2xl border-white/10 bg-white/95 backdrop-blur-xl w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center py-16 space-y-4">
            <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center">
              <AlertCircle className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold text-slate-900">Bağlantı Geçersiz veya Süresi Dolmuş</h3>
            <p className="text-sm text-slate-500 text-center max-w-xs">
              Şifre sıfırlama bağlantınızın süresi dolmuş olabilir. Lütfen yeni bir bağlantı talep edin.
            </p>
            <Link href="/forgot-password">
              <Button className="mt-4">Yeni Bağlantı İste</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Success state
  if (isSuccess) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-primary/30 flex items-center justify-center p-6">
        <Card className="rounded-3xl shadow-2xl border-white/10 bg-white/95 backdrop-blur-xl w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center py-16 space-y-4">
            <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold text-slate-900">Şifreniz Güncellendi!</h3>
            <p className="text-sm text-slate-500">Yeni şifrenizle giriş ekranına yönlendiriliyorsunuz...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-primary/30 flex items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-full opacity-10">
        <div className="absolute top-[10%] left-[15%] w-96 h-96 bg-primary rounded-full blur-[120px]"></div>
        <div className="absolute bottom-[10%] right-[10%] w-80 h-80 bg-blue-500 rounded-full blur-[100px]"></div>
      </div>

      <div className="w-full max-w-md relative z-10">
        <Card className="rounded-3xl shadow-2xl border-white/10 bg-white/95 backdrop-blur-xl">
          <CardHeader className="text-center pb-2">
            <CardTitle className="text-2xl font-extrabold">Yeni Şifre Belirle</CardTitle>
            <CardDescription>Hesabınız için güçlü bir şifre belirleyin.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 px-8 pb-8 mt-4">
            <form onSubmit={handleUpdate} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password" className="font-semibold">Yeni Şifre</Label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 h-12 rounded-xl text-base"
                    disabled={isLoading}
                  />
                </div>
                {/* Şifre güç göstergesi */}
                {password.length > 0 && (
                  <div className="space-y-1 pt-1">
                    <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                      <div className={`h-full ${strength.color} ${strength.width} rounded-full transition-all duration-300`} />
                    </div>
                    <p className={`text-xs font-medium ${
                      strength.label === "Güçlü" ? "text-green-600" :
                      strength.label === "Orta" ? "text-yellow-600" : "text-red-600"
                    }`}>
                      Şifre Gücü: {strength.label}
                    </p>
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="font-semibold">Yeni Şifre (Tekrar)</Label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="pl-10 h-12 rounded-xl text-base"
                    disabled={isLoading}
                  />
                </div>
                {/* Şifre eşleşme göstergesi */}
                {confirmPassword.length > 0 && (
                  <p className={`text-xs font-medium ${
                    password === confirmPassword ? "text-green-600" : "text-red-500"
                  }`}>
                    {password === confirmPassword ? "✓ Şifreler eşleşiyor" : "✗ Şifreler eşleşmiyor"}
                  </p>
                )}
              </div>
              <Button
                type="submit"
                className="w-full h-14 text-lg font-bold rounded-xl shadow-md shadow-primary/20 mt-4"
                disabled={isLoading || password.length < 6 || password !== confirmPassword}
              >
                {isLoading ? "Güncelleniyor..." : "Şifreyi Güncelle"}
                {!isLoading && <ArrowRight className="ml-2 w-5 h-5" />}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
