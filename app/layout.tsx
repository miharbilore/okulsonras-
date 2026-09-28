import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "sonner";
import { AppHeader, AppFooter } from "@/components/AppShell";

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
      <body className="min-h-full flex flex-col">
        <AppHeader />
        <main className="flex-1 flex flex-col">
          {children}
        </main>
        <AppFooter />
        <Toaster position="top-right" richColors />
      </body>
    </html>
  );
}
