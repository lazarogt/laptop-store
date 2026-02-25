import { Link } from "wouter";
import { ArrowRight, Laptop, ShieldCheck, Truck, Zap } from "lucide-react";
import { Header } from "@/components/common/Header";
import { Footer } from "@/components/common/Footer";
import { ProductCard } from "@/components/product/ProductCard";
import { useProducts } from "@/hooks/use-products";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export default function HomePage() {
  const { data: products, isLoading } = useProducts({ sort: "rating" });
  
  // Fake featured/deals splitting
  const featured = products?.slice(0, 4) || [];
  const deals = products?.filter(p => p.badges?.includes("Oferta")).slice(0, 4) || products?.slice(4, 8) || [];

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative bg-primary text-white overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-primary to-transparent z-10" />
          {/* landing page hero gaming laptop setup */}
          <img 
            src="https://images.unsplash.com/photo-1593640408182-31c70c8268f5?w=1920&auto=format&fit=crop&q=80" 
            alt="Premium Laptops" 
            className="absolute inset-0 w-full h-full object-cover opacity-50"
          />
          <div className="relative z-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 md:py-32 flex flex-col justify-center">
            <span className="text-accent font-bold tracking-wider uppercase mb-4 block">New Arrivals</span>
            <h1 className="text-4xl md:text-6xl font-display font-extrabold max-w-2xl leading-tight mb-6">
              Power Your Potential with Next-Gen Tech
            </h1>
            <p className="text-lg md:text-xl text-gray-300 max-w-xl mb-8">
              Discover our exclusive collection of high-performance laptops designed for creators, gamers, and professionals.
            </p>
            <div className="flex flex-wrap gap-4">
              <Button asChild size="lg" className="bg-accent hover:bg-accent/90 text-primary font-bold px-8">
                <Link href="/search">Shop Now</Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="border-white text-white hover:bg-white/10">
                <Link href="/category/gaming">Explore Gaming</Link>
              </Button>
            </div>
          </div>
        </section>

        {/* Features Bar */}
        <section className="bg-white border-b">
          <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center divide-x divide-border/50">
              <div className="flex flex-col items-center gap-2">
                <Truck className="w-8 h-8 text-accent" />
                <h4 className="font-bold text-foreground">Free Shipping</h4>
                <p className="text-xs text-muted-foreground">On orders over $500</p>
              </div>
              <div className="flex flex-col items-center gap-2">
                <ShieldCheck className="w-8 h-8 text-accent" />
                <h4 className="font-bold text-foreground">2-Year Warranty</h4>
                <p className="text-xs text-muted-foreground">Included on all laptops</p>
              </div>
              <div className="flex flex-col items-center gap-2">
                <Zap className="w-8 h-8 text-accent" />
                <h4 className="font-bold text-foreground">Fast Processing</h4>
                <p className="text-xs text-muted-foreground">Dispatched within 24h</p>
              </div>
              <div className="flex flex-col items-center gap-2">
                <Laptop className="w-8 h-8 text-accent" />
                <h4 className="font-bold text-foreground">Expert Support</h4>
                <p className="text-xs text-muted-foreground">24/7 technical assistance</p>
              </div>
            </div>
          </div>
        </section>

        {/* Top Rated */}
        <section className="max-w-7xl mx-auto px-4 py-16 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-3xl font-display font-bold text-foreground">Featured Laptops</h2>
            <Link href="/search" className="flex items-center text-primary font-medium hover:text-accent transition-colors">
              See all <ArrowRight className="w-4 h-4 ml-1" />
            </Link>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {isLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="space-y-4">
                  <Skeleton className="w-full aspect-video rounded-xl" />
                  <Skeleton className="h-4 w-2/3" />
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-8 w-1/3" />
                </div>
              ))
            ) : (
              featured.map(product => <ProductCard key={product.id} product={product} />)
            )}
          </div>
        </section>

        {/* Promo Banner */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-secondary rounded-2xl p-8 md:p-12 flex flex-col md:flex-row items-center justify-between gap-8 relative overflow-hidden">
            <div className="relative z-10 text-white max-w-lg">
              <Badge className="bg-destructive text-white mb-4 hover:bg-destructive">Limited Time Offer</Badge>
              <h2 className="text-3xl md:text-4xl font-display font-bold mb-4">Upgrade Your Setup Today</h2>
              <p className="text-gray-300 mb-6">Get up to 20% off selected Ultrabooks and Business laptops. Don't miss out on these exclusive deals.</p>
              <Button asChild className="bg-white text-primary hover:bg-gray-100 font-bold px-8">
                <Link href="/deals">View Deals</Link>
              </Button>
            </div>
            {/* landing page promo generic laptop */}
            <img 
              src="https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=800&auto=format&fit=crop&q=80" 
              alt="Promo laptop" 
              className="w-full max-w-sm rounded-lg shadow-2xl relative z-10 border-4 border-white/10"
            />
            {/* Decorative background shapes */}
            <div className="absolute -top-24 -right-24 w-96 h-96 bg-accent rounded-full opacity-20 blur-3xl" />
            <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-primary rounded-full opacity-50 blur-3xl" />
          </div>
        </section>

        {/* Today's Deals */}
        {deals.length > 0 && (
          <section className="max-w-7xl mx-auto px-4 py-16 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-3xl font-display font-bold text-foreground">Today's Deals</h2>
              <Link href="/deals" className="flex items-center text-primary font-medium hover:text-accent transition-colors">
                View all deals <ArrowRight className="w-4 h-4 ml-1" />
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {deals.map(product => <ProductCard key={product.id} product={product} />)}
            </div>
          </section>
        )}
      </main>

      <Footer />
    </div>
  );
}
