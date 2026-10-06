"use client";

import { useEffect, useMemo, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { QrCode, Mail, Lock, ArrowRight, ShieldCheck, Eye, EyeOff } from "lucide-react";
import Link from "next/link";
import { createClient, getUserRole } from "@/lib/supabase";

function mapAuthErrorMessage(message?: string) {
  if (!message) return "Bilinmeyen hata";
  const lowerMessage = message.toLowerCase();
  if (lowerMessage.includes("email not confirmed")) return "E-posta adresiniz henüz doğrulanmamış. Lütfen e-postanızı onaylayın.";
  if (lowerMessage.includes("invalid login credentials")) return "E-posta veya şifre hatalı.";
  if (lowerMessage.includes("profile_lookup_failed")) return "Profiliniz okunamadı. Lütfen tekrar deneyin.";
  return message;
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  return undefined;
}

function mapCallbackError(errorParam: string | null) {
  if (!errorParam) return null;
  const messages: Record<string, string> = {
    no_code: "OAuth dönüşünde kod alınamadı.",
    auth_failed: "Google oturumu başlatılamadı. Tekrar deneyin.",
    profile_lookup_failed: "Profil kontrolü sırasında hata oluştu.",
  };
  return messages[errorParam] ?? "Giriş sırasında bir hata oluştu.";
}

function getSafeNextPath(nextPath: string | null) {
  if (!nextPath) return "/admin";
  if (!nextPath.startsWith("/") || nextPath.startsWith("//")) return "/admin";
  return nextPath;
}

function LoginContent() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = useMemo(() => createClient(), []);
  const nextPath = getSafeNextPath(searchParams.get("next"));

  useEffect(() => {
    const callbackError = mapCallbackError(searchParams.get("error"));
    if (callbackError) toast.error(callbackError);
    if (searchParams.get("message") === "check-email") {
      toast.info("E-posta adresinize doğrulama bağlantısı gönderildi. Lütfen kontrol edin.", { duration: 8000 });
    }
  }, [searchParams]);

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error("Lütfen e-posta ve şifre alanlarını doldurun.");
      return;
    }
    setIsLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      if (!data.user) throw new Error("Kullanıcı bulunamadı.");
      const { role, tenantId } = await getUserRole(data.user.id);
      if (!role || (!tenantId && role !== "super_admin")) { router.replace("/onboarding"); return; }
      if (role === "super_admin") { toast.success("Süper Admin olarak giriş yapıldı!"); router.replace("/super-admin"); return; }
      toast.success("İşletme yöneticisi olarak giriş yapıldı!");
      router.replace(nextPath);
    } catch (error: unknown) {
      toast.error(`Giriş başarısız: ${mapAuthErrorMessage(getErrorMessage(error))}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    try {
      const redirectUrl = new URL("/auth/callback", window.location.origin);
      redirectUrl.searchParams.set("next", nextPath);
      const { error } = await supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo: redirectUrl.toString() } });
      if (error) throw error;
    } catch (error: unknown) {
      toast.error(`Google ile giriş başarısız: ${mapAuthErrorMessage(getErrorMessage(error))}`);
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Sol Panel - Bilgi */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-slate-100 via-white to-slate-50 border-r relative items-center justify-center p-12">
        <div className="absolute inset-0 opacity-15">
          <div className="absolute top-[20%] left-[10%] w-72 h-72 bg-primary rounded-full blur-[100px]" />
          <div className="absolute bottom-[15%] right-[15%] w-64 h-64 bg-blue-500 rounded-full blur-[80px]" />
        </div>
        <div className="relative z-10 max-w-lg">
          <Link href="/" className="inline-flex items-center gap-3 mb-12 group">
            <div className="w-14 h-14 bg-primary rounded-2xl flex items-center justify-center text-slate-900 shadow-lg shadow-primary/30 group-hover:scale-105 transition-transform">
              <QrCode className="w-7 h-7" />
            </div>
            <span className="text-3xl font-extrabold text-slate-900 tracking-tight">OkulSonrası</span>
          </Link>
          <h1 className="text-4xl font-extrabold text-slate-900 leading-tight mb-6">
            İşletmenizi<br />
            <span className="text-primary">tek panelden</span> yönetin.
          </h1>
          <p className="text-slate-600 text-lg leading-relaxed mb-10">
            Öğrenci giriş-çıkışı, kantin POS, veli WhatsApp bildirimleri ve detaylı raporlar — hepsi tek ekranda.
          </p>
          <div className="space-y-4">
            {[
              "Kiosk ile anlık giriş-çıkış takibi",
              "Velilere otomatik WhatsApp bildirimi",
              "Kantin veresiye ve POS yönetimi"
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                  <ShieldCheck className="w-3.5 h-3.5 text-primary" />
                </div>
                <span className="text-slate-700 font-medium">{item}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Sağ Panel - Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12 bg-slate-50">
        <div className="w-full max-w-[440px]">
          {/* Mobilde Logo */}
          <div className="text-center mb-8 lg:hidden">
            <Link href="/" className="inline-flex items-center gap-3 mb-4 group">
              <div className="w-12 h-12 bg-primary rounded-2xl flex items-center justify-center text-slate-900 shadow-lg shadow-primary/30">
                <QrCode className="w-6 h-6" />
              </div>
              <span className="text-2xl font-extrabold text-slate-900 tracking-tight">OkulSonrası</span>
            </Link>
          </div>

          <div className="mb-8">
            <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">Hoş Geldiniz</h2>
            <p className="text-slate-500 mt-2 font-medium">Yönetim panelinize giriş yapın</p>
          </div>

          <div className="space-y-6">
            {/* Google */}
            <Button
              variant="outline"
              className="w-full h-13 text-base font-bold rounded-xl border-2 border-slate-200 hover:bg-white hover:border-slate-300 transition-all bg-white shadow-sm"
              onClick={handleGoogleLogin}
              disabled={isLoading}
            >
              <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Google ile Giriş Yap
            </Button>

            {/* Ayırıcı */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-slate-200"></span>
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-slate-50 px-4 text-slate-600 font-bold tracking-wider">veya e-posta ile</span>
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handleEmailLogin} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-semibold text-slate-700">E-posta Adresi</Label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="ornek@okulsonrasi.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10 h-12 rounded-xl text-base bg-white border-slate-200 focus:border-primary"
                    autoComplete="email"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="text-sm font-semibold text-slate-700">Şifre</Label>
                  <Link href="/forgot-password" className="text-sm font-semibold text-primary hover:text-primary/80 transition-colors">
                    Şifremi Unuttum
                  </Link>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 pr-10 h-12 rounded-xl text-base bg-white border-slate-200 focus:border-primary"
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-600 hover:text-slate-600 transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                className="w-full h-13 text-base font-bold rounded-xl shadow-lg shadow-primary/20"
                disabled={isLoading}
              >
                {isLoading ? "Giriş Yapılıyor..." : "Giriş Yap"}
                {!isLoading && <ArrowRight className="ml-2 w-5 h-5" />}
              </Button>
            </form>

            {/* Alt Bilgi */}
            <div className="flex items-center justify-center gap-2 text-sm text-slate-600">
              <ShieldCheck className="w-4 h-4 text-green-500" />
              <span>256-bit SSL ile güvende</span>
            </div>

            <div className="text-center pt-2">
              <p className="text-slate-500 text-sm">
                Hesabınız yok mu?{" "}
                <Link href="/register" className="text-primary font-bold hover:underline">
                  Ücretsiz Kayıt Olun
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-50 flex items-center justify-center text-slate-500">Yükleniyor...</div>}>
      <LoginContent />
    </Suspense>
  );
}

