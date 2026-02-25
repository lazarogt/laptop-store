import { Link } from "wouter";
import { Heart, ShoppingCart } from "lucide-react";
import { Product } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Rating } from "@/components/common/Rating";
import { useCart } from "@/contexts/CartContext";
import { useWishlist } from "@/contexts/WishlistContext";
import { formatCurrency } from "@/utils/formatCurrency";

interface ProductCardProps {
  product: Product;
}

export function ProductCard({ product }: ProductCardProps) {
  const { addToCart } = useCart();
  const { toggleWishlist, isInWishlist } = useWishlist();
  
  const inWishlist = isInWishlist(product.id);
  const mainImage = product.images?.[0] || "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=800&auto=format&fit=crop&q=60";

  return (
    <div className="group bg-card rounded-xl border border-border overflow-hidden hover-elevate flex flex-col h-full">
      <div className="relative aspect-video bg-white p-4 flex items-center justify-center overflow-hidden">
        <Link href={`/product/${product.slug}`} className="block w-full h-full">
          <img 
            src={mainImage} 
            alt={product.name} 
            className="w-full h-full object-contain mix-blend-multiply group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
          />
        </Link>
        <button 
          onClick={(e) => { e.preventDefault(); toggleWishlist(product); }}
          className={`absolute top-3 right-3 p-2 rounded-full shadow-sm transition-all duration-200 hover:scale-110 ${inWishlist ? 'bg-red-50 text-red-500' : 'bg-white text-gray-400 hover:text-red-500'}`}
        >
          <Heart className={`w-5 h-5 ${inWishlist ? 'fill-current' : ''}`} />
        </button>
        {product.badges && product.badges.length > 0 && (
          <div className="absolute top-3 left-3 flex flex-col gap-1">
            {product.badges.map((badge, i) => (
              <Badge key={i} className={badge.toLowerCase().includes('oferta') ? 'bg-destructive' : 'bg-primary'}>
                {badge}
              </Badge>
            ))}
          </div>
        )}
      </div>
      
      <div className="p-4 flex flex-col flex-1">
        <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider mb-1">{product.brand}</p>
        <Link href={`/product/${product.slug}`} className="hover:text-primary">
          <h3 className="font-semibold text-foreground line-clamp-2 leading-tight h-10 mb-2">
            {product.name}
          </h3>
        </Link>
        
        <div className="mb-2">
          <Rating rating={product.averageRating || 0} count={product.numReviews || 0} />
        </div>
        
        <div className="mt-auto pt-4 flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-xl font-display font-bold text-foreground">
              {formatCurrency(product.price)}
            </span>
            {product.stock < 10 && product.stock > 0 && (
              <span className="text-[10px] text-destructive font-medium">Only {product.stock} left</span>
            )}
          </div>
          
          <Button 
            onClick={() => addToCart(product)}
            disabled={product.stock === 0}
            size="sm"
            className="rounded-full bg-accent hover:bg-accent/90 text-primary font-semibold px-4 shadow-sm"
          >
            {product.stock === 0 ? "Out of Stock" : (
              <>
                <ShoppingCart className="w-4 h-4 mr-2" /> Add
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
