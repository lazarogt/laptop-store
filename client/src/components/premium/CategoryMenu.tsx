import { memo } from "react";
import { Link } from "wouter";
import { Grid2x2 } from "lucide-react";
import { motion } from "framer-motion";
import { storefrontCategoryLinks } from "@/utils/displayLabels";

const categoryLinks = [
  { href: "/search", label: "Catálogo completo" },
  ...storefrontCategoryLinks.map((category) => ({
    href: `/category/${category.slug}`,
    label: category.label,
  })),
  { href: "/deals", label: "Ofertas" },
];

function CategoryMenuComponent() {
  return (
    <nav className="border-b border-white/50 bg-white/55 backdrop-blur-xl">
      <div className="mx-auto flex h-11 w-full max-w-[1280px] items-center gap-5 overflow-x-auto px-4 md:px-6">
        <button className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 transition-colors hover:text-slate-900">
          <Grid2x2 className="h-4 w-4" />
          Categorías
        </button>
        {categoryLinks.map((link) => (
          <motion.div key={link.href} whileHover={{ y: -1 }} transition={{ duration: 0.2 }}>
            <Link href={link.href} className="whitespace-nowrap text-sm text-slate-600 transition-colors hover:text-slate-900">
              {link.label}
            </Link>
          </motion.div>
        ))}
      </div>
    </nav>
  );
}

export const CategoryMenu = memo(CategoryMenuComponent);
