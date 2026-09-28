"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Mail, ArrowRight, ShieldCheck } from "lucide-react";
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

    setIsLoading(true);
    try {
      const redirectUrl = new URL("/auth/callback", window.location.origin);
      redirectUrl.searchParams.set("next", "/reset-password");

      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: redirectUrl.toString(),
      });

      if (error) throw error;
      
      setIsSent(true);
      toast.success("Şifre sıfırlama bağlantısı gönderildi!");
    } catch (error: any) {
      toast.error("İşlem başarısız: " + (error.message || "Bilinmeyen hata"));
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
            <span className="text-3xl font-extrabold text-white tracking-tight">OkulSonrası</span>
          </Link>
        </div>

        <Card className="rounded-3xl shadow-2xl border-white/10 bg-white/95 backdrop-blur-xl">
          <CardHeader className="text-center pb-2">
            <CardTitle className="text-2xl font-extrabold">Şifremi Unuttum</CardTitle>
            <CardDescription>Hesabınıza ait e-posta adresini girin, size bir sıfırlama bağlantısı gönderelim.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 px-8 pb-8 mt-4">
            {isSent ? (
              <div className="text-center space-y-4">
                <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Mail className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-bold">Bağlantı Gönderildi!</h3>
                <p className="text-slate-500">Lütfen gelen kutunuzu (ve gerekiyorsa Spam klasörünü) kontrol edin.</p>
                <Link href="/login">
                  <Button variant="outline" className="w-full mt-4 h-12">Giriş Ekranına Dön</Button>
                </Link>
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
                    />
                  </div>
                </div>
                <Button
                  type="submit"
                  className="w-full h-14 text-lg font-bold rounded-xl shadow-md shadow-primary/20 mt-4"
                  disabled={isLoading}
                >
                  {isLoading ? "Gönderiliyor..." : "Bağlantı Gönder"}
                  {!isLoading && <ArrowRight className="ml-2 w-5 h-5" />}
                </Button>
              </form>
            )}

            <div className="flex items-center justify-center gap-2 pt-4 text-sm text-slate-400">
              <ShieldCheck className="w-4 h-4 text-green-500" />
              <span>Bağlantı sadece size özeldir</span>
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
