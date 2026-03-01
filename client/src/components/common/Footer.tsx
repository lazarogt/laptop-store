import { Link } from "wouter";
import { PackageSearch } from "lucide-react";

export function Footer() {
  return (
    <footer className="mt-16 border-t border-slate-200 bg-[#f0f1f4]">
      <div className="mx-auto w-full max-w-[1280px] px-4 py-12 md:px-6">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
          <div>
            <Link href="/" className="inline-flex items-center gap-2 text-lg font-semibold text-slate-900">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white">
                <PackageSearch className="h-4 w-4" />
              </span>
              LaptopStore
            </Link>
            <p className="mt-4 text-sm leading-6 text-slate-600">
              Tecnología premium con una experiencia de compra limpia, rápida y confiable.
            </p>
          </div>

          <div>
            <h3 className="text-sm font-semibold uppercase tracking-[0.12em] text-slate-500">Comprar</h3>
            <ul className="mt-4 space-y-2 text-sm text-slate-700">
              <li><Link href="/category/gaming" className="hover:text-slate-900">Juegos</Link></li>
              <li><Link href="/category/ultrabooks" className="hover:text-slate-900">Ultraligeras</Link></li>
              <li><Link href="/deals" className="hover:text-slate-900">Ofertas</Link></li>
              <li><Link href="/search" className="hover:text-slate-900">Catálogo completo</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold uppercase tracking-[0.12em] text-slate-500">Mi cuenta</h3>
            <ul className="mt-4 space-y-2 text-sm text-slate-700">
              <li><Link href="/my-orders" className="hover:text-slate-900">Mis pedidos</Link></li>
              <li><Link href="/wishlist" className="hover:text-slate-900">Favoritos</Link></li>
              <li><Link href="/cart" className="hover:text-slate-900">Carrito</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold uppercase tracking-[0.12em] text-slate-500">Legal</h3>
            <ul className="mt-4 space-y-2 text-sm text-slate-700">
              <li><Link href="#" className="hover:text-slate-900">Condiciones de uso</Link></li>
              <li><Link href="#" className="hover:text-slate-900">Privacidad</Link></li>
              <li><Link href="#" className="hover:text-slate-900">Ayuda y soporte</Link></li>
            </ul>
          </div>
        </div>
        <div className="mt-10 border-t border-slate-200 pt-6 text-sm text-slate-500">
          © {new Date().getFullYear()} LaptopStore. Todos los derechos reservados.
        </div>
      </div>
    </footer>
  );
}
