import React from "react";
import ProductCard from "@/components/product-card";
import { useCart } from "@/context/CartContext";
import { useToast } from "@/hooks/use-toast";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import CartSheet from "@/components/cart-sheet";
import { useQuery, useQueryClient } from "@tanstack/react-query";

// Lightweight skeleton component (no JSX corruption risk)
function SkeletonGrid({ rows = 2, cols = 4 }) {
  const boxes: any[] = [];
  for (let i = 0; i < rows * cols; i++) {
    boxes.push(React.createElement('div', {
      key: i,
      className: 'animate-pulse rounded-xl bg-gray-200 h-48'
    }));
  }
  return React.createElement('div', { className: 'grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6 lg:gap-8' }, boxes);
}

// Fetcher for category JSON (static-first, no refetch after mount)
async function fetchProductsByCategory(){
  try {
    const res = await fetch('/productsByCategory.json', { cache: 'no-cache' });
    if(!res.ok) throw new Error('Failed to fetch');
    return await res.json();
  } catch(e){
    return {} as Record<string, any[]>; // degrade silently; separate error state handled below
  }
}



const ProductsPage = () => {
  const queryClient = useQueryClient();
  const { data: productsByCategory = {}, isLoading, isError, error } = useQuery<Record<string, any[]>>({
    queryKey: ['productsByCategory'],
    queryFn: fetchProductsByCategory,
    // Keep data infinitely fresh; user will rarely need hard refresh
    staleTime: Infinity,
    gcTime: 1000 * 60 * 60 * 6, // 6h cache retention
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  // Prewarm flat list for product detail suggestions (optional micro-UX boost)
  React.useEffect(()=>{
    const flat = Object.values(productsByCategory).flat();
    if(flat.length){
      queryClient.setQueryData(['products-all'], (prev:any)=> prev && Array.isArray(prev) && prev.length >= flat.length ? prev : flat);
    }
  },[productsByCategory, queryClient]);
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

  // Avoid flashing: if we have cached data, render it while background refetch (not used here since staleTime Infinity)
  const hasData = Object.keys(productsByCategory).length > 0;
  if (isLoading && !hasData) return React.createElement('div',{className:'min-h-screen bg-gradient-to-br from-[#f8fafc] to-[#e0e7ef] py-8'},
    React.createElement('h1',{className:'text-4xl font-extrabold text-center mb-12 text-primary drop-shadow'},'Our Products'),
    React.createElement(SkeletonGrid,{})
  );
  if (isError && !hasData) return React.createElement('div', { className: 'text-center py-8 text-red-500' }, (error as any)?.message || 'Failed to load products');

  // Category icons (simple emoji for demo, can be replaced with SVGs)
  const categoryIcons: Record<string, string> = {
    'Seed based Energy Bar': '🌱',
    'Nuts based Energy Bar': '🥜',
    'Dark Chocolates': '🍫',
    'Milk Chocolates': '🥛',
    'Indian Super Food Fusion': '✨',
  'Combo': '🎁',
  };

  // Enforce allowed category ordering & suppress unknown categories from user view (they can still exist in data)
  const CATEGORY_ORDER = [
    'Seed based Energy Bar',
    'Nuts based Energy Bar',
    'Dark Chocolates',
    'Milk Chocolates',
    'Indian Super Food Fusion',
    'Combo'
  ];
  const orderedEntries = Object.entries(productsByCategory)
    .filter(([cat]) => CATEGORY_ORDER.includes(cat))
    .sort((a,b)=> CATEGORY_ORDER.indexOf(a[0]) - CATEGORY_ORDER.indexOf(b[0]));

  const sections = orderedEntries.map(([category, products], idx) => {
    const header = React.createElement('div', { className: 'w-full flex items-center gap-3 mb-6' },
      React.createElement('h2', {
        className: 'text-2xl md:text-3xl font-bold w-full text-center',
        style: { backgroundColor: '#1f392f', margin: 0, padding: '0.75rem 1.5rem', borderRadius: '1rem', color: '#fff' }
      }, category)
    );
    const grid = React.createElement('div', { className: 'grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6 lg:gap-8' },
      (products as any[]).map((product: any, i: number) => React.createElement('div', {
        key: (product.id || product._id || product.slug || i) as any,
        style: { animationDelay: `${i * 60}ms` }
      }, React.createElement(ProductCard, { product, onAddToCart: handleAdd, productsAll: allProducts })))
    );
    return React.createElement('section', {
      key: category,
      className: `rounded-2xl shadow-lg mb-12 px-4 py-8 max-w-7xl mx-auto bg-white/80 backdrop-blur-[2px] border border-gray-200 ${idx % 2 === 0 ? 'animate-fade-in-up' : 'animate-fade-in-down'}`
    }, header, grid);
  });

  return React.createElement('div', { className: 'min-h-screen bg-gradient-to-br from-[#f8fafc] to-[#e0e7ef] py-8' },
    React.createElement('h1', { className: 'text-4xl font-extrabold text-center mb-12 text-primary drop-shadow' }, 'Our Products'),
    sections,
    React.createElement(Sheet, { open: showCart, onOpenChange: (open: boolean) => { if (!open) closeCart(); } },
      React.createElement(SheetContent, { side: 'right', className: 'w-full sm:max-w-lg' },
        React.createElement(CartSheet, {})
      )
    )
  );
};

export default ProductsPage;
