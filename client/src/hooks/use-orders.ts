import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { Order, CreateOrderRequest } from "@shared/schema";

export function useMyOrders(enabled = true) {
  return useQuery<Order[]>({
    queryKey: [api.orders.listMy.path],
    enabled,
    queryFn: async () => {
      const res = await fetch(api.orders.listMy.path, { credentials: "include" });
      if (!res.ok) throw new Error("No se pudieron cargar los pedidos");
      return res.json();
    },
  });
}

export function useAllOrders() {
  return useQuery<Order[]>({
    queryKey: [api.orders.listAll.path],
    queryFn: async () => {
      const res = await fetch(api.orders.listAll.path, { credentials: "include" });
      if (!res.ok) throw new Error("No se pudieron cargar todos los pedidos");
      return res.json();
    },
  });
}

export function useCreateOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: CreateOrderRequest) => {
      const res = await fetch(api.orders.create.path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) throw new Error("No se pudo crear el pedido");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.orders.listMy.path] });
    },
  });
}

export function useUpdateOrderStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      const url = buildUrl(api.orders.updateStatus.path, { id });
      const res = await fetch(url, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
        credentials: "include",
      });
      if (!res.ok) throw new Error("No se pudo actualizar el estado");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.orders.listAll.path] });
    },
  });
}

export function useAdminStats() {
  return useQuery<{ totalUsers: number; totalProducts: number; totalOrders: number; totalRevenue: string }>({
    queryKey: [api.admin.stats.path],
    queryFn: async () => {
      const res = await fetch(api.admin.stats.path, { credentials: "include" });
      if (!res.ok) throw new Error("No se pudieron cargar las estadísticas");
      return res.json();
    },
  });
}
