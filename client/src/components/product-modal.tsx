import React, { useState, useCallback, useEffect } from "react";
import { Dialog, DialogContent, DialogTrigger, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { Product } from "@shared/schema";
import { formatPrice } from "@/lib/products";

interface ProductModalProps {
  product: Product;
  trigger?: React.ReactNode; // custom trigger (e.g., wrapping card)
  onAddToCart: (product: Product) => void;
}

// A self-contained modal for displaying product details
export function ProductModal({ product, trigger, onAddToCart }: ProductModalProps) {
  const [open, setOpen] = useState(false);
  const hasNutrition = [
    product.energyKcal,
    product.proteinG,
    product.carbohydratesG,
    product.totalSugarG,
    product.addedSugarG,
    product.totalFatG,
    product.saturatedFatG,
    product.transFatG,
  ].some(v => typeof v === 'number');

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
          <div className="relative w-full md:w-1/2 bg-gray-50 shrink-0">
            <img src={product.image} alt={product.name} className="w-full h-60 md:h-full object-cover md:max-h-[92vh]" />
          </div>
          <div className="flex flex-col md:w-1/2 overflow-y-auto">
            <div className="p-6 md:p-8 pb-28 md:pb-8 space-y-6">
              <div>
                <DialogTitle className="text-2xl font-semibold text-primary leading-tight">
                  {product.name}
                </DialogTitle>
                <DialogDescription className="mt-2 text-sm md:text-base text-muted-foreground leading-relaxed">
                  {product.description}
                </DialogDescription>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-2xl font-bold text-secondary">
                  {formatPrice(product.price)}
                </span>
              </div>
              {hasNutrition && (
                <div className="mt-2">
                  <h4 className="text-sm font-semibold mb-2 text-primary">Nutritional Information (per serving)</h4>
                  <div className="overflow-x-auto border rounded-md">
                    <table className="w-full text-xs md:text-sm">
                      <tbody>
                        {product.energyKcal !== undefined && <TableRow label="Energy (Kcal)" value={product.energyKcal} />}
                        {product.proteinG !== undefined && <TableRow label="Protein (g)" value={product.proteinG} />}
                        {product.carbohydratesG !== undefined && <TableRow label="Carbohydrates (g)" value={product.carbohydratesG} />}
                        {product.totalSugarG !== undefined && <TableRow label="Total Sugar (g)" value={product.totalSugarG} />}
                        {product.addedSugarG !== undefined && <TableRow label="Added Sugar (g)" value={product.addedSugarG} />}
                        {product.totalFatG !== undefined && <TableRow label="Total Fat (g)" value={product.totalFatG} />}
                        {product.saturatedFatG !== undefined && <TableRow label="Saturated Fat (g)" value={product.saturatedFatG} />}
                        {product.transFatG !== undefined && <TableRow label="Trans Fat (g)" value={product.transFatG} />}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
            <div className="absolute md:static inset-x-0 bottom-0 md:inset-auto bg-white/95 md:bg-transparent backdrop-blur md:backdrop-blur-0 border-t md:border-t-0 px-4 md:px-8 py-4 md:py-0">
              <Button
                onClick={() => onAddToCart(product)}
                disabled={product.inStock === 0}
                className="w-full bg-primary hover:bg-green-800 text-white"
              >
                {product.inStock === 0 ? "Out of Stock" : "Add to Cart"}
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
