import { useAuth } from "@/hooks/use-auth";
import { useAdminStats, useAllOrders } from "@/hooks/use-orders";
import { useProducts } from "@/hooks/use-products";
import { Header } from "@/components/common/Header";
import { Footer } from "@/components/common/Footer";
import { Link, useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Package, ShoppingBag, DollarSign, Plus, Edit, Trash2, KeyRound, CheckCircle, Clock, XCircle } from "lucide-react";
import { formatCurrency } from "@/utils/formatCurrency";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { api } from "@shared/routes";
import { Product, User, Order } from "@shared/schema";
import { Badge } from "@/components/ui/badge";

export default function AdminPage() {
  const { user, isLoading: userLoading } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { data: stats, isLoading: statsLoading } = useAdminStats();
  const { data: orders } = useAllOrders();
  const { data: products } = useProducts();
  const { data: allUsers } = useQuery<User[]>({
    queryKey: [api.users.list.path],
  });

  if (userLoading) return null;

  if (!user || user.role !== 'admin') {
    setLocation("/");
    return null;
  }

  const handleDeleteProduct = async (id: number) => {
    if (!confirm("¿Estás seguro de eliminar este producto?")) return;
    try {
      await apiRequest("DELETE", `/api/products/${id}`);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: [api.products.list.path] }),
        queryClient.invalidateQueries({ queryKey: [api.admin.stats.path] }),
      ]);
      toast({ title: "Producto eliminado" });
    } catch (e) {
      toast({ title: "Error al eliminar", variant: "destructive" });
    }
  };

  const handleDeleteUser = async (id: number) => {
    if (!confirm("¿Estás seguro de eliminar este usuario?")) return;
    try {
      await apiRequest("DELETE", `/api/users/${id}`);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: [api.users.list.path] }),
        queryClient.invalidateQueries({ queryKey: [api.admin.stats.path] }),
      ]);
      toast({ title: "Usuario eliminado" });
    } catch (e) {
      toast({ title: "Error al eliminar", variant: "destructive" });
    }
  };

  const handleResetPassword = async (target: User) => {
    const nextPassword = prompt(`Nueva contraseña para ${target.email}`);
    if (!nextPassword) return;
    if (nextPassword.trim().length < 6) {
      toast({ title: "Contraseña inválida", description: "Debe tener al menos 6 caracteres.", variant: "destructive" });
      return;
    }

    try {
      await apiRequest("POST", `/api/users/${target.id}/reset-password`, { password: nextPassword });
      toast({ title: "Contraseña actualizada" });
    } catch (e) {
      toast({ title: "Error al actualizar", variant: "destructive" });
    }
  };

  const handleDeleteOrder = async (id: number) => {
    if (!confirm("¿Estás seguro de eliminar este pedido?")) return;
    try {
      await apiRequest("DELETE", `/api/orders/${id}`);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: [api.orders.listAll.path] }),
        queryClient.invalidateQueries({ queryKey: [api.admin.stats.path] }),
      ]);
      toast({ title: "Pedido eliminado" });
    } catch (e) {
      toast({ title: "Error al eliminar", variant: "destructive" });
    }
  };

  const handleUpdateOrderStatus = async (id: number, status: string) => {
    try {
      await apiRequest("PUT", `/api/orders/${id}/status`, { status });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: [api.orders.listAll.path] }),
        queryClient.invalidateQueries({ queryKey: [api.admin.stats.path] }),
      ]);
      toast({ title: "Estado de pedido actualizado" });
    } catch (e) {
      toast({ title: "Error al actualizar", variant: "destructive" });
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-display font-bold">Panel de administración</h1>
          <div className="flex gap-2">
            <Button asChild variant="outline">
              <Link href="/admin/add-product"><Plus className="w-4 h-4 mr-2" /> Nuevo producto</Link>
            </Button>
          </div>
        </div>
        
        {statsLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            {[1,2,3,4].map(i => <Card key={i} className="h-32 bg-gray-100 animate-pulse" />)}
          </div>
        ) : stats ? (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Ingresos totales</CardTitle>
                <DollarSign className="w-4 h-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(stats.totalRevenue)}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Pedidos</CardTitle>
                <ShoppingBag className="w-4 h-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalOrders}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Productos</CardTitle>
                <Package className="w-4 h-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalProducts}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Usuarios</CardTitle>
                <Users className="w-4 h-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalUsers}</div>
              </CardContent>
            </Card>
          </div>
        ) : null}

        <Tabs defaultValue="orders" className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="orders">Pedidos</TabsTrigger>
            <TabsTrigger value="products">Productos</TabsTrigger>
            <TabsTrigger value="users">Usuarios</TabsTrigger>
          </TabsList>

          <TabsContent value="orders">
            <Card>
              <CardHeader>
                <CardTitle>Gestión de Pedidos</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-muted text-muted-foreground">
                      <tr>
                        <th className="p-3">ID</th>
                        <th className="p-3">Cliente</th>
                        <th className="p-3">Total</th>
                        <th className="p-3">Estado</th>
                        <th className="p-3">Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {orders?.map((order) => (
                        <tr key={order.id} className="border-b last:border-0">
                          <td className="p-3 font-medium">#{order.id}</td>
                          <td className="p-3">{order.address.fullName}</td>
                          <td className="p-3 font-bold">{formatCurrency(order.total)}</td>
                          <td className="p-3">
                            <select 
                              value={order.status}
                              onChange={(e) => handleUpdateOrderStatus(order.id, e.target.value)}
                              className="text-xs border rounded p-1"
                            >
                              <option value="pendiente">Pendiente</option>
                              <option value="pagado">Pagado</option>
                              <option value="enviado">Enviado</option>
                              <option value="entregado">Entregado</option>
                              <option value="cancelado">Cancelado</option>
                            </select>
                          </td>
                          <td className="p-3">
                            <Button variant="ghost" size="icon" onClick={() => handleDeleteOrder(order.id)}>
                              <Trash2 className="w-4 h-4 text-destructive" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="products">
            <Card>
              <CardHeader>
                <CardTitle>Gestión de Productos</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-muted text-muted-foreground">
                      <tr>
                        <th className="p-3">Nombre</th>
                        <th className="p-3">Precio</th>
                        <th className="p-3">Stock</th>
                        <th className="p-3">Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {products?.map((product) => (
                        <tr key={product.id} className="border-b last:border-0">
                          <td className="p-3 font-medium">{product.name}</td>
                          <td className="p-3">{formatCurrency(product.price)}</td>
                          <td className="p-3">{product.stock}</td>
                          <td className="p-3 flex gap-2">
                            <Button asChild variant="ghost" size="icon">
                              <Link href={`/admin/products/edit/${product.id}`}><Edit className="w-4 h-4" /></Link>
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => handleDeleteProduct(product.id)}>
                              <Trash2 className="w-4 h-4 text-destructive" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="users">
            <Card>
              <CardHeader>
                <CardTitle>Gestión de Usuarios</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-muted text-muted-foreground">
                      <tr>
                        <th className="p-3">Nombre</th>
                        <th className="p-3">Correo</th>
                        <th className="p-3">Rol</th>
                        <th className="p-3">Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {allUsers?.map((u) => (
                        <tr key={u.id} className="border-b last:border-0">
                          <td className="p-3 font-medium">{u.name}</td>
                          <td className="p-3">{u.email}</td>
                          <td className="p-3">
                            <Badge variant={u.role === 'admin' ? 'default' : 'secondary'}>
                              {u.role.toUpperCase()}
                            </Badge>
                          </td>
                          <td className="p-3">
                            <div className="flex items-center gap-2">
                              <Button variant="ghost" size="icon" onClick={() => handleResetPassword(u)}>
                                <KeyRound className="w-4 h-4" />
                              </Button>
                              {u.id !== user.id && (
                                <Button variant="ghost" size="icon" onClick={() => handleDeleteUser(u.id)}>
                                  <Trash2 className="w-4 h-4 text-destructive" />
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      <Footer />
    </div>
  );
}
