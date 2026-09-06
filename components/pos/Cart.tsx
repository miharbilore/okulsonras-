"use client";

import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Minus, Plus, ShoppingBag, Trash2 } from "lucide-react";
import { Product } from "./ProductGrid";
import { Student } from "./StudentSelector";
import { Separator } from "@/components/ui/separator";

export interface CartItem extends Product {
  quantity: number;
}

interface CartProps {
  items: CartItem[];
  student: Student | null;
  onUpdateQuantity: (id: string, delta: number) => void;
  onRemoveItem: (id: string) => void;
  onCheckout: (type: 'credit' | 'cash') => void;
  isCheckingOut: boolean;
}

export function Cart({ items, student, onUpdateQuantity, onRemoveItem, onCheckout, isCheckingOut }: CartProps) {
  const totalAmount = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  
  const isLimitExceeded = student 
    ? (student.weeklySpending + totalAmount) > student.weeklyLimit 
    : false;

  const isCartEmpty = items.length === 0;
  const canCheckout = !isCartEmpty && student && !isLimitExceeded;

  return (
    <div className="flex flex-col h-full bg-card rounded-2xl border shadow-sm overflow-hidden">
      <div className="p-4 bg-muted/30 border-b flex items-center justify-between">
        <h2 className="font-bold text-xl flex items-center gap-2">
          <ShoppingBag className="h-5 w-5" />
          Adisyon
        </h2>
        <span className="bg-primary text-primary-foreground px-3 py-1 rounded-full text-sm font-bold">
          {items.length} Ürün
        </span>
      </div>

      <ScrollArea className="flex-1 p-4">
        {isCartEmpty ? (
          <div className="h-full flex flex-col items-center justify-center text-muted-foreground space-y-4 py-12">
            <ShoppingBag className="h-16 w-16 opacity-20" />
            <p className="font-medium text-lg">Sepetiniz boş</p>
          </div>
        ) : (
          <div className="space-y-4">
            {items.map((item) => (
              <div key={item.id} className="flex items-center justify-between group">
                <div className="flex-1 pr-4">
                  <h4 className="font-semibold leading-tight">{item.name}</h4>
                  <p className="text-muted-foreground text-sm font-medium">₺{item.price.toFixed(2)}</p>
                </div>
                
                <div className="flex items-center gap-3">
                  <div className="flex items-center bg-muted rounded-lg p-1">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 rounded-md hover:bg-background"
                      onClick={() => onUpdateQuantity(item.id, -1)}
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                    <span className="w-8 text-center font-bold">{item.quantity}</span>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 rounded-md hover:bg-background"
                      onClick={() => onUpdateQuantity(item.id, 1)}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-10 w-10 text-muted-foreground hover:text-destructive hover:bg-destructive/10 opacity-50 group-hover:opacity-100 transition-opacity"
                    onClick={() => onRemoveItem(item.id)}
                  >
                    <Trash2 className="h-5 w-5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>

      <div className="p-4 bg-muted/10 border-t space-y-4">
        <div className="flex justify-between items-end">
          <span className="text-lg font-medium text-muted-foreground">Genel Toplam</span>
          <span className="text-4xl font-extrabold tracking-tight">₺{totalAmount.toFixed(2)}</span>
        </div>

        {student && isLimitExceeded && (
          <div className="p-3 bg-destructive/10 border border-destructive/30 rounded-xl text-destructive text-sm font-medium animate-in slide-in-from-bottom-2">
            <strong>Haftalık Limit Aşılıyor!</strong><br/>
            Veli Limiti: ₺{student.weeklyLimit.toFixed(2)}<br/>
            Kalan Limit: ₺{(student.weeklyLimit - student.weeklySpending).toFixed(2)}
          </div>
        )}

        <div className="grid grid-cols-1 gap-3 mt-4">
          <Button 
            size="lg" 
            className="w-full h-14 text-lg font-bold rounded-xl" 
            disabled={!canCheckout || isCheckingOut}
            onClick={() => onCheckout('credit')}
            variant={isLimitExceeded ? "destructive" : "default"}
          >
            {isCheckingOut ? "İşleniyor..." : "Haftalık Hesaba Ekle (Veresiye)"}
          </Button>

          <Button 
            size="lg" 
            variant="outline"
            className="w-full h-14 text-lg font-bold rounded-xl border-2" 
            disabled={isCartEmpty || !student || isCheckingOut}
            onClick={() => onCheckout('cash')}
          >
            Anlık Peşin / Kredi Kartı
          </Button>
        </div>
      </div>
    </div>
  );
}
