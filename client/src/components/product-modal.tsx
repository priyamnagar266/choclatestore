import React, { useState, useCallback, useEffect } from "react";
import { Dialog, DialogContent, DialogTrigger, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { Product } from "@shared/schema";

import ProductShare from "@/components/ProductShare";
import { formatPrice } from "@/lib/products";

interface ProductModalProps {
  product: Product;
  trigger?: React.ReactNode; // custom trigger (e.g., wrapping card)
  onAddToCart: (product: Product) => void;
  // Optional full product list for suggestions (avoid refetch); if absent we try window.__ALL_PRODUCTS
  productsAll?: Product[];
  maxSuggestions?: number;
}

// A self-contained modal for displaying product details
export function ProductModal({ product, trigger, onAddToCart, productsAll, maxSuggestions = 2 }: ProductModalProps) {
  const [open, setOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<Product[]>([]);
  const [currentProduct, setCurrentProduct] = useState<Product>(product);
  const scrollRef = React.useRef<HTMLDivElement | null>(null); // inner content
  const scrollContainerRef = React.useRef<HTMLDivElement | null>(null); // outer scrollable column
  const [animKey, setAnimKey] = useState(0); // increment to trigger CSS animation

  // Sync current product if prop changes while closed
  useEffect(()=>{ if(!open) setCurrentProduct(product); }, [product, open]);

  const hasNutrition = [
    currentProduct.energyKcal,
    currentProduct.proteinG,
    currentProduct.carbohydratesG,
    currentProduct.totalSugarG,
    currentProduct.addedSugarG,
    currentProduct.totalFatG,
    currentProduct.saturatedFatG,
    currentProduct.transFatG,
  ].some(v => v !== undefined && v !== null && (typeof v !== 'string' || v !== '') && !isNaN(Number(v)));

  // Handle browser history for modal
  useEffect(() => {
    if (!open) return;
    // Push a new state when modal opens
    window.history.pushState({ modal: true }, "");
    const onPopState = (e: PopStateEvent) => {
      setOpen(false);
    };
    window.addEventListener("popstate", onPopState);
    return () => {
      window.removeEventListener("popstate", onPopState);
      // If modal is closed by other means, go back in history if state was pushed
      if (window.history.state && window.history.state.modal) {
        window.history.back();
      }
    };
  }, [open]);

  const handleOpenChange = useCallback((nextOpen: boolean) => {
    setOpen(nextOpen);
  }, []);

  // Helper to recalc suggestions
  const recomputeSuggestions = useCallback(()=>{
    try {
      // If productsAll is an empty array (captured before products loaded), fall back to global each time
      const globalList: any = (window as any).__ALL_PRODUCTS;
      const list: any = (productsAll && productsAll.length > 0 ? productsAll : globalList);
      if(!Array.isArray(list) || !currentProduct) { setSuggestions([]); return; }
      const currentId = (currentProduct as any).id ?? (currentProduct as any)._id;
      const same = list.filter((p: any)=> ((p.id ?? p._id) !== currentId) && p.category === currentProduct.category);
      const others = list.filter((p: any)=> ((p.id ?? p._id) !== currentId) && p.category !== currentProduct.category);
      const combined = [...same, ...others];
      const finalList = combined.length ? combined : list.filter((p: any)=> (p.id ?? p._id) !== currentId);
      const next = finalList.slice(0, maxSuggestions);
      setSuggestions(next);
      try { console.log('[ProductModal] recomputeSuggestions', { listLen: list.length, same: same.length, others: others.length, chosen: next.map((p: any)=>p.name) }); } catch {}
      if(next.length === 0) {
        // Retry once shortly after in case products weren't ready at first pass
    setTimeout(()=>{
          try {
      const retryList: any = (productsAll && productsAll.length > 0 ? productsAll : (window as any).__ALL_PRODUCTS);
            if(!Array.isArray(retryList)) return;
            const retry = retryList.filter((p: any)=> (p.id ?? p._id) !== currentId).slice(0, maxSuggestions);
            if(retry.length) { setSuggestions(retry); console.log('[ProductModal] retry produced suggestions', retry.map((p:any)=>p.name)); }
          } catch {}
        }, 60);
      }
    } catch (e) { setSuggestions([]); try { console.warn('[ProductModal] suggestion error', e); } catch {} }
  },[productsAll, currentProduct, maxSuggestions]);

  // Recompute when modal opens or product changes
  useEffect(()=>{ if(open) recomputeSuggestions(); },[open, recomputeSuggestions]);
  // Listen for global products-ready event (when products load after modal opened quickly)
  useEffect(()=>{
    const handler = ()=> { if(open) recomputeSuggestions(); };
    window.addEventListener('products-ready', handler);
    return ()=> window.removeEventListener('products-ready', handler);
  },[open, recomputeSuggestions]);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button variant="ghost" className="p-0 h-auto w-auto text-left">
            View
          </Button>
        )}
      </DialogTrigger>
    <DialogContent className="max-w-5xl w-full p-0 overflow-hidden max-h-[92vh] flex flex-col">
        <div className="flex flex-col md:flex-row flex-1 overflow-hidden">
          <div className="relative w-full md:w-1/2 bg-gray-50 shrink-0 flex items-center justify-center">
            <div key={animKey} className="w-full h-60 md:h-full md:max-h-[92vh] overflow-hidden">
              <img
                src={currentProduct.image}
                alt={currentProduct.name}
                className="w-full h-full object-cover object-top md:object-center fade-swap"
              />
            </div>
          </div>
  <div className="flex flex-col md:w-1/2 overflow-y-auto" ref={scrollContainerRef}>
    <div ref={scrollRef} className="p-6 md:p-8 pb-28 md:pb-8 space-y-6 transition-opacity duration-200">
              <div className="flex items-center gap-2">
                <DialogTitle className="text-2xl font-semibold text-primary leading-tight">
                  {currentProduct.name}
                </DialogTitle>
                <ProductShare
                  name={currentProduct.name}
                  url={typeof window !== 'undefined' ? window.location.origin + '/products/' + (currentProduct.id || currentProduct._id) : ''}
                  image={currentProduct.image}
                />
              </div>
              <DialogDescription className="mt-2 text-sm md:text-base text-muted-foreground leading-relaxed">
                {currentProduct.description}
              </DialogDescription>
              <div className="flex items-center gap-4">
                <span className="text-2xl font-bold text-secondary">
      {formatPrice(currentProduct.price)}
                </span>
              </div>
              {hasNutrition && (
                <div className="mt-4">
                  <h4 className="text-sm font-semibold mb-2 text-primary">Nutritional Information (per serving)</h4>
                  <div className="overflow-x-auto border rounded-md">
                    <table className="w-full text-xs md:text-sm">
                      <tbody>
        {currentProduct.energyKcal !== undefined && (typeof currentProduct.energyKcal !== 'string' || currentProduct.energyKcal !== '') && !isNaN(Number(currentProduct.energyKcal)) && <TableRow label="Energy (Kcal)" value={Number(currentProduct.energyKcal)} />}
        {currentProduct.proteinG !== undefined && (typeof currentProduct.proteinG !== 'string' || currentProduct.proteinG !== '') && !isNaN(Number(currentProduct.proteinG)) && <TableRow label="Protein (g)" value={Number(currentProduct.proteinG)} />}
        {currentProduct.carbohydratesG !== undefined && (typeof currentProduct.carbohydratesG !== 'string' || currentProduct.carbohydratesG !== '') && !isNaN(Number(currentProduct.carbohydratesG)) && <TableRow label="Carbohydrates (g)" value={Number(currentProduct.carbohydratesG)} />}
        {currentProduct.totalSugarG !== undefined && (typeof currentProduct.totalSugarG !== 'string' || currentProduct.totalSugarG !== '') && !isNaN(Number(currentProduct.totalSugarG)) && <TableRow label="Total Sugar (g)" value={Number(currentProduct.totalSugarG)} />}
        {currentProduct.addedSugarG !== undefined && (typeof currentProduct.addedSugarG !== 'string' || currentProduct.addedSugarG !== '') && !isNaN(Number(currentProduct.addedSugarG)) && <TableRow label="Added Sugar (g)" value={Number(currentProduct.addedSugarG)} />}
        {currentProduct.totalFatG !== undefined && (typeof currentProduct.totalFatG !== 'string' || currentProduct.totalFatG !== '') && !isNaN(Number(currentProduct.totalFatG)) && <TableRow label="Total Fat (g)" value={Number(currentProduct.totalFatG)} />}
        {currentProduct.saturatedFatG !== undefined && (typeof currentProduct.saturatedFatG !== 'string' || currentProduct.saturatedFatG !== '') && !isNaN(Number(currentProduct.saturatedFatG)) && <TableRow label="Saturated Fat (g)" value={Number(currentProduct.saturatedFatG)} />}
        {currentProduct.transFatG !== undefined && (typeof currentProduct.transFatG !== 'string' || currentProduct.transFatG !== '') && !isNaN(Number(currentProduct.transFatG)) && <TableRow label="Trans Fat (g)" value={Number(currentProduct.transFatG)} />}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
              {suggestions.length > 0 && (
                <div className="mt-6">
                  <h4 className="text-sm font-semibold mb-3 text-primary">You might also like</h4>
                  <div className="grid grid-cols-2 gap-3">
                    {suggestions.map(s => (
                      <button key={(s as any).id || s._id} onClick={()=>{ setCurrentProduct(s); setAnimKey(k=>k+1); const target = scrollContainerRef.current || scrollRef.current; if(target){ try { target.scrollTo({ top: 0, behavior: 'smooth'}); } catch { target.scrollTop = 0; } } recomputeSuggestions(); }} className="group text-left border rounded-md p-2 hover:border-primary/50 focus:outline-none">
                        <img src={s.image} alt={s.name} className="w-full h-24 object-cover rounded mb-2" />
                        <div className="text-xs font-medium line-clamp-2 leading-snug group-hover:text-primary transition-colors">{s.name}</div>
                        <div className="text-[11px] text-muted-foreground">{formatPrice(s.price)}</div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {suggestions.length === 0 && ((productsAll || (window as any).__ALL_PRODUCTS)?.length > 1) && (
                <div className="mt-6 text-xs text-muted-foreground border rounded-md p-3">
                  (Suggestions loading...)
                </div>
              )}
            </div>
            <div className="sticky bottom-0 bg-white/95 backdrop-blur border-t px-4 md:px-8 py-4 mt-auto">
              <Button
                onClick={() => onAddToCart(currentProduct)}
                disabled={currentProduct.inStock === 0}
                className="w-full bg-primary hover:bg-green-800 text-white"
              >
                {currentProduct.inStock === 0 ? "Out of Stock" : "Add to Cart"}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface TableRowProps { label: string; value: number; }
function TableRow({ label, value }: TableRowProps) {
  return React.createElement(
    "tr",
    { className: "even:bg-neutral/40" },
    React.createElement(
      "td",
      { className: "py-1.5 px-3 font-medium text-primary whitespace-nowrap" },
      label
    ),
    React.createElement(
      "td",
      { className: "py-1.5 px-3 text-right tabular-nums" },
      value
    )
  );
}
