import { memo } from "react";
import { motion } from "framer-motion";
import { Product } from "@shared/schema";
import { Skeleton } from "@/components/ui/skeleton";
import { PremiumProductCard } from "./ProductCard";

type ProductGridProps = {
  products: Product[];
  isLoading?: boolean;
  skeletonCount?: number;
  emptyTitle?: string;
  emptyDescription?: string;
};

const containerVariants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.05,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 14 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.28, ease: "easeOut" } },
};

function ProductGridComponent({
  products,
  isLoading = false,
  skeletonCount = 8,
  emptyTitle = "No se encontraron productos",
  emptyDescription = "Prueba ajustando tu búsqueda o filtros.",
}: ProductGridProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4 xl:gap-8">
        {Array.from({ length: skeletonCount }).map((_, idx) => (
          <div key={idx} className="rounded-2xl border border-slate-200/70 bg-white p-4 shadow-sm">
            <Skeleton className="h-44 w-full rounded-2xl" />
            <Skeleton className="mt-4 h-4 w-1/3" />
            <Skeleton className="mt-3 h-5 w-5/6" />
            <Skeleton className="mt-2 h-5 w-2/3" />
            <Skeleton className="mt-6 h-10 w-full rounded-2xl" />
          </div>
        ))}
      </div>
    );
  }

  if (!products.length) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white px-6 py-16 text-center shadow-sm">
        <h3 className="text-xl font-semibold text-slate-900">{emptyTitle}</h3>
        <p className="mt-2 text-sm text-slate-500">{emptyDescription}</p>
      </div>
    );
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4 xl:gap-8"
    >
      {products.map((product) => (
        <motion.div key={product.id} variants={itemVariants}>
          <PremiumProductCard product={product} />
        </motion.div>
      ))}
    </motion.div>
  );
}

export const ProductGrid = memo(ProductGridComponent);
