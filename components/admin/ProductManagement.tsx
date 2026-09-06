"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { PlusCircle, Search, Info, Loader2, Trash2, Pencil } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase";

interface Product {
  id: string;
  name: string;
  price: number;
  category: string;
  is_active: boolean;
}

export function ProductManagement() {
  const supabase = createClient();
  const [products, setProducts] = useState<Product[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newProduct, setNewProduct] = useState({ name: "", price: 0, category: "Sıcak İçecekler" });

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const tenantId = localStorage.getItem("impersonate_tenant_id");
      if (!tenantId) {
        toast.error("İşletme kimliği (Tenant ID) bulunamadı! Lütfen Süper Admin panelinden bir işletmeye 'Giriş Yap' diyerek gelin.");
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setProducts(data || []);
    } catch (err: any) {
      console.error(err);
      toast.error("Ürünler yüklenirken hata oluştu.");
    } finally {
      setLoading(false);
    }
  };

  const handleAddProduct = async () => {
    if (!newProduct.name || newProduct.price <= 0) {
      toast.error("Lütfen ürün adını ve geçerli bir fiyat girin.");
      return;
    }

    try {
      const tenantId = localStorage.getItem("impersonate_tenant_id");
      if (!tenantId) {
        toast.error("İşletme kimliği bulunamadı! Lütfen Süper Admin üzerinden giriş yapın.");
        return;
      }

      const { data, error } = await supabase.from("products").insert({
        tenant_id: tenantId,
        name: newProduct.name,
        price: newProduct.price,
        category: newProduct.category,
        is_active: true
      }).select().single();

      if (error) throw error;

      setProducts([data, ...products]);
      setIsAddModalOpen(false);
      setNewProduct({ name: "", price: 0, category: "Sıcak İçecekler" });
      toast.success(`${data.name} başarıyla eklendi!`);
    } catch (err: any) {
      toast.error("Ürün eklenemedi: " + err.message);
    }
  };

  const toggleProductStatus = async (id: string, currentStatus: boolean) => {
    try {
      const newStatus = !currentStatus;
      const { error } = await supabase
        .from("products")
        .update({ is_active: newStatus })
        .eq("id", id);

      if (error) throw error;

      setProducts(prev => prev.map(p => p.id === id ? { ...p, is_active: newStatus } : p));
      toast.success(`Ürün ${newStatus ? 'satışa açıldı' : 'satışa kapatıldı'}.`);
    } catch (err: any) {
      toast.error("Durum güncellenemedi: " + err.message);
    }
  };

  const handleDeleteProduct = async (id: string, name: string) => {
    if (!confirm(`"${name}" ürününü kalıcı olarak silmek istediğinize emin misiniz?`)) return;
    try {
      const { error } = await supabase.from("products").delete().eq("id", id);
      if (error) throw error;
      
      setProducts(prev => prev.filter(p => p.id !== id));
      toast.success(`"${name}" başarıyla silindi.`);
    } catch (err: any) {
      toast.error("Silme başarısız: " + err.message);
    }
  };

  const filteredProducts = products.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-3xl font-bold tracking-tight">Kantin & Kafe Menüsü</h2>
        
        <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
          <DialogTrigger render={
            <Button className="h-12 px-6 rounded-xl shadow-md">
              <PlusCircle className="w-5 h-5 mr-2" />
              Yeni Ürün Ekle
            </Button>
          } />
          <DialogContent className="sm:max-w-[400px]">
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold">Yeni Ürün Ekle</DialogTitle>
            </DialogHeader>
            <div className="grid gap-6 py-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Ürün Adı</Label>
                <Input id="name" value={newProduct.name} onChange={(e) => setNewProduct({...newProduct, name: e.target.value})} placeholder="Örn: Filtre Kahve" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="price">Fiyat (₺)</Label>
                <Input id="price" type="number" min="0" step="0.5" value={newProduct.price} onChange={(e) => setNewProduct({...newProduct, price: Number(e.target.value)})} placeholder="0.00" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="category">Kategori</Label>
                <Input id="category" value={newProduct.category} onChange={(e) => setNewProduct({...newProduct, category: e.target.value})} placeholder="Örn: Sıcak İçecekler" />
              </div>
              <Button onClick={handleAddProduct} className="w-full h-12 text-lg font-bold">Kaydet</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="bg-amber-50 border border-amber-200 text-amber-900 rounded-xl p-5 flex gap-4 items-start shadow-sm">
        <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center shrink-0">
          <Info className="w-5 h-5 text-amber-600" />
        </div>
        <div>
          <h3 className="font-bold text-lg mb-1">Burası Sanal Deponuzdur (Satış Ekranı Değildir)</h3>
          <p className="text-sm leading-relaxed text-amber-800/80">
            Bu ekran, kafenizde satmak istediğiniz ürünleri tanımladığınız <strong>Arka Ofis</strong> bölümüdür. Buradan dilediğiniz kadar ürün ekleyebilir (Örn: 30-40 çeşit), fiyatlarını güncelleyebilir ve silebilirsiniz.<br/>
            <span className="block mt-2 font-medium text-amber-900">
              👉 Öğrencilere satış yapmak için alt menüdeki "POS" (Yazar Kasa) butonuna tıklayarak Satış ekranına geçiş yapmalısınız.
            </span>
          </p>
        </div>
      </div>

      <div className="flex items-center space-x-2 max-w-sm">
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Ürün ara..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      <div className="border rounded-xl bg-card shadow-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead className="font-semibold">Ürün Adı</TableHead>
              <TableHead className="font-semibold">Kategori</TableHead>
              <TableHead className="font-semibold text-right">Fiyat (₺)</TableHead>
              <TableHead className="font-semibold text-center">POS Durumu</TableHead>
              <TableHead className="text-right font-semibold">İşlemler</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-12"><Loader2 className="w-6 h-6 animate-spin mx-auto text-muted-foreground" /></TableCell>
              </TableRow>
            ) : filteredProducts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-12 text-muted-foreground">Henüz ürün eklenmemiş. Lütfen yeni ürün ekleyin.</TableCell>
              </TableRow>
            ) : (
              filteredProducts.map((product) => (
                <TableRow key={product.id}>
                  <TableCell className="font-medium text-lg">{product.name}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{product.category}</Badge>
                  </TableCell>
                  <TableCell className="text-right font-bold text-lg text-primary">
                    ₺{Number(product.price).toFixed(2)}
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-2">
                      <Switch 
                        checked={product.is_active}
                        onCheckedChange={() => toggleProductStatus(product.id, product.is_active)}
                      />
                      {product.is_active ? (
                        <span className="text-xs font-semibold text-green-600">Açık</span>
                      ) : (
                        <span className="text-xs font-semibold text-red-500">Kapalı</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-700 hover:bg-red-50" onClick={() => handleDeleteProduct(product.id, product.name)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

