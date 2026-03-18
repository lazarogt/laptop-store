import { Product } from "@shared/schema";
import { PremiumProductCard } from "@/components/premium/ProductCard";

interface ProductCardProps {
  product: Product;
}

export function ProductCard({ product }: ProductCardProps) {
  return <PremiumProductCard product={product} />;
}
