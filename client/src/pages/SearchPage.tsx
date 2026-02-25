import { useState, useEffect } from "react";
import { Header } from "@/components/common/Header";
import { Footer } from "@/components/common/Footer";
import { ProductCard } from "@/components/product/ProductCard";
import { useProducts } from "@/hooks/use-products";
import { Skeleton } from "@/components/ui/skeleton";
import { useLocation } from "wouter";

export default function SearchPage() {
  const [location] = useLocation();
  const searchParams = new URLSearchParams(window.location.search);
  const q = searchParams.get('q') || '';
  const category = location.startsWith('/category/') ? location.split('/').pop() : '';

  const [sort, setSort] = useState("rating");
  
  const queryParams: Record<string, string> = { sort };
  if (q) queryParams.search = q;
  if (category && category !== 'search') queryParams.category = category;

  const { data: products, isLoading } = useProducts(queryParams);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-display font-bold capitalize">
              {q ? `Search results for "${q}"` : category ? `${category} Laptops` : 'All Laptops'}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {products?.length || 0} items found
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium whitespace-nowrap">Sort by:</label>
            <select 
              className="border rounded-lg p-2 bg-card text-sm focus:outline-none focus:border-accent"
              value={sort}
              onChange={(e) => setSort(e.target.value)}
            >
              <option value="rating">Top Rated</option>
              <option value="price_asc">Price: Low to High</option>
              <option value="price_desc">Price: High to Low</option>
              <option value="newest">Newest Arrivals</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {isLoading ? (
            Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="space-y-4 bg-card p-4 rounded-xl border">
                <Skeleton className="w-full aspect-video rounded-lg" />
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-8 w-1/3" />
              </div>
            ))
          ) : products && products.length > 0 ? (
            products.map(product => <ProductCard key={product.id} product={product} />)
          ) : (
            <div className="col-span-full py-24 text-center">
              <h2 className="text-xl font-bold mb-2">No products found</h2>
              <p className="text-muted-foreground">Try adjusting your search or filters.</p>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
