import React from "react";
import ProductCard from "@/components/product-card";

import { useCart } from "@/context/CartContext";
import { useToast } from "@/hooks/use-toast";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import CartSheet from "@/components/cart-sheet";
import { Button } from "@/components/ui/button";
import { calculateItemCount, formatPrice, calculateCartTotal } from "@/lib/products";



const ProductsPage = () => {
  const [productsByCategory, setProductsByCategory] = React.useState<any>({});
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const { cart, addToCart: contextAddToCart, showCart, closeCart, openCart } = useCart();
  const { toast } = useToast();
  const handleAdd = (p: any) => {
    contextAddToCart(p);
    toast({ title: 'Added to cart!', description: `${p.name}${p.variantLabel?` (${p.variantLabel})`:''} has been added to your cart.` });
  };

  // Flatten all products (for modal suggestions) BEFORE any early returns to keep hook order stable
  const allProducts = React.useMemo(() => (
    Object.values(productsByCategory).flat() as any[]
  ), [productsByCategory]);

  React.useEffect(() => {
    fetch('/productsByCategory.json')
      .then((res) => {
        if (!res.ok) throw new Error('Failed to fetch products by category');
        return res.json();
      })
      .then((data) => {
        setProductsByCategory(data || {});
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  if (loading) return React.createElement('div', { className: 'text-center py-8' }, 'Loading products...');
  if (error) return React.createElement('div', { className: 'text-center py-8 text-red-500' }, error);

  // Category icons (simple emoji for demo, can be replaced with SVGs)
  const categoryIcons: Record<string, string> = {
    'Seed based Energy Bar': '🌱',
    'Nuts based Energy Bar': '🥜',
    'Dark Chocolates': '🍫',
    'Milk Chocolates': '🥛',
    'Indian Super Food Fusion': '✨',
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f8fafc] to-[#e0e7ef] py-8">
      <h1 className="text-4xl font-extrabold text-center mb-12 text-primary drop-shadow">Our Products</h1>
      {Object.entries(productsByCategory).map(([category, products], idx) => (
        <section
          key={category}
          className={`rounded-2xl shadow-lg mb-12 px-4 py-8 max-w-7xl mx-auto bg-white/80 backdrop-blur-[2px] border border-gray-200 ${idx % 2 === 0 ? 'animate-fade-in-up' : 'animate-fade-in-down'}`}
        >
          <div className="w-full flex items-center gap-3 mb-6">
              <h2 className="text-2xl md:text-3xl font-bold w-full text-center" style={{ backgroundColor: '#1f392f', margin: 0, padding: '0.75rem 1.5rem', borderRadius: '1rem', color: '#fff' }}>
                {category}
              </h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6 lg:gap-8">
            {(products as any[]).map((product: any, i: number) => (
              <div key={product.id} style={{ animationDelay: `${i * 60}ms` }}>
                <ProductCard product={product} onAddToCart={handleAdd} productsAll={allProducts} />
              </div>
            ))}
          </div>
        </section>
      ))}

      {/* Cart Modal (Sheet) */}
      <Sheet open={showCart} onOpenChange={open => { if (!open) closeCart(); }}>
        <SheetContent side="right" className="w-full sm:max-w-lg">
          <CartSheet />
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default ProductsPage;
