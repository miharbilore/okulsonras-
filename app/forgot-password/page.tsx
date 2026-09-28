"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Mail, ArrowRight, ShieldCheck, QrCode } from "lucide-react";
import Link from "next/link";
import { createClient } from "@/lib/supabase";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSent, setIsSent] = useState(false);
  const supabase = createClient();

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast.error("Lütfen e-posta adresinizi girin.");
      return;
    }

    // Basit email format kontrolü
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast.error("Geçerli bir e-posta adresi girin.");
      return;
    }

    setIsLoading(true);
    try {
      // Supabase şifre sıfırlama maili gönderdiğinde, kullanıcıyı doğrudan
      // redirectTo URL'ine hash fragment (#access_token=...) ile yönlendirir.
      // Bu yüzden /auth/callback'e değil, doğrudan /reset-password sayfasına yönlendiriyoruz.
      const origin = window.location.origin;
      
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${origin}/reset-password`,
      });

      if (error) throw error;
      
      setIsSent(true);
      toast.success("Şifre sıfırlama bağlantısı gönderildi!");
    } catch (error: any) {
      // Supabase güvenlik gereği "kullanıcı bulunamadı" hatası vermez
      // Bu yüzden her durumda başarılı mesajı gösteriyoruz (güvenlik en iyi uygulaması)
      if (error.message?.includes("rate limit") || error.message?.includes("too many")) {
        toast.error("Çok fazla deneme yaptınız. Lütfen birkaç dakika bekleyin.");
      } else {
        // Güvenlik açısından başarılı gibi göster (kullanıcının var olup olmadığını ifşa etme)
        setIsSent(true);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-primary/30 flex items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-full opacity-10">
        <div className="absolute top-[10%] left-[15%] w-96 h-96 bg-primary rounded-full blur-[120px]"></div>
        <div className="absolute bottom-[10%] right-[10%] w-80 h-80 bg-blue-500 rounded-full blur-[100px]"></div>
      </div>

      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-3 mb-6 group">
            <div className="w-14 h-14 bg-primary rounded-2xl flex items-center justify-center text-white shadow-lg shadow-primary/30 group-hover:scale-105 transition-transform">
              <QrCode className="w-7 h-7" />
            </div>
            <span className="text-3xl font-extrabold text-white tracking-tight">OkulSonrası</span>
          </Link>
        </div>

        <Card className="rounded-3xl shadow-2xl border-white/10 bg-white/95 backdrop-blur-xl">
          <CardHeader className="text-center pb-2">
            <CardTitle className="text-2xl font-extrabold">Şifremi Unuttum</CardTitle>
            <CardDescription>
              Hesabınıza ait e-posta adresini girin, size bir sıfırlama bağlantısı gönderelim.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 px-8 pb-8 mt-4">
            {isSent ? (
              <div className="text-center space-y-4">
                <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Mail className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-bold">Bağlantı Gönderildi!</h3>
                <p className="text-slate-500 text-sm leading-relaxed">
                  E-posta adresinize şifre sıfırlama bağlantısı gönderdik. 
                  Lütfen gelen kutunuzu kontrol edin.
                </p>
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-left">
                  <p className="text-amber-700 text-xs font-medium">
                    💡 E-posta gelmediyse: Spam/Gereksiz klasörünüzü kontrol edin. 
                    Birkaç dakika beklemeniz gerekebilir.
                  </p>
                </div>
                <div className="flex flex-col gap-2 pt-2">
                  <Button 
                    variant="outline" 
                    className="w-full h-12"
                    onClick={() => { setIsSent(false); setEmail(""); }}
                  >
                    Farklı E-posta Dene
                  </Button>
                  <Link href="/login" className="w-full">
                    <Button variant="ghost" className="w-full h-12 text-primary">
                      Giriş Ekranına Dön
                    </Button>
                  </Link>
                </div>
              </div>
            ) : (
              <form onSubmit={handleReset} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email" className="font-semibold">E-posta Adresi</Label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="ornek@okulsonrasi.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-10 h-12 rounded-xl text-base"
                      disabled={isLoading}
                      autoFocus
                    />
                  </div>
                </div>
                <Button
                  type="submit"
                  className="w-full h-14 text-lg font-bold rounded-xl shadow-md shadow-primary/20 mt-4"
                  disabled={isLoading || !email}
                >
                  {isLoading ? "Gönderiliyor..." : "Sıfırlama Bağlantısı Gönder"}
                  {!isLoading && <ArrowRight className="ml-2 w-5 h-5" />}
                </Button>
              </form>
            )}

            <div className="flex items-center justify-center gap-2 pt-4 text-sm text-slate-400">
              <ShieldCheck className="w-4 h-4 text-green-500" />
              <span>Bağlantı sadece size özeldir ve tek kullanımlıktır</span>
            </div>
          </CardContent>
        </Card>

        <p className="text-center mt-6 text-slate-500 text-sm">
          <Link href="/login" className="text-primary hover:underline font-semibold">← Giriş Ekranına Dön</Link>
        </p>
      </div>
    </div>
  );
}
