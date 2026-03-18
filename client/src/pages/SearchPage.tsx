import { useState } from "react";
import { SlidersHorizontal } from "lucide-react";
import { useLocation } from "wouter";
import { Layout } from "@/components/premium/Layout";
import { ProductGrid } from "@/components/premium/ProductGrid";
import { useProducts } from "@/hooks/use-products";
import { formatCategoryLabel, getProductCategoriesForStorefront, normalizeCategorySlug } from "@/utils/displayLabels";

export default function SearchPage() {
  const [location] = useLocation();
  const searchParams = new URLSearchParams(window.location.search);
  const query = searchParams.get("q") || "";
  const rawCategory = location.startsWith("/category/") ? location.split("/").pop() : "";
  const category = normalizeCategorySlug(rawCategory) ?? "";
  const isDealsPage = location === "/deals";
  const categoryLabel = formatCategoryLabel(category);
  const mappedCategories = getProductCategoriesForStorefront(category);

  const [sort, setSort] = useState("rating");
  const queryParams: Record<string, string> = { sort };

  if (query) queryParams.search = query;

  const { data: products, isLoading } = useProducts(queryParams);
  const visibleProducts = (products ?? []).filter((product) => {
    if (isDealsPage) {
      return product.badges?.some((badge) => badge.toLowerCase().includes("oferta"));
    }
    if (!category) return true;
    return mappedCategories.includes(product.category);
  });

  return (
    <Layout>
      <section className="mx-auto w-full max-w-[1280px] px-4 py-10 md:px-6">
        <div className="mb-8 flex flex-col justify-between gap-4 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm md:flex-row md:items-end">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-slate-900">
              {query
                ? `Resultados para "${query}"`
                : isDealsPage
                  ? "Ofertas destacadas"
                  : categoryLabel
                    ? `Laptops ${categoryLabel}`
                    : "Todas las laptops"}
            </h1>
            <p className="mt-1 text-sm text-slate-500">{visibleProducts.length} productos encontrados</p>
          </div>

          <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2">
            <SlidersHorizontal className="h-4 w-4 text-slate-500" />
            <label htmlFor="sort-products" className="text-sm font-medium text-slate-600">
              Ordenar por
            </label>
            <select
              id="sort-products"
              className="rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-sm text-slate-700 outline-none focus:border-slate-300"
              value={sort}
              onChange={(event) => setSort(event.target.value)}
            >
              <option value="rating">Mejor valorados</option>
              <option value="price_asc">Precio: menor a mayor</option>
              <option value="price_desc">Precio: mayor a menor</option>
              <option value="newest">Más recientes</option>
            </select>
          </div>
        </div>

        <ProductGrid products={visibleProducts} isLoading={isLoading} skeletonCount={8} />
      </section>
    </Layout>
  );
}
