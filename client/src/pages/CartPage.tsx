import { Link } from "wouter";
import { Header } from "@/components/common/Header";
import { Footer } from "@/components/common/Footer";
import { useCart } from "@/contexts/CartContext";
import { formatCurrency } from "@/utils/formatCurrency";
import { Button } from "@/components/ui/button";
import { Trash2, ShoppingCart, ShieldCheck } from "lucide-react";

export default function CartPage() {
  const { cart, updateQuantity, removeFromCart, cartTotal } = useCart();
  
  const shipping = cartTotal > 500 || cartTotal === 0 ? 0 : 25;
  const total = cartTotal + shipping;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        <h1 className="text-3xl font-display font-bold mb-8">Carrito de compras</h1>
        
        {cart.length === 0 ? (
          <div className="text-center py-24 bg-card rounded-2xl border border-border shadow-sm">
            <ShoppingCart className="w-20 h-20 text-muted-foreground/30 mx-auto mb-6" />
            <h2 className="text-2xl font-bold mb-4">Tu carrito está vacío</h2>
            <p className="text-muted-foreground mb-8">Parece que aún no has agregado laptops al carrito.</p>
            <Button asChild size="lg" className="bg-accent text-primary hover:bg-accent/90 font-bold px-8">
              <Link href="/">Seguir comprando</Link>
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-card rounded-2xl border p-6 shadow-sm">
                <div className="hidden sm:grid grid-cols-12 text-sm font-bold text-muted-foreground mb-4 pb-4 border-b">
                  <div className="col-span-6">Producto</div>
                  <div className="col-span-3 text-center">Cantidad</div>
                  <div className="col-span-3 text-right">Subtotal</div>
                </div>
                
                <div className="space-y-6">
                  {cart.map((item) => (
                    <div key={item.id} className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center pb-6 border-b last:border-0 last:pb-0">
                      <div className="col-span-1 sm:col-span-6 flex items-center gap-4">
                        <div className="w-24 h-24 bg-white rounded-lg border p-2 flex-shrink-0">
                          <img
                            src={
                              typeof item.images?.[0] === "string"
                                ? item.images[0]
                                : item.images?.[0]?.thumb || item.images?.[0]?.url || ""
                            }
                            alt={item.name}
                            className="w-full h-full object-contain"
                          />
                        </div>
                        <div>
                          <Link href={`/product/${item.slug}`} className="font-bold text-foreground hover:text-primary line-clamp-2">
                            {item.name}
                          </Link>
                          <p className="text-sm text-muted-foreground mt-1">{item.brand}</p>
                          <button 
                            onClick={() => removeFromCart(item.id)}
                            className="text-sm text-destructive hover:underline mt-2 flex items-center gap-1"
                          >
                            <Trash2 className="w-3 h-3" /> Eliminar
                          </button>
                        </div>
                      </div>
                      
                      <div className="col-span-1 sm:col-span-3 flex justify-between sm:justify-center items-center">
                        <span className="sm:hidden font-medium text-sm">Cant.:</span>
                        <select
                          className="border rounded-lg p-2 bg-background w-20 text-center focus:border-accent focus:outline-none"
                          value={item.cartQuantity}
                          onChange={(e) => updateQuantity(item.id, Number(e.target.value))}
                        >
                          {[...Array(Math.min(10, item.stock))].map((_, i) => (
                            <option key={i+1} value={i+1}>{i+1}</option>
                          ))}
                        </select>
                      </div>
                      
                      <div className="col-span-1 sm:col-span-3 flex justify-between sm:justify-end items-center font-bold text-lg">
                        <span className="sm:hidden text-sm text-muted-foreground">Subtotal:</span>
                        {formatCurrency(parseFloat(item.price as string) * item.cartQuantity)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            
            <div className="lg:col-span-1">
              <div className="bg-card rounded-2xl border p-6 shadow-xl shadow-black/5 sticky top-24">
                <h2 className="text-xl font-display font-bold mb-6">Resumen del pedido</h2>
                
                <div className="space-y-4 mb-6 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Productos ({cart.length}):</span>
                    <span className="font-medium">{formatCurrency(cartTotal)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Envío:</span>
                    <span className="font-medium">{shipping === 0 ? <span className="text-green-600">Gratis</span> : formatCurrency(shipping)}</span>
                  </div>
                  <div className="border-t pt-4 flex justify-between items-center">
                    <span className="font-bold text-base">Total:</span>
                    <span className="font-display font-bold text-2xl">{formatCurrency(total)}</span>
                  </div>
                </div>
                
                <Button asChild className="w-full bg-accent hover:bg-accent/90 text-primary font-bold py-6 text-lg rounded-xl shadow-lg transition-all hover:-translate-y-0.5 mb-4">
                  <Link href="/checkout">Ir al pago</Link>
                </Button>
                
                <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                  <ShieldCheck className="w-4 h-4 text-green-500" /> Pago seguro y protegido
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
