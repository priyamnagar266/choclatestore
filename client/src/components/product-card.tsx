import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import ProductShare from "./ProductShare";
import { Badge } from "@/components/ui/badge";
import { formatPrice, getBenefitBadgeColor } from "@/lib/products";
import type { Product } from "@shared/schema";


import { ProductModal } from "@/components/product-modal";

interface ProductCardProps {
  product: Product;
  onAddToCart: (product: Product) => void;
  onBuyNow?: (product: Product) => void;
  withModal?: boolean; // allow disabling modal wrapper if only small card is desired
  productsAll?: Product[];
}

export default function ProductCard({ product, onAddToCart, onBuyNow, withModal = true, productsAll }: ProductCardProps) {
  // Carousel state
  const images: string[] = Array.isArray(product.images) && product.images.length > 0 ? product.images : [product.image];
  // Determine effective base price / sale considering variants (show min variant price for card teaser)
  const variants: any[] = Array.isArray((product as any).variants) ? (product as any).variants : [];
  let basePrice = product.price as number;
  let salePrice: number | undefined = (product as any).salePrice;
  if (variants.length) {
    // pick cheapest variant (by salePrice if available else price)
    const priced = variants.map(v => ({
      price: v.price,
      sale: (v.salePrice != null && v.salePrice < v.price) ? v.salePrice : undefined
    }));
    const cheapest = priced.reduce((min, cur) => {
      const curEff = cur.sale ?? cur.price;
      const minEff = min.sale ?? min.price;
      return curEff < minEff ? cur : min;
    }, priced[0]);
    basePrice = cheapest.price;
    salePrice = cheapest.sale;
  }
  const discountPct = typeof salePrice === 'number' && salePrice < basePrice && basePrice > 0
    ? Math.round((1 - (salePrice / basePrice)) * 100)
    : null;

  const card = React.createElement(
    Card as any,
    {
      className: "h-full cursor-pointer hover:shadow-xl transition-shadow hover:scale-[1.02] bg-white anim-zoom-in anim-visible",
      'data-anim': ''
    },
    React.createElement(
      CardContent,
      { className: "p-4 sm:p-5" },
      React.createElement(
        "div",
        { className: "relative w-full mb-3 sm:mb-4" },
        React.createElement("img", {
          src: images[0],
          alt: product.name,
          loading: "lazy",
          className: "w-full h-28 xs:h-32 sm:h-40 md:h-48 object-cover rounded-md"
        }),
        product.bestseller ? React.createElement('span', {
          className: 'absolute top-2 right-2 bg-yellow-400 text-yellow-900 text-[9px] xs:text-[10px] font-bold px-2 py-1 rounded shadow border border-yellow-500'
        }, 'Bestseller') : null,
        discountPct ? React.createElement('span', {
          className: 'absolute top-2 left-2 bg-red-600 text-white text-[10px] xs:text-[11px] font-bold tracking-wide px-2 py-1 rounded-md shadow'
        }, `-${discountPct}%`) : null
      ),
      React.createElement(
        "h3",
        { className: "text-sm xs:text-base sm:text-lg font-semibold text-primary mb-1 sm:mb-2 line-clamp-2" },
        product.name
      ),
      React.createElement(
        "p",
        { className: "text-gray-600 mb-3 sm:mb-4 text-[11px] xs:text-xs sm:text-sm leading-snug line-clamp-3" },
        product.description
      ),
      React.createElement(
        "div",
        { className: "flex flex-wrap gap-1.5 sm:gap-2 mb-3 sm:mb-4" },
        product.benefits?.map((benefit) =>
          React.createElement(
            Badge,
            {
              key: benefit,
              variant: "secondary" as const,
              className: `${getBenefitBadgeColor(benefit)} text-[10px] xs:text-[11px] sm:text-xs px-2.5 py-0.5`
            },
            benefit
          )
        )
      ),
  // ...existing code...
      React.createElement(
        "div",
        { className: "flex flex-col xs:flex-row justify-between items-stretch xs:items-center gap-2" },
        salePrice && salePrice < basePrice ? React.createElement(
          'div', { className: 'flex flex-row items-center gap-2' },
          React.createElement('span', { className: 'text-[12px] xs:text-sm sm:text-base font-bold text-secondary' }, formatPrice(salePrice)),
          React.createElement('span', { className: 'text-[10px] xs:text-xs sm:text-sm line-through text-gray-400' }, formatPrice(basePrice))
        ) : React.createElement(
          'span',
          { className: 'text-[10px] xs:text-xs sm:text-sm font-semibold text-secondary xs:mr-2' },
          formatPrice(basePrice)
        ),
        React.createElement(
          Button,
          {
            onClick: (e: React.MouseEvent) => {
              // Prevent parent Link (anchor) navigation when clicking Add to Cart
              e.preventDefault();
              e.stopPropagation();
              onAddToCart(product);
            },
            className: "bg-primary text-white hover:bg-green-800 transition-colors h-8 w-full xs:w-auto px-2 sm:px-3 text-xs sm:text-sm",
            disabled: product.inStock === 0
          },
          product.inStock === 0 ? "Out of Stock" : "Add to Cart"
        )
      )
    )
  );

  if (!withModal) return card;

  // Prefer explicit productsAll prop, fallback to window.__ALL_PRODUCTS
  const all = productsAll && productsAll.length > 0
    ? productsAll
    : (typeof window !== 'undefined' ? (window as any).__ALL_PRODUCTS : undefined);
  const passAll = Array.isArray(all) && all.length > 0 ? all : undefined;
  return React.createElement(ProductModal, { product, onAddToCart, trigger: card, productsAll: passAll });
}
