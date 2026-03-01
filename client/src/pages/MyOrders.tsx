import { useEffect, useMemo, useState } from "react";
import { useLocation, Link } from "wouter";
import { ArrowLeft } from "lucide-react";
import { Header } from "@/components/common/Header";
import { Footer } from "@/components/common/Footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/use-auth";
import { useMyOrders } from "../hooks/use-orders";
import { useProducts } from "@/hooks/use-products";
import { formatOrderStatus } from "@/utils/displayLabels";
import { formatCurrency } from "@/utils/formatCurrency";

export default function MyOrders() {
  const { user, isLoading: isLoadingUser } = useAuth();
  const [, setLocation] = useLocation();
  const { data: orders, isLoading, isError } = useMyOrders(Boolean(user));
  const { data: products } = useProducts();
  const [statusFilter, setStatusFilter] = useState("todos");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const productsById = useMemo(() => {
    return new Map((products ?? []).map((product) => [product.id, product]));
  }, [products]);

  const filteredOrders = useMemo(() => {
    if (!orders) return [];

    return orders.filter((order) => {
      if (statusFilter !== "todos" && order.status !== statusFilter) {
        return false;
      }

      if (!order.createdAt) {
        return !fromDate && !toDate;
      }

      const createdAt = new Date(order.createdAt);

      if (fromDate) {
        const from = new Date(`${fromDate}T00:00:00`);
        if (createdAt < from) return false;
      }

      if (toDate) {
        const to = new Date(`${toDate}T23:59:59.999`);
        if (createdAt > to) return false;
      }

      return true;
    });
  }, [fromDate, orders, statusFilter, toDate]);

  useEffect(() => {
    if (!isLoadingUser && !user) {
      setLocation("/auth");
    }
  }, [isLoadingUser, setLocation, user]);

  if (!isLoadingUser && !user) return null;

  const handleGoBack = () => {
    if (window.history.length > 1) {
      window.history.back();
      return;
    }
    setLocation("/");
  };

  const handleClearFilters = () => {
    setStatusFilter("todos");
    setFromDate("");
    setToDate("");
  };

  if (isLoadingUser || isLoading) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
          <p className="text-muted-foreground">Cargando pedidos...</p>
        </main>
        <Footer />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
          <p className="text-destructive">Error al cargar tus pedidos.</p>
          <Button variant="outline" className="mt-4" onClick={handleGoBack}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Volver atrás
          </Button>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        <div className="flex items-center justify-between gap-4 mb-8">
          <h1 className="text-3xl font-display font-bold">Mis pedidos</h1>
          <Button variant="outline" onClick={handleGoBack}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Volver atrás
          </Button>
        </div>

        {!orders || orders.length === 0 ? (
          <div className="bg-card border rounded-2xl p-6">
            <p className="text-muted-foreground mb-4">No tienes pedidos.</p>
            <Button asChild>
              <Link href="/search">Explorar productos</Link>
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="bg-card border rounded-2xl p-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Estado</label>
                  <select
                    className="w-full border rounded-lg px-3 py-2 bg-background text-sm"
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                  >
                    <option value="todos">Todos</option>
                    <option value="pendiente">Pendiente</option>
                    <option value="pagado">Pagado</option>
                    <option value="enviado">Enviado</option>
                    <option value="entregado">Entregado</option>
                    <option value="cancelado">Cancelado</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Desde</label>
                  <input
                    type="date"
                    className="w-full border rounded-lg px-3 py-2 bg-background text-sm"
                    value={fromDate}
                    onChange={(e) => setFromDate(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Hasta</label>
                  <input
                    type="date"
                    className="w-full border rounded-lg px-3 py-2 bg-background text-sm"
                    value={toDate}
                    onChange={(e) => setToDate(e.target.value)}
                  />
                </div>
                <div className="flex items-end">
                  <Button variant="outline" className="w-full" onClick={handleClearFilters}>
                    Limpiar filtros
                  </Button>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-3">
                Mostrando {filteredOrders.length} de {orders.length} pedidos.
              </p>
            </div>

            {filteredOrders.length === 0 ? (
              <div className="bg-card border rounded-2xl p-6">
                <p className="text-muted-foreground">No hay pedidos que coincidan con los filtros seleccionados.</p>
              </div>
            ) : (
              filteredOrders.map((order) => (
                <article key={order.id} className="bg-card border rounded-2xl p-6">
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-4 mb-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Pedido #{order.id}</p>
                      <p className="text-sm text-muted-foreground">
                        Fecha: {order.createdAt ? new Date(order.createdAt).toLocaleString("es-ES") : "Sin fecha"}
                      </p>
                    </div>
                    <Badge variant="secondary">{formatOrderStatus(order.status)}</Badge>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    <div className="lg:col-span-8">
                      <h3 className="font-bold mb-3">Productos del pedido</h3>
                      <div className="space-y-3">
                        {order.items.map((item, index) => {
                          const product = productsById.get(item.productId);
                          const unitPrice = Number(item.price) || 0;
                          const subtotal = unitPrice * item.quantity;
                          return (
                            <div key={`${order.id}-${item.productId}-${index}`} className="border rounded-lg p-3 flex items-start justify-between gap-4">
                              <div>
                                {product ? (
                                  <Link href={`/product/${product.slug}`} className="font-semibold hover:underline">
                                    {product.name}
                                  </Link>
                                ) : (
                                  <p className="font-semibold">Producto #{item.productId}</p>
                                )}
                                <p className="text-sm text-muted-foreground">Cantidad: {item.quantity}</p>
                              </div>
                              <div className="text-right text-sm">
                                <p className="text-muted-foreground">Precio unidad: {formatCurrency(unitPrice)}</p>
                                <p className="font-semibold">Subtotal: {formatCurrency(subtotal)}</p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <div className="lg:col-span-4">
                      <h3 className="font-bold mb-3">Datos de entrega</h3>
                      <div className="border rounded-lg p-3 text-sm space-y-1">
                        <p><span className="font-medium">Nombre:</span> {order.address.fullName}</p>
                        <p><span className="font-medium">Teléfono:</span> {order.address.phone}</p>
                        <p><span className="font-medium">Dirección:</span> {order.address.street}</p>
                        <p><span className="font-medium">Ciudad:</span> {order.address.city}</p>
                        <p><span className="font-medium">Código postal:</span> {order.address.zip}</p>
                        <p><span className="font-medium">País:</span> {order.address.country}</p>
                      </div>
                      <div className="mt-4 border rounded-lg p-3 flex items-center justify-between">
                        <span className="font-medium">Total del pedido</span>
                        <span className="text-lg font-bold">{formatCurrency(order.total)}</span>
                      </div>
                    </div>
                  </div>
                </article>
              ))
            )}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
