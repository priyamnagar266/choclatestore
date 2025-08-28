import React from "react";
import { Link } from "wouter";
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
  const { cart, addToCart, showCart, closeCart, openCart } = useCart();
  const { toast } = useToast();

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
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {(products as any[]).map((product: any, i: number) => {
              if (product.slug) {
                return (
                  <Link
                    key={product.id}
                    to={`/products/${product.slug}`}
                    className="transition-transform hover:scale-[1.03] hover:shadow-2xl rounded-xl bg-white/90 border border-gray-100 p-2 md:p-3 block"
                    style={{ animationDelay: `${i * 60}ms` }}
                  >
                    <ProductCard product={product} onAddToCart={() => {
                      addToCart(product);
                      toast({
                        title: "Added to cart!",
                        description: `${product.name} has been added to your cart.`,
                      });
                    }} withModal={false} />
                  </Link>
                );
              } else {
                return (
                  <div
                    key={product.id}
                    className="transition-transform rounded-xl bg-white/90 border border-gray-100 p-2 md:p-3 block opacity-50 cursor-not-allowed"
                    style={{ animationDelay: `${i * 60}ms` }}
                  >
                    <ProductCard product={product} onAddToCart={() => {
                      addToCart(product);
                      toast({
                        title: "Added to cart!",
                        description: `${product.name} has been added to your cart.`,
                      });
                    }} withModal={false} />
                  </div>
                );
              }
            })}
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
