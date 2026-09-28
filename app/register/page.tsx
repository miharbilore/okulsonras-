"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { QrCode, Mail, Lock, ArrowRight, User, Eye, EyeOff, Sparkles, CheckCircle2, Clock } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";

function mapAuthErrorMessage(message?: string) {
  if (!message) return "Bilinmeyen hata";
  const lowerMessage = message.toLowerCase();
  if (lowerMessage.includes("user already registered")) return "Bu e-posta ile zaten bir hesap var. Giriş yapmayı deneyin.";
  if (lowerMessage.includes("password should be at least")) return "Şifreniz en az 6 karakter olmalıdır.";
  return message;
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  return undefined;
}

export default function RegisterPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || !name) { toast.error("Lütfen tüm alanları doldurun."); return; }
    if (password.length < 6) { toast.error("Şifreniz en az 6 karakter olmalıdır."); return; }

    setIsLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email, password,
        options: { data: { full_name: name, role: "tenant_admin" } },
      });
      if (error) throw error;
      if (data.session) {
        toast.success("Hesabınız oluşturuldu! İşletmenizi kurmaya başlayın.");
        router.replace("/onboarding");
      } else {
        toast.success("Hesabınız oluşturuldu! E-posta kutunuzu kontrol edin.", { duration: 8000 });
        setTimeout(() => router.replace("/login?message=check-email"), 3000);
      }
    } catch (error: unknown) {
      toast.error(`Kayıt başarısız: ${mapAuthErrorMessage(getErrorMessage(error))}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignup = async () => {
    setIsLoading(true);
    try {
      const redirectUrl = new URL("/auth/callback", window.location.origin);
      redirectUrl.searchParams.set("next", "/onboarding");
      const { error } = await supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo: redirectUrl.toString() } });
      if (error) throw error;
    } catch (error: unknown) {
      toast.error(`Google ile kayıt başarısız: ${mapAuthErrorMessage(getErrorMessage(error))}`);
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Sol Panel - Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12 bg-white">
        <div className="w-full max-w-[440px]">
          {/* Mobilde Logo */}
          <div className="text-center mb-8 lg:hidden">
            <Link href="/" className="inline-flex items-center gap-3 mb-4 group">
              <div className="w-12 h-12 bg-primary rounded-2xl flex items-center justify-center text-white shadow-lg shadow-primary/30">
                <QrCode className="w-6 h-6" />
              </div>
              <span className="text-2xl font-extrabold text-slate-900 tracking-tight">OkulSonrası</span>
            </Link>
          </div>

          <div className="mb-8">
            <div className="inline-flex items-center gap-2 bg-primary/10 text-primary text-sm font-bold px-3 py-1.5 rounded-full mb-4">
              <Sparkles className="w-3.5 h-3.5" />
              14 Gün Ücretsiz
            </div>
            <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">Hesap Oluşturun</h2>
            <p className="text-slate-500 mt-2 font-medium">Dakikalar içinde sisteminizi kurun</p>
          </div>

          <div className="space-y-6">
            {/* Google */}
            <Button
              variant="outline"
              className="w-full h-13 text-base font-bold rounded-xl border-2 border-slate-200 hover:bg-slate-50 hover:border-slate-300 transition-all bg-white shadow-sm"
              onClick={handleGoogleSignup}
              disabled={isLoading}
            >
              <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Google ile Hızlı Kayıt
            </Button>

            {/* Ayırıcı */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-slate-200" /></div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-4 text-slate-400 font-bold tracking-wider">veya e-posta ile</span>
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handleRegister} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-sm font-semibold text-slate-700">Adınız Soyadınız</Label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input id="name" placeholder="Örn: Ahmet Yılmaz" value={name} onChange={(e) => setName(e.target.value)}
                    className="pl-10 h-12 rounded-xl text-base border-slate-200 focus:border-primary" autoComplete="name" />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-semibold text-slate-700">E-posta Adresi</Label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input id="email" type="email" placeholder="ornek@kurum.com" value={email} onChange={(e) => setEmail(e.target.value)}
                    className="pl-10 h-12 rounded-xl text-base border-slate-200 focus:border-primary" autoComplete="email" />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-semibold text-slate-700">Şifre Belirleyin</Label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input id="password" type={showPassword ? "text" : "password"} placeholder="En az 6 karakter" value={password}
                    onChange={(e) => setPassword(e.target.value)} className="pl-10 pr-10 h-12 rounded-xl text-base border-slate-200 focus:border-primary" autoComplete="new-password" />
                  <button type="button" onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors">
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <Button type="submit" className="w-full h-13 text-base font-bold rounded-xl shadow-lg shadow-primary/20" disabled={isLoading}>
                {isLoading ? "Hesap Oluşturuluyor..." : "Kayıt Ol ve Başla"}
                {!isLoading && <ArrowRight className="ml-2 w-5 h-5" />}
              </Button>
            </form>

            <p className="text-center text-xs text-slate-400 leading-relaxed">
              Kayıt olarak{" "}
              <Link href="/sartlar" className="underline hover:text-slate-600">Kullanım Şartlarını</Link> ve{" "}
              <Link href="/gizlilik" className="underline hover:text-slate-600">Gizlilik Politikasını</Link> kabul etmiş olursunuz.
            </p>

            <div className="text-center pt-2">
              <p className="text-slate-500 text-sm">
                Zaten hesabınız var mı?{" "}
                <Link href="/login" className="text-primary font-bold hover:underline">Giriş Yapın</Link>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Sağ Panel - Bilgi (Register'da farklı renk ve içerik) */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-primary/90 via-primary to-blue-700 relative items-center justify-center p-12">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-[15%] right-[10%] w-72 h-72 bg-white rounded-full blur-[100px]" />
          <div className="absolute bottom-[20%] left-[15%] w-64 h-64 bg-yellow-300 rounded-full blur-[80px]" />
        </div>
        <div className="relative z-10 max-w-lg">
          <Link href="/" className="inline-flex items-center gap-3 mb-12 group">
            <div className="w-14 h-14 bg-white/20 backdrop-blur rounded-2xl flex items-center justify-center text-white shadow-lg group-hover:scale-105 transition-transform">
              <QrCode className="w-7 h-7" />
            </div>
            <span className="text-3xl font-extrabold text-white tracking-tight">OkulSonrası</span>
          </Link>
          <h1 className="text-4xl font-extrabold text-white leading-tight mb-6">
            İşletmenizi<br />
            <span className="text-yellow-200">büyütmeye</span> hazır mısınız?
          </h1>
          <p className="text-white/80 text-lg leading-relaxed mb-10">
            Binlerce etüt merkezi ve öğrenci kafesi OkulSonrası ile velilerine güven veriyor, gelirlerini artırıyor.
          </p>

          {/* Avantajlar */}
          <div className="space-y-5">
            {[
              { icon: Clock, text: "5 dakikada kurulum, teknik bilgi gereksiz" },
              { icon: CheckCircle2, text: "14 gün tamamen ücretsiz deneme" },
              { icon: Sparkles, text: "Kredi kartı bilgisi gerekmez" },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-white/20 backdrop-blur flex items-center justify-center flex-shrink-0">
                  <item.icon className="w-4 h-4 text-white" />
                </div>
                <span className="text-white font-medium text-base">{item.text}</span>
              </div>
            ))}
          </div>

          {/* Testimonial */}
          <div className="mt-12 bg-white/10 backdrop-blur rounded-2xl p-6 border border-white/20">
            <p className="text-white/90 italic text-sm leading-relaxed mb-3">
              "Velilerimiz çocuklarının giriş saatini WhatsApp'tan anında görünce bize olan güvenleri inanılmaz arttı. Kayıtlarımız %30 yükseldi."
            </p>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-yellow-300 flex items-center justify-center text-slate-900 font-bold text-sm">AY</div>
              <div>
                <p className="text-white font-semibold text-sm">Ayşe Yılmaz</p>
                <p className="text-white/60 text-xs">Yıldız Etüt Merkezi</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
