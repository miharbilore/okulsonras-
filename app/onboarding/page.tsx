"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Building2, ArrowRight } from "lucide-react";
import { createClient } from "@/lib/supabase";

export default function OnboardingPage() {
  const [tenantName, setTenantName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [userMeta, setUserMeta] = useState<any>(null);

  const supabase = createClient();

  useEffect(() => {
    const checkUser = async () => {
      const { data } = await supabase.auth.getUser();
      if (!data?.user) {
        window.location.href = "/login";
        return;
      }
      setUserId(data.user.id);
      setUserMeta(data.user.user_metadata);
      
      // Varsayýlan isim atama
      if (data.user.user_metadata?.tenant_name) {
        setTenantName(data.user.user_metadata.tenant_name);
      } else if (data.user.user_metadata?.full_name) {
        setTenantName(`${data.user.user_metadata.full_name} Ýþletmesi`);
      }
    };
    checkUser();
  }, [supabase]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenantName.trim()) {
      toast.error("Lütfen iþletme adýnýzý girin.");
      return;
    }
    
    setIsLoading(true);
    try {
      const tenantSlug = "tenant-" + Date.now();
      const displayName = userMeta?.full_name || userMeta?.email || "";
      const avatarUrl = userMeta?.avatar_url || null;

      const { data, error } = await supabase.rpc("create_tenant_and_profile", {
        p_tenant_name: tenantName.trim(),
        p_tenant_slug: tenantSlug,
        p_user_id: userId,
        p_display_name: displayName,
        p_avatar_url: avatarUrl
      });

      if (error) throw error;
      
      toast.success("Ýþletmeniz baþarýyla kuruldu! Yönetim paneline yönlendiriliyorsunuz...");
      
      setTimeout(() => {
        window.location.href = "/admin";
      }, 1500);
      
    } catch (error: any) {
      toast.error("Ýþletme kurulurken bir hata oluþtu: " + (error.message || "Bilinmeyen hata"));
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-primary/30 flex items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
        <div className="absolute top-[10%] right-[15%] w-96 h-96 bg-primary rounded-full blur-[120px]"></div>
        <div className="absolute bottom-[10%] left-[10%] w-80 h-80 bg-blue-500 rounded-full blur-[100px]"></div>
      </div>

      <div className="w-full max-w-md relative z-10">
        <Card className="rounded-3xl shadow-2xl border-white/10 bg-white/95 backdrop-blur-xl">
          <CardHeader className="text-center pb-2">
            <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
              <Building2 className="w-8 h-8 text-primary" />
            </div>
            <CardTitle className="text-2xl font-extrabold">Son Bir Adým!</CardTitle>
            <CardDescription>Size özel alanýnýzý oluþturmak için iþletme (Etüt Merkezi vb.) adýnýzý belirleyin.</CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="tenantName" className="font-semibold text-slate-700">Ýþletme Adýnýz</Label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                  <Input 
                    id="tenantName"
                    value={tenantName}
                    onChange={(e) => setTenantName(e.target.value)}
                    placeholder="Örn: Bilim Etüt Merkezi"
                    className="pl-10 py-6 bg-slate-50/50 border-slate-200 focus:bg-white transition-colors rounded-xl"
                    required
                  />
                </div>
              </div>
              
              <Button type="submit" disabled={isLoading} className="w-full py-6 rounded-xl text-md font-bold shadow-lg hover:shadow-xl transition-all">
                {isLoading ? "Kuruluyor..." : "Ýþletmemi Kur ve Baþla"}
                {!isLoading && <ArrowRight className="w-5 h-5 ml-2" />}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
"
