"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogClose } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Delete, X } from "lucide-react";

interface PinModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (pin: string) => void;
}

export function PinModal({ isOpen, onClose, onSubmit }: PinModalProps) {
  const [pin, setPin] = useState("");

  const handlePress = (num: string) => {
    if (pin.length < 4) {
      const newPin = pin + num;
      setPin(newPin);
      if (newPin.length === 4) {
        setTimeout(() => {
          onSubmit(newPin);
          setPin("");
        }, 150);
      }
    }
  };

  const handleBackspace = () => {
    setPin((prev) => prev.slice(0, -1));
  };

  const handleClear = () => {
    setPin("");
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md bg-background/95 backdrop-blur-xl border-primary/20">
        <DialogHeader className="relative">
          <DialogTitle className="text-center text-2xl font-bold">PIN Girin</DialogTitle>
          <DialogDescription className="text-center">Öğrenci şifrenizi tuşlayınız.</DialogDescription>
          <DialogClose className="absolute right-0 top-0 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground">
            <X className="h-6 w-6" />
            <span className="sr-only">Kapat</span>
          </DialogClose>
        </DialogHeader>
        
        <div className="flex justify-center gap-4 my-8">
          {[0, 1, 2, 3].map((i) => (
            <div 
              key={i} 
              className={`w-12 h-12 rounded-full border-2 flex items-center justify-center text-2xl font-bold transition-colors ${
                i < pin.length ? 'bg-primary border-primary text-primary-foreground' : 'border-muted-foreground/30 text-transparent'
              }`}
            >
              •
            </div>
          ))}
        </div>

        <div className="grid grid-cols-3 gap-4 p-4">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
            <Button
              key={num}
              variant="outline"
              className="h-20 text-3xl font-semibold rounded-2xl hover:bg-primary hover:text-primary-foreground transition-all"
              onClick={() => handlePress(num.toString())}
            >
              {num}
            </Button>
          ))}
          <Button
            variant="ghost"
            className="h-20 rounded-2xl text-2xl font-bold text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-all"
            onClick={handleClear}
          >
            C
          </Button>
          <Button
            variant="outline"
            className="h-20 text-3xl font-semibold rounded-2xl hover:bg-primary hover:text-primary-foreground transition-all"
            onClick={() => handlePress("0")}
          >
            0
          </Button>
          <Button
            variant="ghost"
            className="h-20 rounded-2xl text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-all"
            onClick={handleBackspace}
          >
            <Delete className="w-8 h-8" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
