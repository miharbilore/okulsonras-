"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";

interface KioskScannerProps {
  onScan: (qrCode: string) => void;
  isActive: boolean;
}

export function KioskScanner({ onScan, isActive }: KioskScannerProps) {
  const [hasError, setHasError] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);

  useLayoutEffect(() => {
    const stopScanner = async () => {
      try {
        // Kamerayı kesin olarak kapatmak için doğrudan MediaStream track'lerini durdur
        const videoEl = document.querySelector("#kiosk-reader video") as HTMLVideoElement;
        if (videoEl && videoEl.srcObject) {
          const stream = videoEl.srcObject as MediaStream;
          stream.getTracks().forEach(t => t.stop());
        }

        if (scannerRef.current) {
          try {
            const state = scannerRef.current.getState();
            // 2 = SCANNING, 3 = PAUSED
            if (state === 2 || state === 3) {
              await scannerRef.current.stop();
            }
          } catch(e) {}
          scannerRef.current.clear();
        }
      } catch (err) {
        // Hataları yut
      } finally {
        scannerRef.current = null;
      }
    };

    if (!isActive) {
      stopScanner();
      return;
    }

    const scanner = new Html5Qrcode("kiosk-reader");
    scannerRef.current = scanner;

    scanner.start(
      { facingMode: "environment" },
      { fps: 10, qrbox: { width: 300, height: 300 } },
      (decodedText) => {
        if (scannerRef.current) {
          scannerRef.current.pause(true); // Pause scanning once we get a result
          onScan(decodedText);
        }
      },
      () => {
        // Ignored scan failure, happens constantly when no QR is in frame
      }
    ).catch((err) => {
      console.error("Camera error:", err);
      setHasError(true);
    });

    return () => {
      stopScanner();
    };
  }, [isActive, onScan]);

  if (!isActive) return null;

  return (
    <div className="relative w-full max-w-md mx-auto aspect-square rounded-3xl overflow-hidden bg-black/10 border-4 border-dashed border-primary/50 flex items-center justify-center">
      {hasError ? (
        <div className="text-center p-6 space-y-4">
          <div className="text-destructive font-semibold text-lg">Kamera Devre Dışı - PIN Kullanın</div>
        </div>
      ) : (
        <div id="kiosk-reader" className="w-full h-full" />
      )}
    </div>
  );
}
