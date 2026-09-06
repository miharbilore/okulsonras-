import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "sonner";
import Link from "next/link";
import { Home, HardDrive, LayoutDashboard, Coffee, MonitorSmartphone, QrCode } from "lucide-react";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "OkulSonrası - Eğitim Merkezi Otomasyonu",
  description: "Öğrenci takip, pos ve kiosk sistemi",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="tr"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col pb-20 pt-16">
        <header className="fixed top-0 left-0 right-0 h-16 bg-white/80 backdrop-blur-md border-b z-[9999] flex items-center justify-between px-6">
          <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
            <img src="/logo.jpg" alt="OkulSonrası Logo" className="w-9 h-9 rounded-md object-contain" />
            <span className="font-extrabold text-xl tracking-tight hidden sm:block">OkulSonrası<span className="text-primary">.</span></span>
          </Link>
          
          <div className="hidden md:flex gap-8 text-sm font-semibold text-slate-600">
            <a href="/#features" className="hover:text-primary transition-colors">Özellikler</a>
            <a href="/#how-it-works" className="hover:text-primary transition-colors">Nasıl Çalışır?</a>
            <a href="/#pricing" className="hover:text-primary transition-colors">Fiyatlandırma</a>
          </div>

          <div className="flex items-center gap-4">
            <Link href="/" className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-full font-semibold text-sm transition-colors md:hidden" title="Ana Sayfa">
              <Home className="w-4 h-4" />
            </Link>
            <Link href="/login" className="hidden md:inline-flex text-sm font-bold text-slate-600 hover:text-primary transition-colors">
              Giriş Yap
            </Link>
            <Link href="/register" className="hidden md:inline-flex items-center justify-center bg-primary text-primary-foreground font-bold shadow-md shadow-primary/20 rounded-full px-5 py-2 text-sm hover:opacity-90 transition-opacity">
              Kayıt Ol
            </Link>
          </div>
        </header>

        <main className="flex-1 flex flex-col min-h-[calc(100vh-4rem)]">
          {children}
        </main>
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
                <li><Link href="/veli/ornek-123" className="hover:text-primary transition-colors">Veli Arayüzü (Demo)</Link></li>
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
        


        <Toaster position="top-right" richColors />
      </body>
    </html>
  );
}
