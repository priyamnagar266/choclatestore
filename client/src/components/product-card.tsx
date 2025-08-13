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
    <Card className="h-full hover:shadow-xl transition-shadow transform hover:scale-105 bg-neutral">
      <CardContent className="p-6">
        <img
          src={product.image}
          alt={product.name}
          className="w-full h-48 object-cover rounded-lg mb-4"
        />
        <h3 className="text-xl font-semibold text-primary mb-2">{product.name}</h3>
        <p className="text-gray-600 mb-4 text-sm leading-relaxed">{product.description}</p>
        
        <div className="flex flex-wrap gap-2 mb-4">
          {product.benefits.map((benefit) => (
            <Badge
              key={benefit}
              variant="secondary"
              className={`${getBenefitBadgeColor(benefit)} text-xs px-3 py-1`}
            >
              {benefit}
            </Badge>
          ))}
        </div>
        
        <div className="flex justify-between items-center">
          <span className="text-2xl font-bold text-secondary">
            {formatPrice((product as any).price)}
          </span>
          <Button
            onClick={() => onAddToCart(product)}
            className="bg-primary text-white hover:bg-green-800 transition-colors"
            disabled={product.inStock === 0}
          >
            {product.inStock === 0 ? "Out of Stock" : "Add to Cart"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
