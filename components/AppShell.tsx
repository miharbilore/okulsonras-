"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { QrCode, Menu, X, Home, LogOut, LayoutDashboard } from "lucide-react";
import { Button } from "@/components/ui/button";

// Bu sayfalar kendi header/footer'larını kullanır, global olanı göstermeyiz
const STANDALONE_PAGES = ["/login", "/register", "/forgot-password", "/reset-password", "/kiosk", "/pos"];

export function AppHeader() {
  const pathname = usePathname();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const supabase = createClient();

  // Standalone sayfalarda header gösterme
  if (STANDALONE_PAGES.some((p) => pathname.startsWith(p))) return null;

  useEffect(() => {
    const checkUser = async () => {
      const { data } = await supabase.auth.getUser();
      setUser(data.user);
      setLoading(false);
    };
    checkUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Mobil menü açıkken scroll'u kilitle
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [mobileOpen]);

  // Route değişince mobil menüyü kapat
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    window.location.href = "/";
  };

  const navLinks = [
    { href: "/#features", label: "Özellikler" },
    { href: "/#how-it-works", label: "Nasıl Çalışır?" },
    { href: "/#pricing", label: "Fiyatlandırma" },
  ];

  return (
    <>
      <header className="fixed top-0 left-0 right-0 h-16 bg-white/80 backdrop-blur-md border-b z-[9999] flex items-center justify-between px-4 sm:px-6">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 hover:opacity-80 transition-opacity">
          <img src="/logo.jpg" alt="OkulSonrası Logo" className="w-9 h-9 rounded-md object-contain" />
          <span className="font-extrabold text-xl tracking-tight hidden sm:block">
            OkulSonrası<span className="text-primary">.</span>
          </span>
        </Link>

        {/* Desktop Nav */}
        <div className="hidden md:flex gap-8 text-sm font-semibold text-slate-600">
          {navLinks.map((link) => (
            <a key={link.href} href={link.href} className="hover:text-primary transition-colors">
              {link.label}
            </a>
          ))}
        </div>

        {/* Desktop Auth */}
        <div className="hidden md:flex items-center gap-3">
          {loading ? (
            <div className="w-20 h-8 bg-slate-100 rounded-full animate-pulse" />
          ) : user ? (
            <>
              <Link
                href="/admin"
                className="inline-flex items-center gap-2 bg-primary text-primary-foreground font-bold shadow-md shadow-primary/20 rounded-full px-5 py-2 text-sm hover:opacity-90 transition-opacity"
              >
                <LayoutDashboard className="w-4 h-4" />
                Yönetim Paneli
              </Link>
              <button
                onClick={handleLogout}
                className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-red-500 transition-colors px-3 py-2"
              >
                <LogOut className="w-4 h-4" />
                Çıkış
              </button>
            </>
          ) : (
            <>
              <Link href="/login" className="text-sm font-bold text-slate-600 hover:text-primary transition-colors">
                Giriş Yap
              </Link>
              <Link
                href="/register"
                className="inline-flex items-center justify-center bg-primary text-primary-foreground font-bold shadow-md shadow-primary/20 rounded-full px-5 py-2 text-sm hover:opacity-90 transition-opacity"
              >
                Kayıt Ol
              </Link>
            </>
          )}
        </div>

        {/* Mobile Hamburger */}
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="md:hidden p-2 rounded-lg hover:bg-slate-100 transition-colors"
          aria-label="Menüyü aç/kapat"
        >
          {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </header>

      {/* Mobile Slide Menu */}
      {mobileOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/50 z-[9998] md:hidden"
            onClick={() => setMobileOpen(false)}
          />
          {/* Panel */}
          <div className="fixed top-0 right-0 h-full w-72 bg-white shadow-2xl z-[9999] md:hidden flex flex-col animate-in slide-in-from-right duration-200">
            {/* Panel Header */}
            <div className="flex items-center justify-between p-4 border-b">
              <span className="font-extrabold text-lg">Menü</span>
              <button onClick={() => setMobileOpen(false)} className="p-2 rounded-lg hover:bg-slate-100">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* User Info */}
            {user && (
              <div className="px-4 py-3 bg-slate-50 border-b">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Giriş Yapıldı</p>
                <p className="text-sm font-bold text-slate-700 truncate mt-0.5">{user.email}</p>
              </div>
            )}

            {/* Nav Links */}
            <nav className="flex-1 p-4 space-y-1">
              {navLinks.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50 hover:text-primary transition-colors"
                >
                  {link.label}
                </a>
              ))}

              {user && (
                <>
                  <div className="my-3 border-t" />
                  <Link
                    href="/admin"
                    onClick={() => setMobileOpen(false)}
                    className="flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-bold text-primary bg-primary/5 hover:bg-primary/10 transition-colors"
                  >
                    <LayoutDashboard className="w-5 h-5" />
                    Yönetim Paneli
                  </Link>
                </>
              )}
            </nav>

            {/* Bottom Actions */}
            <div className="p-4 border-t space-y-2">
              {loading ? (
                <div className="h-12 bg-slate-100 rounded-xl animate-pulse" />
              ) : user ? (
                <Button
                  variant="outline"
                  className="w-full h-12 rounded-xl text-sm font-bold text-red-500 border-red-200 hover:bg-red-50 hover:border-red-300"
                  onClick={handleLogout}
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Çıkış Yap
                </Button>
              ) : (
                <>
                  <Link href="/login" onClick={() => setMobileOpen(false)}>
                    <Button variant="outline" className="w-full h-12 rounded-xl text-sm font-bold">
                      Giriş Yap
                    </Button>
                  </Link>
                  <Link href="/register" onClick={() => setMobileOpen(false)}>
                    <Button className="w-full h-12 rounded-xl text-sm font-bold">
                      Kayıt Ol
                    </Button>
                  </Link>
                </>
              )}
            </div>
          </div>
        </>
      )}
    </>
  );
}

export function AppFooter() {
  const pathname = usePathname();

  // Standalone sayfalarda footer gösterme
  if (STANDALONE_PAGES.some((p) => pathname.startsWith(p))) return null;
  // Admin ve alt sayfalarında da gösterme
  if (pathname.startsWith("/admin") || pathname.startsWith("/super-admin") || pathname.startsWith("/onboarding") || pathname.startsWith("/veli")) return null;

  return (
    <footer className="bg-slate-950 text-slate-400 py-16 mt-auto">
      <div className="container mx-auto px-6 grid md:grid-cols-4 gap-12">
        <div className="col-span-2">
          <div className="text-2xl font-extrabold tracking-tighter flex items-center gap-2 text-white mb-6">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-white">
              <QrCode className="w-5 h-5" />
            </div>
            OkulSonrası
          </div>
          <p className="max-w-md leading-relaxed text-sm">
            Eğitim ve etüt merkezleri için yeni nesil güvenlik, bildirim ve tahsilat otomasyonu. Mekanınızı geleceğe taşıyın.
          </p>
        </div>
        <div>
          <h4 className="text-white font-bold mb-4 uppercase tracking-wider text-sm">Hızlı Erişim</h4>
          <ul className="space-y-3 text-sm">
            <li><Link href="/login" className="hover:text-primary transition-colors">Yönetim Paneli (Admin)</Link></li>
            <li><Link href="/kiosk" className="hover:text-primary transition-colors">Kiosk Ekranı</Link></li>
            <li><Link href="/pos" className="hover:text-primary transition-colors">Kafe POS</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="text-white font-bold mb-4 uppercase tracking-wider text-sm">Yasal</h4>
          <ul className="space-y-3 text-sm">
            <li><Link href="/gizlilik" className="hover:text-primary transition-colors">Gizlilik Sözleşmesi</Link></li>
            <li><Link href="/sartlar" className="hover:text-primary transition-colors">Kullanım Şartları</Link></li>
            <li><Link href="/iletisim" className="hover:text-primary transition-colors">İletişim</Link></li>
          </ul>
        </div>
      </div>
      <div className="container mx-auto px-6 mt-16 pt-8 border-t border-slate-800 text-sm text-center">
        &copy; {new Date().getFullYear()} OkulSonrası.com - Tüm hakları saklıdır.
      </div>
    </footer>
  );
}
