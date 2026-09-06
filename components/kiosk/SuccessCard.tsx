"use client";

import { useEffect } from "react";
import confetti from "canvas-confetti";
import { CheckCircle2, MessageCircle } from "lucide-react";

interface SuccessCardProps {
  studentName: string;
}

export function SuccessCard({ studentName }: SuccessCardProps) {
  useEffect(() => {
    const duration = 2000;
    const end = Date.now() + duration;

    const frame = () => {
      confetti({
        particleCount: 5,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors: ["#22c55e", "#16a34a", "#15803d"]
      });
      confetti({
        particleCount: 5,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors: ["#22c55e", "#16a34a", "#15803d"]
      });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    };
    frame();
  }, []);

  return (
    <div className="flex flex-col items-center justify-center p-12 bg-card rounded-3xl shadow-2xl border-2 border-green-500/50 animate-in zoom-in duration-500">
      <CheckCircle2 className="w-32 h-32 text-green-500 mb-6 animate-bounce" />
      <h2 className="text-4xl font-extrabold text-foreground mb-2 text-center">
        Giriş Başarılı!
      </h2>
      <p className="text-3xl text-primary font-bold text-center mb-8">
        Hoş Geldin, {studentName}
      </p>
      
      <div className="flex items-center gap-3 bg-green-500/10 px-6 py-3 rounded-full text-green-600 font-medium">
        <MessageCircle className="w-5 h-5" />
        <span>Veliye WhatsApp mesajı gönderildi</span>
      </div>
    </div>
  );
}
