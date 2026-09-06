"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export interface Product {
  id: string;
  name: string;
  price: number;
  category: string;
}

interface ProductGridProps {
  products: Product[];
  onAddProduct: (product: Product) => void;
}

export function ProductGrid({ products, onAddProduct }: ProductGridProps) {
  // Kategorileri dinamik olarak çıkart
  const categories = Array.from(new Set(products.map(p => p.category)));

  return (
    <div className="space-y-8 pb-10">
      {categories.map((category) => (
        <div key={category} className="space-y-4">
          <h2 className="text-2xl font-bold tracking-tight border-b pb-2">{category}</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
            {products
              .filter(p => p.category === category)
              .map((product) => (
                <Card 
                  key={product.id} 
                  className="cursor-pointer hover:border-primary transition-all hover:shadow-md active:scale-95 group"
                  onClick={() => onAddProduct(product)}
                >
                  <CardContent className="p-6 flex flex-col items-center justify-center text-center h-full aspect-square relative overflow-hidden">
                    <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                    <h3 className="font-semibold text-lg line-clamp-2 leading-tight mb-2">
                      {product.name}
                    </h3>
                    <p className="text-xl font-bold text-primary mt-auto">
                      ₺{product.price.toFixed(2)}
                    </p>
                  </CardContent>
                </Card>
              ))}
          </div>
        </div>
      ))}
    </div>
  );
}
