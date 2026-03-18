import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { Product, CreateProductRequest, UpdateProductRequest, CreateReviewRequest, Review } from "@shared/schema";

export function useProducts(params?: Record<string, string>) {
  const queryParams = new URLSearchParams(params).toString();
  const url = `${api.products.list.path}${queryParams ? `?${queryParams}` : ""}`;

  return useQuery<Product[]>({
    queryKey: [api.products.list.path, params],
    queryFn: async () => {
      const res = await fetch(url);
      if (!res.ok) throw new Error("No se pudieron cargar los productos");
      return res.json();
    },
  });
}

export function useProduct(slug: string) {
  return useQuery<Product & { reviews: (Review & { user: { name: string } })[] }>({
    queryKey: [api.products.get.path, slug],
    queryFn: async () => {
      const url = buildUrl(api.products.get.path, { slug });
      const res = await fetch(url);
      if (res.status === 404) return null;
      if (!res.ok) throw new Error("No se pudo cargar el producto");
      return res.json();
    },
    enabled: !!slug,
  });
}

export function useCreateReview(productId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: CreateReviewRequest) => {
      const url = buildUrl(api.reviews.create.path, { id: productId });
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) throw new Error("No se pudo enviar la reseña");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.products.get.path] });
    },
  });
}

export function useCreateProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: CreateProductRequest | FormData) => {
      const isFormData = data instanceof FormData;
      const res = await fetch(api.products.create.path, {
        method: "POST",
        headers: isFormData ? undefined : { "Content-Type": "application/json" },
        body: isFormData ? data : JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) throw new Error("No se pudo crear el producto");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.products.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.admin.stats.path] });
    },
  });
}

export function useUpdateProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: UpdateProductRequest }) => {
      const url = buildUrl(api.products.update.path, { id });
      const res = await fetch(url, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) throw new Error("No se pudo actualizar el producto");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.products.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.products.get.path] });
      queryClient.invalidateQueries({ queryKey: [api.admin.stats.path] });
    },
  });
}
