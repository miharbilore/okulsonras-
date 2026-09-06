"use client";

import { useState, useEffect } from "react";
import { StudentManagement } from "@/components/admin/StudentManagement";
import { ProductManagement } from "@/components/admin/ProductManagement";
import { ReportsDashboard } from "@/components/admin/ReportsDashboard";
import { TenantSettings } from "@/components/admin/TenantSettings";
import { LayoutDashboard, Users, Coffee, FileBarChart, Settings, LogOut, Menu, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";

const SIDEBAR_ITEMS = [
  { id: "students", label: "Öğrenciler", icon: Users },
  { id: "products", label: "Menü & Ürünler", icon: Coffee },
  { id: "reports", label: "Raporlar & Girişler", icon: FileBarChart },
  { id: "settings", label: "İşletme Ayarları", icon: Settings },
];

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState("students");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [tenantName, setTenantName] = useState("Yükleniyor...");

  useEffect(() => {
    const fetchTenantName = async () => {
      const storedName = localStorage.getItem("impersonate_tenant_name");
      if (storedName) {
        setTenantName(storedName);
        return;
      }
      
      const { createClient } = await import("@/lib/supabase");
      const supabase = createClient();
      const { data: authData } = await supabase.auth.getUser();
      if (authData?.user) {
        const { data: profile } = await supabase.from('profiles').select('tenant_id').eq('user_id', authData.user.id).single();
        if (profile?.tenant_id) {
          const { data: tenant } = await supabase.from('tenants').select('name').eq('id', profile.tenant_id).single();
          if (tenant) setTenantName(tenant.name);
          else setTenantName("İşletme Bulunamadı");
        } else {
          setTenantName("Yetkisiz Kullanıcı");
        }
      } else {
         setTenantName("Oturum Yok");
      }
    };
    fetchTenantName();
  }, []);

  const renderContent = () => {
    switch (activeTab) {
      case "students": return <StudentManagement />;
      case "products": return <ProductManagement />;
      case "reports": return <ReportsDashboard />;
      case "settings": return <TenantSettings />;
      default: return <StudentManagement />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/50 flex print:bg-white print:min-h-0">
      {/* DESKTOP SIDEBAR */}
      <aside className="hidden md:flex w-72 flex-col bg-white border-r shadow-sm sticky top-0 h-screen overflow-y-auto print:hidden">
        <div className="p-6 border-b">
            <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
              <div className="w-10 h-10 bg-primary text-primary-foreground rounded-2xl flex items-center justify-center shadow-md">
                <LayoutDashboard className="w-5 h-5" />
              </div>
              <h1 className="text-xl font-black tracking-tight">
                OkulSonrası
                <span className="block text-xs font-medium text-slate-500 tracking-normal mt-0.5">Admin Paneli</span>
              </h1>
            </Link>
        </div>

        <nav className="flex-1 p-4 space-y-2">
          {SIDEBAR_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all duration-200 text-sm font-semibold ${
                  isActive 
                    ? "bg-primary text-primary-foreground shadow-md shadow-primary/20 scale-[1.02]" 
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? "text-primary-foreground" : "text-slate-400"}`} />
                {item.label}
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t">
          <div className="mb-4 px-4 py-3 bg-slate-50 rounded-xl border border-slate-100">
            <p className="text-xs text-slate-500 font-medium">Bağlı İşletme</p>
            <p className="text-sm font-bold text-slate-800 truncate">{tenantName}</p>
          </div>
          <button 
            onClick={() => {
              localStorage.removeItem("impersonate_tenant_id");
              localStorage.removeItem("impersonate_tenant_name");
              localStorage.removeItem("impersonate_mode");
              window.location.href = "/super-admin";
            }}
            className="w-full flex items-center gap-3 px-4 py-3 text-red-600 hover:bg-red-50 rounded-xl transition-colors text-sm font-semibold"
          >
            <LogOut className="w-5 h-5" />
            Çıkış Yap
          </button>
        </div>
      </aside>

      {/* MOBILE HEADER */}
      <div className="md:hidden fixed top-0 left-0 w-full h-16 bg-white border-b z-50 flex items-center justify-between px-4 print:hidden">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-primary text-primary-foreground rounded-xl flex items-center justify-center">
            <LayoutDashboard className="w-4 h-4" />
          </div>
          <h1 className="text-lg font-black">Admin</h1>
        </div>
        <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-2 text-slate-600">
          {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* MOBILE MENU */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="md:hidden fixed top-16 left-0 w-full bg-white border-b z-40 p-4 space-y-2 shadow-lg print:hidden"
          >
            {SIDEBAR_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => { setActiveTab(item.id); setIsMobileMenuOpen(false); }}
                  className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-bold ${
                    isActive ? "bg-primary text-primary-foreground" : "text-slate-600"
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  {item.label}
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 w-full flex flex-col md:pl-0 pt-16 md:pt-0 max-w-[1200px] mx-auto min-h-screen print:min-h-0 print:pt-0 print:max-w-none">
        <div className="flex-1 p-6 lg:p-10">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10, filter: "blur(4px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              exit={{ opacity: 0, y: -10, filter: "blur(4px)" }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className="bg-white p-6 md:p-8 rounded-[2rem] border shadow-sm print-hidden"
            >
              {renderContent()}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
