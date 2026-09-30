"use client";

import { useEffect } from "react";
import confetti from "canvas-confetti";
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
  const textClass = isOut ? "text-blue-600" : "text-green-600";
  const title = isOut ? "Çıkış Başarılı!" : "Giriş Başarılı!";
  const subtitle = isOut ? `İyi Günler, ${studentName}` : `Hoş Geldin, ${studentName}`;

  useEffect(() => {
    const duration = 2000;
    const end = Date.now() + duration;

    const frame = () => {
      confetti({
        particleCount: 5,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors: isOut ? ["#3b82f6", "#2563eb", "#1d4ed8"] : ["#22c55e", "#16a34a", "#15803d"]
      });
      confetti({
        particleCount: 5,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors: isOut ? ["#3b82f6", "#2563eb", "#1d4ed8"] : ["#22c55e", "#16a34a", "#15803d"]
      });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    };
    frame();
  }, [isOut]);

  return (
    <div className={`flex flex-col items-center justify-center p-12 bg-card rounded-3xl shadow-2xl border-2 ${borderClass} animate-in zoom-in duration-500`}>
      {isOut ? (
        <LogOut className={`w-32 h-32 ${colorClass} mb-6 animate-bounce`} />
      ) : (
        <CheckCircle2 className={`w-32 h-32 ${colorClass} mb-6 animate-bounce`} />
      )}
      
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
