import { memo, MouseEvent, useMemo } from "react";
import { Link } from "wouter";
import { motion, useMotionTemplate, useMotionValue, useSpring } from "framer-motion";
import { Heart, ShoppingCart } from "lucide-react";
import { Product } from "@shared/schema";
import { useCart } from "@/contexts/CartContext";
import { useWishlist } from "@/contexts/WishlistContext";
import { formatCurrency } from "@/utils/formatCurrency";
import { RatingStars } from "./RatingStars";
import { PremiumBadge } from "./Badge";
import { IconButton } from "./IconButton";

const TILT_LIMIT = 6;

type PremiumProductCardProps = {
  product: Product;
};

function ProductCardComponent({ product }: PremiumProductCardProps) {
  const { addToCart } = useCart();
  const { toggleWishlist, isInWishlist } = useWishlist();
  const inWishlist = isInWishlist(product.id);

  const mainImage = useMemo(
    () =>
      product.images?.[0] ||
      "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=1000&auto=format&fit=crop&q=80",
    [product.images]
  );

  const rotateX = useMotionValue(0);
  const rotateY = useMotionValue(0);
  const pointerX = useMotionValue(50);
  const pointerY = useMotionValue(50);

  const smoothRotateX = useSpring(rotateX, { stiffness: 220, damping: 24, mass: 0.6 });
  const smoothRotateY = useSpring(rotateY, { stiffness: 220, damping: 24, mass: 0.6 });
  const reflection = useMotionTemplate`radial-gradient(320px circle at ${pointerX}% ${pointerY}%, rgba(255,255,255,0.52), transparent 45%)`;

  const handlePointerMove = (event: MouseEvent<HTMLElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const rotateYValue = ((x - centerX) / centerX) * TILT_LIMIT;
    const rotateXValue = ((centerY - y) / centerY) * TILT_LIMIT;

    rotateX.set(Math.max(-TILT_LIMIT, Math.min(TILT_LIMIT, rotateXValue)));
    rotateY.set(Math.max(-TILT_LIMIT, Math.min(TILT_LIMIT, rotateYValue)));
    pointerX.set((x / rect.width) * 100);
    pointerY.set((y / rect.height) * 100);
  };

  const handlePointerLeave = () => {
    rotateX.set(0);
    rotateY.set(0);
    pointerX.set(50);
    pointerY.set(50);
  };

  return (
    <div className="group [perspective:1200px]">
      <motion.article
        onMouseMove={handlePointerMove}
        onMouseLeave={handlePointerLeave}
        style={{ rotateX: smoothRotateX, rotateY: smoothRotateY }}
        whileHover={{
          scale: 1.03,
          boxShadow: "0 24px 50px -26px rgba(15, 23, 42, 0.46)",
        }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        className="relative h-full overflow-hidden rounded-2xl border border-slate-200/90 bg-white p-4 shadow-sm [transform-style:preserve-3d]"
      >
        <motion.div
          aria-hidden="true"
          style={{ background: reflection }}
          className="pointer-events-none absolute inset-0 z-10 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        />

        <div className="relative z-20 mb-4 flex items-start justify-between">
          {product.badges && product.badges.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {product.badges.slice(0, 2).map((badge, idx) => (
                <PremiumBadge key={`${badge}-${idx}`} tone={badge.toLowerCase().includes("oferta") ? "danger" : "accent"}>
                  {badge}
                </PremiumBadge>
              ))}
            </div>
          ) : (
            <span />
          )}
          <IconButton
            icon={<Heart className={`h-4 w-4 ${inWishlist ? "fill-current" : ""}`} />}
            label="Favoritos"
            isActive={inWishlist}
            onClick={() => toggleWishlist(product)}
          />
        </div>

        <Link href={`/product/${product.slug}`} className="relative z-20 block">
          <div className="mb-5 rounded-2xl bg-gradient-to-b from-slate-50 to-white p-4">
            <motion.img
              src={mainImage}
              alt={product.name}
              loading="lazy"
              whileHover={{ y: -4 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="h-44 w-full object-contain"
            />
          </div>
        </Link>

        <div className="relative z-20 flex h-[calc(100%-18rem)] min-h-[170px] flex-col">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">{product.brand}</p>
          <Link href={`/product/${product.slug}`} className="mt-1">
            <h3 className="line-clamp-2 text-[15px] font-semibold leading-6 text-slate-900">{product.name}</h3>
          </Link>

          <div className="mt-2">
            <RatingStars rating={product.averageRating || 0} count={product.numReviews || 0} />
          </div>

          <div className="mt-auto flex items-end justify-between gap-3 pt-4">
            <div>
              <p className="text-2xl font-bold tracking-tight text-slate-900">{formatCurrency(product.price)}</p>
              {product.stock > 0 && product.stock < 10 ? (
                <p className="text-xs font-medium text-rose-500">Solo quedan {product.stock}</p>
              ) : null}
            </div>
            <motion.button
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.95 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              onClick={() => addToCart(product)}
              disabled={product.stock === 0}
              className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-md transition-colors duration-300 hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              <ShoppingCart className="h-4 w-4" />
              {product.stock === 0 ? "Agotado" : "Añadir"}
            </motion.button>
          </div>
        </div>
      </motion.article>
    </div>
  );
}

export const PremiumProductCard = memo(ProductCardComponent);
