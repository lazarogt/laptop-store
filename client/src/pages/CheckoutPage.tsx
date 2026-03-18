import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Header } from "@/components/common/Header";
import { Footer } from "@/components/common/Footer";
import { useCart } from "@/contexts/CartContext";
import { useCreateOrder } from "@/hooks/use-orders";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatCurrency } from "@/utils/formatCurrency";
import { CheckCircle2, Lock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const addressSchema = z.object({
  fullName: z.string().min(3, "El nombre completo es obligatorio"),
  street: z.string().min(5, "La dirección es obligatoria"),
  city: z.string().min(2, "La ciudad es obligatoria"),
  zip: z.string().min(4, "El código postal es obligatorio"),
  country: z.string().min(2, "El país es obligatorio"),
  phone: z
    .string()
    .trim()
    .regex(/^\+?[1-9]\d{7,14}$/, "Usa formato internacional, por ejemplo +15551234567"),
});

type AddressForm = z.infer<typeof addressSchema>;

export default function CheckoutPage() {
  const { cart, cartTotal, clearCart } = useCart();
  const { user } = useAuth();
  const createOrder = useCreateOrder();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isSuccess, setIsSuccess] = useState(false);

  const shipping = cartTotal > 500 || cartTotal === 0 ? 0 : 25;
  const total = cartTotal + shipping;

  const form = useForm<AddressForm>({
    resolver: zodResolver(addressSchema),
    defaultValues: {
      fullName: user?.name || "",
      street: "",
      city: "",
      zip: "",
      country: "",
      phone: "",
    }
  });

  const onSubmit = (data: AddressForm) => {
    if (!user) {
      toast({ title: "Inicio de sesión requerido", description: "Inicia sesión para completar tu pedido.", variant: "destructive" });
      setLocation("/auth");
      return;
    }

    if (cart.length === 0) return;

    createOrder.mutate({
      items: cart.map(item => ({
        productId: item.id,
        quantity: item.cartQuantity,
        price: item.price.toString()
      })),
      total: total.toString(),
      address: data
    }, {
      onSuccess: () => {
        setIsSuccess(true);
        clearCart();
        window.scrollTo(0,0);
      }
    });
  };

  if (isSuccess) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        <div className="flex-1 flex flex-col items-center justify-center p-4">
          <CheckCircle2 className="w-24 h-24 text-green-500 mb-6" />
          <h1 className="text-4xl font-display font-bold mb-4 text-center">¡Pedido confirmado!</h1>
          <p className="text-lg text-muted-foreground mb-8 text-center max-w-md">
            Gracias por comprar en LaptopStore. Recibimos tu pedido y lo procesaremos pronto.
          </p>
          <Button asChild size="lg" className="bg-primary text-white"><Link href="/my-orders">Ver mis pedidos</Link></Button>
        </div>
        <Footer />
      </div>
    );
  }

  if (cart.length === 0) {
    setLocation("/cart");
    return null;
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        <h1 className="text-3xl font-display font-bold mb-8 flex items-center gap-3">
          Finalizar compra <Lock className="w-5 h-5 text-green-600" />
        </h1>
        
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-8">
            <form id="checkout-form" onSubmit={form.handleSubmit(onSubmit)} className="bg-card border rounded-2xl p-6 shadow-sm mb-6">
              <h2 className="text-xl font-bold mb-6 pb-4 border-b">Dirección de envío</h2>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium mb-1">Nombre completo</label>
                  <Input {...form.register("fullName")} className={form.formState.errors.fullName ? "border-destructive" : ""} />
                  {form.formState.errors.fullName && <p className="text-xs text-destructive mt-1">{form.formState.errors.fullName.message}</p>}
                </div>
                
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium mb-1">Dirección</label>
                  <Input {...form.register("street")} className={form.formState.errors.street ? "border-destructive" : ""} />
                  {form.formState.errors.street && <p className="text-xs text-destructive mt-1">{form.formState.errors.street.message}</p>}
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">Ciudad</label>
                  <Input {...form.register("city")} className={form.formState.errors.city ? "border-destructive" : ""} />
                  {form.formState.errors.city && <p className="text-xs text-destructive mt-1">{form.formState.errors.city.message}</p>}
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">Código postal</label>
                  <Input {...form.register("zip")} className={form.formState.errors.zip ? "border-destructive" : ""} />
                  {form.formState.errors.zip && <p className="text-xs text-destructive mt-1">{form.formState.errors.zip.message}</p>}
                </div>
                
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium mb-1">País</label>
                  <Input {...form.register("country")} className={form.formState.errors.country ? "border-destructive" : ""} />
                  {form.formState.errors.country && <p className="text-xs text-destructive mt-1">{form.formState.errors.country.message}</p>}
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium mb-1">Teléfono</label>
                  <Input {...form.register("phone")} placeholder="+15551234567" className={form.formState.errors.phone ? "border-destructive" : ""} />
                  {form.formState.errors.phone && <p className="text-xs text-destructive mt-1">{form.formState.errors.phone.message}</p>}
                  <p className="text-xs text-muted-foreground mt-1">
                    Incluye código de país (formato E.164). Recibirás las confirmaciones del pedido por email.
                  </p>
                </div>
              </div>
            </form>
            
            <div className="bg-card border rounded-2xl p-6 shadow-sm">
              <h2 className="text-xl font-bold mb-6 pb-4 border-b">Método de pago (simulado)</h2>
              <div className="p-4 bg-muted rounded-lg border flex items-center justify-center h-24">
                <p className="text-muted-foreground font-medium flex items-center gap-2">
                  <Lock className="w-4 h-4" /> El pago se omite en esta demo.
                </p>
              </div>
            </div>
          </div>
          
          <div className="lg:col-span-4">
            <div className="bg-card border rounded-2xl p-6 shadow-lg sticky top-24">
              <h2 className="text-xl font-bold mb-4">Resumen del pedido</h2>
              
              <div className="space-y-4 mb-6 max-h-64 overflow-y-auto pr-2">
                {cart.map(item => (
                  <div key={item.id} className="flex gap-3">
                    <img
                      src={
                        typeof item.images?.[0] === "string"
                          ? item.images[0]
                          : item.images?.[0]?.thumb || item.images?.[0]?.url || ""
                      }
                      className="w-12 h-12 object-contain border rounded bg-white"
                    />
                    <div className="flex-1 text-sm">
                      <p className="font-medium line-clamp-1">{item.name}</p>
                      <p className="text-muted-foreground">Cant.: {item.cartQuantity}</p>
                    </div>
                    <div className="font-bold text-sm">
                      {formatCurrency(parseFloat(item.price as string) * item.cartQuantity)}
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="border-t pt-4 space-y-3 text-sm mb-6">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>{formatCurrency(cartTotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Envío</span>
                  <span>{shipping === 0 ? 'Gratis' : formatCurrency(shipping)}</span>
                </div>
                <div className="border-t pt-3 flex justify-between items-center">
                  <span className="font-bold text-base">Total</span>
                  <span className="font-display font-bold text-2xl text-primary">{formatCurrency(total)}</span>
                </div>
              </div>
              
              <Button 
                type="submit" 
                form="checkout-form"
                disabled={createOrder.isPending}
                className="w-full bg-accent hover:bg-accent/90 text-primary font-bold py-6 text-lg rounded-xl shadow-md transition-transform active:scale-95"
              >
                {createOrder.isPending ? "Procesando..." : "Confirmar pedido"}
              </Button>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
