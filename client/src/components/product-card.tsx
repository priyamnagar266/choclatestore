import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatPrice, getBenefitBadgeColor } from "@/lib/products";
import type { Product } from "@shared/schema";

interface ProductCardProps {
  product: Product;
  onAddToCart: (product: Product) => void;
}

export default function ProductCard({ product, onAddToCart }: ProductCardProps) {
  return (
    <Card data-anim className="h-full hover:shadow-xl transition-shadow hover:scale-[1.02] bg-white anim-zoom-in">
      <CardContent className="p-4 sm:p-5">
        <img
          src={product.image}
          alt={product.name}
          className="w-full h-28 xs:h-32 sm:h-40 md:h-48 object-cover rounded-md mb-3 sm:mb-4"
        />
        <h3 className="text-sm xs:text-base sm:text-lg font-semibold text-primary mb-1 sm:mb-2 line-clamp-2">{product.name}</h3>
        <p className="text-gray-600 mb-3 sm:mb-4 text-[11px] xs:text-xs sm:text-sm leading-snug line-clamp-3">{product.description}</p>
        
  <div className="flex flex-wrap gap-1.5 sm:gap-2 mb-3 sm:mb-4">
          {product.benefits.map((benefit) => (
            <Badge
              key={benefit}
              variant="secondary"
              className={`${getBenefitBadgeColor(benefit)} text-[10px] xs:text-[11px] sm:text-xs px-2.5 py-0.5`}
            >
              {benefit}
            </Badge>
          ))}
        </div>
        
        <div className="flex justify-between items-center gap-2">
          <span className="text-[10px] xs:text-xs sm:text-sm font-semibold text-secondary">
            {formatPrice((product as any).price)}
          </span>
          <Button
            onClick={() => onAddToCart(product)}
            className="bg-primary text-white hover:bg-green-800 transition-colors h-8 px-2 sm:px-3 text-xs sm:text-sm"
            disabled={product.inStock === 0}
          >
            {product.inStock === 0 ? "Out of Stock" : "Add to Cart"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
