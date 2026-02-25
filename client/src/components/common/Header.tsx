import { useState } from "react";
import { Link, useLocation } from "wouter";
import { ShoppingCart, Heart, Search, Menu, User, LogOut, PackageSearch, LayoutDashboard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCart } from "@/contexts/CartContext";
import { useWishlist } from "@/contexts/WishlistContext";
import { useAuth } from "@/hooks/use-auth";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

export function Header() {
  const [searchTerm, setSearchTerm] = useState("");
  const [, setLocation] = useLocation();
  const { cartCount } = useCart();
  const { wishlist } = useWishlist();
  const { user, logout } = useAuth();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      setLocation(`/search?q=${encodeURIComponent(searchTerm.trim())}`);
    }
  };

  return (
    <header className="bg-primary text-primary-foreground sticky top-0 z-50 shadow-md">
      {/* Top Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          
          {/* Logo */}
          <Link href="/" className="flex-shrink-0 flex items-center gap-2 text-2xl font-display font-bold text-white hover:text-accent transition-colors">
            <PackageSearch className="w-8 h-8 text-accent" />
            <span>Laptop<span className="text-accent">Store</span></span>
          </Link>

          {/* Search Bar - Hidden on mobile, flex on md */}
          <form onSubmit={handleSearch} className="hidden md:flex flex-1 max-w-2xl mx-8 relative group">
            <Input
              type="text"
              placeholder="Search laptops, brands, or specs..."
              className="w-full pl-4 pr-12 py-2 rounded-lg text-foreground bg-white border-none focus-visible:ring-2 focus-visible:ring-accent"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <Button 
              type="submit" 
              size="icon"
              className="absolute right-0 top-0 bottom-0 rounded-l-none rounded-r-lg bg-accent hover:bg-accent/90 text-primary"
            >
              <Search className="w-5 h-5" />
            </Button>
          </form>

          {/* Actions */}
          <div className="flex items-center gap-2 sm:gap-4">
            {/* Account Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex flex-col items-start gap-0 h-auto py-1 px-2 hover:bg-white/10 text-white border-0">
                  <span className="text-[10px] text-gray-300 font-medium">Hello, {user ? user.name.split(' ')[0] : 'Sign in'}</span>
                  <span className="text-sm font-bold flex items-center">
                    Account & Lists
                  </span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 mt-2">
                {user ? (
                  <>
                    <DropdownMenuLabel>
                      <div className="flex flex-col">
                        <span>{user.name}</span>
                        <span className="text-xs text-muted-foreground font-normal">{user.email}</span>
                      </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {user.role === 'admin' && (
                      <DropdownMenuItem onClick={() => setLocation("/admin")} className="cursor-pointer">
                        <LayoutDashboard className="w-4 h-4 mr-2" /> Admin Dashboard
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem onClick={() => setLocation("/orders")} className="cursor-pointer">
                      <PackageSearch className="w-4 h-4 mr-2" /> My Orders
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => logout()} className="cursor-pointer text-destructive focus:text-destructive">
                      <LogOut className="w-4 h-4 mr-2" /> Sign Out
                    </DropdownMenuItem>
                  </>
                ) : (
                  <>
                    <div className="p-4 flex flex-col gap-2 items-center">
                      <Button onClick={() => setLocation("/auth")} className="w-full bg-accent hover:bg-accent/90 text-primary font-semibold">
                        Sign In
                      </Button>
                      <div className="text-xs text-center mt-1">
                        New customer? <Link href="/auth" className="text-blue-600 hover:underline">Start here.</Link>
                      </div>
                    </div>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Wishlist */}
            <Link href="/wishlist" className="relative p-2 hover:bg-white/10 rounded-md transition-colors hidden sm:block text-white">
              <Heart className="w-6 h-6" />
              {wishlist.length > 0 && (
                <span className="absolute top-0 right-0 bg-accent text-primary text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center translate-x-1 -translate-y-1">
                  {wishlist.length}
                </span>
              )}
            </Link>

            {/* Cart */}
            <Link href="/cart" className="relative flex items-end p-2 hover:bg-white/10 rounded-md transition-colors text-white">
              <div className="relative">
                <ShoppingCart className="w-8 h-8" />
                <span className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-2 text-accent font-bold text-sm">
                  {cartCount}
                </span>
              </div>
              <span className="font-bold hidden sm:inline-block ml-1">Cart</span>
            </Link>
          </div>
        </div>

        {/* Mobile Search */}
        <form onSubmit={handleSearch} className="md:hidden pb-3 relative">
          <Input
            type="text"
            placeholder="Search laptops..."
            className="w-full pl-4 pr-12 text-foreground bg-white"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <Button type="submit" size="icon" className="absolute right-0 top-0 bg-accent hover:bg-accent/90 text-primary rounded-l-none">
            <Search className="w-4 h-4" />
          </Button>
        </form>
      </div>

      {/* Categories Bar */}
      <div className="bg-secondary text-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-10 flex items-center gap-6 overflow-x-auto whitespace-nowrap hide-scrollbar">
          <button className="flex items-center gap-1 hover:text-accent font-medium text-white transition-colors">
            <Menu className="w-4 h-4" /> All
          </button>
          <Link href="/category/gaming" className="hover:text-accent text-gray-200 transition-colors">Gaming Laptops</Link>
          <Link href="/category/ultrabooks" className="hover:text-accent text-gray-200 transition-colors">Ultrabooks</Link>
          <Link href="/category/business" className="hover:text-accent text-gray-200 transition-colors">Business & Work</Link>
          <Link href="/category/creators" className="hover:text-accent text-gray-200 transition-colors">For Creators</Link>
          <Link href="/deals" className="hover:text-accent text-accent font-medium transition-colors">Today's Deals</Link>
        </div>
      </div>
    </header>
  );
}
