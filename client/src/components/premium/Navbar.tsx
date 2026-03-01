import { useState } from "react";
import { Link, useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  Heart,
  LogOut,
  PackageSearch,
  LayoutDashboard,
  ShoppingCart,
  User,
} from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useCart } from "@/contexts/CartContext";
import { useWishlist } from "@/contexts/WishlistContext";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { SearchBar } from "./SearchBar";

export function PremiumNavbar() {
  const [searchTerm, setSearchTerm] = useState("");
  const [, setLocation] = useLocation();
  const { cartCount } = useCart();
  const { wishlist } = useWishlist();
  const { user, logout } = useAuth();

  const handleSearchSubmit = () => {
    const query = searchTerm.trim();
    if (!query) return;
    setLocation(`/search?q=${encodeURIComponent(query)}`);
  };

  return (
    <header className="sticky top-0 z-50 border-b border-white/60 bg-white/70 backdrop-blur-2xl">
      <div className="mx-auto flex h-20 w-full max-w-[1280px] items-center gap-4 px-4 md:px-6">
        <Link href="/" className="inline-flex min-w-fit items-center gap-2 text-xl font-semibold tracking-tight text-slate-900">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 bg-white shadow-sm">
            <PackageSearch className="h-5 w-5 text-slate-700" />
          </span>
          <span className="hidden sm:inline">LaptopStore</span>
        </Link>

        <div className="hidden flex-1 md:block">
          <SearchBar value={searchTerm} onChange={setSearchTerm} onSubmit={handleSearchSubmit} />
        </div>

        <div className="ml-auto flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className="inline-flex min-w-[42px] items-center gap-3 rounded-2xl border border-slate-200/90 bg-white/80 px-3 py-2 text-left shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:bg-white hover:shadow-md"
                type="button"
              >
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
                  <User className="h-4 w-4" />
                </span>
                <span className="hidden min-w-0 sm:block">
                  <span className="block truncate text-xs text-slate-500">
                    {user ? `Hola, ${user.name.split(" ")[0]}` : "Tu cuenta"}
                  </span>
                  <span className="block truncate text-sm font-semibold text-slate-800">
                    {user ? "Gestionar" : "Iniciar sesión"}
                  </span>
                </span>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64 rounded-2xl">
              {user ? (
                <>
                  <DropdownMenuLabel>
                    <div className="flex flex-col">
                      <span className="font-semibold">{user.name}</span>
                      <span className="text-xs text-muted-foreground">{user.email}</span>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {user.role === "admin" ? (
                    <DropdownMenuItem onClick={() => setLocation("/admin")} className="cursor-pointer">
                      <LayoutDashboard className="mr-2 h-4 w-4" />
                      Panel de administración
                    </DropdownMenuItem>
                  ) : null}
                  <DropdownMenuItem onClick={() => setLocation("/my-orders")} className="cursor-pointer">
                    <PackageSearch className="mr-2 h-4 w-4" />
                    Mis pedidos
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => logout()} className="cursor-pointer text-destructive focus:text-destructive">
                    <LogOut className="mr-2 h-4 w-4" />
                    Cerrar sesión
                  </DropdownMenuItem>
                </>
              ) : (
                <div className="p-2">
                  <Button
                    className="w-full rounded-xl bg-slate-900 text-white transition-all duration-300 hover:-translate-y-0.5 hover:bg-slate-800"
                    onClick={() => setLocation("/auth")}
                  >
                    Iniciar sesión
                  </Button>
                </div>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          <Link
            href="/wishlist"
            aria-label="Favoritos"
            title="Favoritos"
            className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200/80 bg-white/80 text-slate-600 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:bg-white hover:text-slate-900 hover:shadow-md"
          >
            <Heart className={`h-5 w-5 ${wishlist.length > 0 ? "fill-current text-rose-500" : ""}`} />
          </Link>

          <Link
            href="/cart"
            aria-label="Carrito"
            title="Carrito"
            className="relative inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200/80 bg-white/80 text-slate-600 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:bg-white hover:text-slate-900 hover:shadow-md"
          >
            <ShoppingCart className="h-5 w-5" />
            <AnimatePresence mode="popLayout">
              <motion.span
                key={cartCount}
                initial={{ scale: 0.6, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.6, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="absolute -right-1 -top-1 inline-flex min-h-5 min-w-5 items-center justify-center rounded-full bg-slate-900 px-1 text-[10px] font-semibold text-white"
              >
                {cartCount}
              </motion.span>
            </AnimatePresence>
          </Link>
        </div>
      </div>

      <div className="mx-auto w-full max-w-[1280px] px-4 pb-3 md:hidden">
        <SearchBar
          value={searchTerm}
          onChange={setSearchTerm}
          onSubmit={handleSearchSubmit}
          placeholder="Buscar productos"
        />
      </div>
    </header>
  );
}
