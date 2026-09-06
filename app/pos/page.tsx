"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { ProductGrid, Product } from "@/components/pos/ProductGrid";
import { Cart, CartItem } from "@/components/pos/Cart";
import { StudentSelector, Student } from "@/components/pos/StudentSelector";
import { createClient } from "@/lib/supabase";
import { Coffee } from "lucide-react";

export default function POSPage() {
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [tenantId, setTenantId] = useState<string | null>(null);
  const supabase = createClient();

  useEffect(() => {
    async function loadData() {
      let currentTenantId = localStorage.getItem("impersonate_tenant_id");
      
      if (!currentTenantId) {
        const { data: authData } = await supabase.auth.getUser();
        if (authData?.user) {
          const { data: profile } = await supabase.from('profiles').select('tenant_id').eq('user_id', authData.user.id).single();
          if (profile?.tenant_id) {
            currentTenantId = profile.tenant_id;
          }
        }
      }

      setTenantId(currentTenantId);

      if (!currentTenantId) {
        toast.error("Bağlı olduğunuz bir işletme bulunamadı.");
        return;
      }

      try {
        const [productsRes, studentsRes] = await Promise.all([
          supabase.from('products').select('*').eq('tenant_id', currentTenantId).eq('is_active', true),
          supabase.from('students').select('*').eq('tenant_id', currentTenantId)
        ]);
          
        if (productsRes.error) throw productsRes.error;
        if (studentsRes.error) throw studentsRes.error;

        if (productsRes.data) setProducts(productsRes.data);
        if (studentsRes.data) {
           setStudents(studentsRes.data.map((s: any) => ({
             id: s.id,
             name: s.full_name,
             weeklyLimit: s.weekly_limit || 100,
             weeklySpending: 0 // TODO: gerçek harcamaları transactions tablosundan hesapla
           })));
        }
      } catch (err: any) {
        toast.error("Veriler yüklenemedi: " + (err.message || "Bilinmeyen hata"));
      }
    }
    loadData();
  }, [supabase]);

  const handleAddProduct = (product: Product) => {
    setCartItems(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        return prev.map(item => 
          item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, { ...product, quantity: 1 }];
    });
  };

  const handleUpdateQuantity = (id: string, delta: number) => {
    setCartItems(prev => prev.map(item => {
      if (item.id === id) {
        const newQty = item.quantity + delta;
        return newQty > 0 ? { ...item, quantity: newQty } : item;
      }
      return item;
    }).filter(item => item.quantity > 0));
  };

  const handleRemoveItem = (id: string) => {
    setCartItems(prev => prev.filter(item => item.id !== id));
  };

  const handleCheckout = async (paymentType: 'credit' | 'cash') => {
    if (!selectedStudent || cartItems.length === 0) return;

    setIsCheckingOut(true);
    try {
      const totalAmount = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      
      // Limit Kontrolü sadece Veresiye (credit) işlemlerinde yapılır
      if (paymentType === 'credit') {
        if ((selectedStudent.weeklySpending + totalAmount) > selectedStudent.weeklyLimit) {
          throw new Error("Öğrencinin haftalık limiti bu işlem için yetersiz!");
        }
      }

      // --- GERÇEK SUPABASE ENTEGRASYONU ---
      if (tenantId) {
        const { error: trxError } = await supabase.from('transactions').insert({
          tenant_id: tenantId,
          student_id: selectedStudent.id,
          items: cartItems,
          total_amount: totalAmount,
          type: paymentType === 'cash' ? 'cash_purchase' : 'credit_purchase'
        });
        if (trxError) throw new Error("İşlem kaydedilemedi: " + trxError.message);

        // Veresiye satış yapıldıysa veliye akşam bildirim gitmesi için kuyruğa at
        if (paymentType === 'credit') {
          const { error: notifError } = await supabase.from('daily_notifications').insert({
             tenant_id: tenantId,
             student_id: selectedStudent.id,
             type: 'daily_spending',
             payload: { total_amount: totalAmount, items: cartItems }
          });
          if (notifError) console.error("Bildirim kuyruğuna eklenemedi:", notifError);
        }
      }
      
      // Simüle Edilmiş Bekleme Süresi
      await new Promise(resolve => setTimeout(resolve, 800));

      toast.success(paymentType === 'cash' ? "Peşin Satış Tamamlandı!" : "Veresiye Satış Tamamlandı!", {
        description: paymentType === 'cash' 
          ? `₺${totalAmount.toFixed(2)} peşin olarak tahsil edildi.` 
          : `${selectedStudent.name} hesabına ₺${totalAmount.toFixed(2)} veresiye yazıldı.`,
        duration: 4000,
      });

      // Sepeti ve öğrenciyi temizle
      setCartItems([]);
      setSelectedStudent(null);
      
    } catch (error: any) {
      toast.error("Satış Başarısız", {
        description: error.message,
        duration: 5000,
      });
    } finally {
      setIsCheckingOut(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row relative">
      {/* TEST / EXIT BUTTON */}
      <a href="/" className="absolute top-4 right-4 z-50 flex items-center gap-2 px-4 py-2 bg-white hover:bg-slate-100 text-sm font-bold rounded-full shadow-sm transition-all text-slate-600 hover:text-red-600 border">
        Çıkış
      </a>

      {/* SOL TARAF: ÜRÜNLER */}
      <div className="flex-1 flex flex-col h-full border-r bg-background">
        <div className="p-6 border-b flex items-center gap-3">
          <div className="w-12 h-12 bg-primary text-primary-foreground rounded-2xl flex items-center justify-center">
            <Coffee className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight">Hızlı Satış</h1>
            <p className="text-muted-foreground font-medium">Kantin & Kafe POS Modülü</p>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-6">
          <ProductGrid products={products} onAddProduct={handleAddProduct} />
        </div>
      </div>

      {/* SAĞ: Öğrenci Seçimi & Sepet */}
      <div className="w-[450px] xl:w-[500px] flex flex-col h-full bg-background p-6 space-y-6 shadow-[-10px_0_30px_rgba(0,0,0,0.02)] z-10">
        <StudentSelector 
          students={students}
          selectedStudent={selectedStudent} 
          onSelectStudent={setSelectedStudent}
          onClearStudent={() => setSelectedStudent(null)}
        />
        
        <div className="flex-1 min-h-0">
          <Cart 
            items={cartItems} 
            student={selectedStudent} 
            onUpdateQuantity={handleUpdateQuantity}
            onRemoveItem={handleRemoveItem}
            onCheckout={handleCheckout}
            isCheckingOut={isCheckingOut}
          />
        </div>
      </div>
    </div>
  );
}
