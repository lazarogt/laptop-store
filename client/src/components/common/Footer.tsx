import { Link } from "wouter";
import { PackageSearch } from "lucide-react";

export function Footer() {
  return (
    <footer className="bg-secondary text-gray-300 py-12 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          <div>
            <Link href="/" className="flex items-center gap-2 text-2xl font-display font-bold text-white mb-4">
              <PackageSearch className="w-6 h-6 text-accent" />
              <span>Laptop<span className="text-accent">Store</span></span>
            </Link>
            <p className="text-sm text-gray-400">
              Your professional destination for premium laptops, workstations, and gaming rigs.
            </p>
          </div>
          <div>
            <h3 className="font-bold text-white mb-4">Shop</h3>
            <ul className="space-y-2 text-sm">
              <li><Link href="/category/gaming" className="hover:text-accent transition-colors">Gaming</Link></li>
              <li><Link href="/category/business" className="hover:text-accent transition-colors">Business</Link></li>
              <li><Link href="/deals" className="hover:text-accent transition-colors">Deals</Link></li>
              <li><Link href="/search" className="hover:text-accent transition-colors">Advanced Search</Link></li>
            </ul>
          </div>
          <div>
            <h3 className="font-bold text-white mb-4">Customer Service</h3>
            <ul className="space-y-2 text-sm">
              <li><Link href="/orders" className="hover:text-accent transition-colors">Your Orders</Link></li>
              <li><Link href="/cart" className="hover:text-accent transition-colors">Your Cart</Link></li>
              <li><Link href="#" className="hover:text-accent transition-colors">Returns & Refunds</Link></li>
              <li><Link href="#" className="hover:text-accent transition-colors">Help & Contact</Link></li>
            </ul>
          </div>
          <div>
            <h3 className="font-bold text-white mb-4">Secure Shopping</h3>
            <p className="text-sm text-gray-400 mb-4">
              We provide secure, encrypted transactions for your peace of mind.
            </p>
          </div>
        </div>
        <div className="border-t border-gray-700 pt-8 flex flex-col md:flex-row items-center justify-between text-sm text-gray-400">
          <p>&copy; {new Date().getFullYear()} LaptopStore. All rights reserved.</p>
          <div className="flex gap-4 mt-4 md:mt-0">
            <Link href="#" className="hover:text-white">Conditions of Use</Link>
            <Link href="#" className="hover:text-white">Privacy Notice</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
