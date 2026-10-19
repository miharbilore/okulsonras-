"use client";

import { CheckCircle2, MessageCircle, LogOut } from "lucide-react";

interface SuccessCardProps {
  studentName: string;
  type?: 'in' | 'out';
}

export function SuccessCard({ studentName, type = 'in' }: SuccessCardProps) {
  const isOut = type === 'out';
  const colorClass = isOut ? "text-blue-500" : "text-green-500";
  const bgClass = isOut ? "bg-blue-500/10" : "bg-green-500/10";
  const borderClass = isOut ? "border-blue-500/50" : "border-green-500/50";
  const ringClass = isOut ? "ring-blue-500/20" : "ring-green-500/20";
  const textClass = isOut ? "text-blue-600" : "text-green-600";
  const title = isOut ? "Çıkış Başarılı!" : "Giriş Başarılı!";
  const subtitle = isOut ? `İyi Günler, ${studentName}` : `Hoş Geldin, ${studentName}`;

  return (
    <div className={`flex flex-col items-center justify-center p-12 bg-card rounded-3xl shadow-2xl border-2 ${borderClass} animate-in zoom-in duration-500`}>
      <div className={`p-4 rounded-full ${bgClass} ring-8 ${ringClass} mb-6 animate-bounce`}>
        {isOut ? (
          <LogOut className={`w-28 h-28 ${colorClass}`} />
        ) : (
          <CheckCircle2 className={`w-28 h-28 ${colorClass}`} />
        )}
      </div>
      
      <h2 className="text-4xl font-extrabold text-foreground mb-2 text-center">
        {title}
      </h2>
      <p className="text-3xl text-primary font-bold text-center mb-8">
        {subtitle}
      </p>
      
      <div className={`flex items-center gap-3 ${bgClass} px-6 py-3 rounded-full ${textClass} font-medium`}>
        <MessageCircle className="w-5 h-5" />
        <span>Veliye WhatsApp mesajı gönderildi</span>
      </div>
    </div>
  );
}
