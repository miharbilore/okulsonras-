"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Video, AlertCircle, XCircle } from "lucide-react";

export interface LiveCameraModalProps {
  isCheckedIn: boolean;
  streamType: "none" | "hls" | "iframe";
  streamUrl: string;
}

export function LiveCameraModal({ isCheckedIn, streamType, streamUrl }: LiveCameraModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(120); // 2 minutes (120 seconds)
  const videoRef = useRef<HTMLVideoElement>(null);

  // Auto-close mechanism
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isOpen) {
      setTimeRemaining(120); // Reset timer when opened
      interval = setInterval(() => {
        setTimeRemaining((prev) => {
          if (prev <= 1) {
            setIsOpen(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isOpen]);

  // HLS initialization
  useEffect(() => {
    if (isOpen && streamType === "hls" && videoRef.current && streamUrl) {
      import("hls.js").then((Hls) => {
        if (Hls.default.isSupported()) {
          const hls = new Hls.default();
          hls.loadSource(streamUrl);
          hls.attachMedia(videoRef.current!);
          hls.on(Hls.default.Events.MANIFEST_PARSED, () => {
            videoRef.current?.play().catch((e) => console.error("HLS Play Error:", e));
          });

          return () => {
            hls.destroy();
          };
        } else if (videoRef.current?.canPlayType('application/vnd.apple.mpegurl')) {
          videoRef.current.src = streamUrl;
          videoRef.current.play().catch((e) => console.error("Native HLS Play Error:", e));
        }
      });
    }
  }, [isOpen, streamType, streamUrl]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  if (streamType === "none" || !streamUrl) {
    return null;
  }

  return (
    <div className="w-full">
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger 
          disabled={!isCheckedIn}
          render={
            <Button 
              className={`w-full h-14 text-lg font-bold shadow-lg rounded-2xl flex items-center justify-center gap-2 ${
                isCheckedIn 
                  ? "bg-red-500 hover:bg-red-600 text-white animate-pulse-soft" 
                  : "bg-slate-200 text-slate-500 cursor-not-allowed"
              }`}
            />
          }
        >
          <Video className="w-6 h-6" />
          📹 Çalışma Alanını Canlı İzle
        </DialogTrigger>
        
        <DialogContent className="sm:max-w-md bg-black border-slate-800 text-white p-0 overflow-hidden">
          <DialogHeader className="p-4 border-b border-white/10 bg-slate-900/80 backdrop-blur-md absolute top-0 w-full z-10 flex flex-row items-center justify-between">
            <DialogTitle className="text-white flex items-center gap-2 text-sm">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
              Canlı Yayın
            </DialogTitle>
            <div className="flex items-center gap-2 text-xs font-medium bg-red-500/20 text-red-400 px-3 py-1.5 rounded-full border border-red-500/30">
              <AlertCircle className="w-3.5 h-3.5" />
              Kalan Süre: {formatTime(timeRemaining)}
            </div>
          </DialogHeader>
          
          <div className="w-full aspect-video bg-slate-950 flex items-center justify-center relative mt-14">
            {streamType === "iframe" ? (
              <iframe 
                src={streamUrl} 
                className="w-full h-full border-0 absolute inset-0" 
                allowFullScreen
              />
            ) : streamType === "hls" ? (
              <video 
                ref={videoRef}
                className="w-full h-full absolute inset-0 object-contain" 
                controls 
                autoPlay 
                muted 
                playsInline
              />
            ) : null}
          </div>
          
          <div className="p-4 bg-slate-900 flex justify-center">
            <Button variant="ghost" onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-white hover:bg-white/10 w-full">
              <XCircle className="w-5 h-5 mr-2" />
              Yayını Kapat
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      
      {!isCheckedIn && (
        <p className="text-center text-xs text-slate-500 mt-2 font-medium">
          Öğrenciniz mekanda olduğunda yayın açılır.
        </p>
      )}
    </div>
  );
}
