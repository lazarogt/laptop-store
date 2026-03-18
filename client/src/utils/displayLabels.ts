export const storefrontCategoryLinks = [
  { slug: "juegos", label: "Juegos" },
  { slug: "ultraligeras", label: "Ultraligeras" },
  { slug: "trabajo-oficina", label: "Trabajo y oficina" },
  { slug: "creadores", label: "Creadores" },
] as const;

const categoryAliases: Record<string, (typeof storefrontCategoryLinks)[number]["slug"]> = {
  gaming: "juegos",
  juegos: "juegos",
  ultrabooks: "ultraligeras",
  ultraligeras: "ultraligeras",
  business: "trabajo-oficina",
  "trabajo-oficina": "trabajo-oficina",
  creators: "creadores",
  creadores: "creadores",
};

const categoryLabels: Record<(typeof storefrontCategoryLinks)[number]["slug"], string> = {
  juegos: "juegos",
  ultraligeras: "ultraligeras",
  "trabajo-oficina": "trabajo y oficina",
  creadores: "creadores",
};

const productCategoriesByStorefront: Record<(typeof storefrontCategoryLinks)[number]["slug"], string[]> = {
  juegos: ["Gaming"],
  ultraligeras: ["Ultrabook"],
  "trabajo-oficina": ["Workstation", "Empresarial"],
  creadores: ["Creadores"],
};

const orderStatusLabels: Record<string, string> = {
  pendiente: "Pendiente",
  pagado: "Pagado",
  enviado: "Enviado",
  entregado: "Entregado",
  cancelado: "Cancelado",
};

function capitalize(text: string): string {
  if (!text) return text;
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export function formatCategoryLabel(category?: string | null): string {
  if (!category) return "";
  const normalized = normalizeCategorySlug(category);
  const label = normalized ? categoryLabels[normalized] : category.trim().toLowerCase().replace(/[-_]/g, " ");
  return capitalize(label);
}

export function normalizeCategorySlug(category?: string | null): (typeof storefrontCategoryLinks)[number]["slug"] | null {
  if (!category) return null;
  const normalized = category.trim().toLowerCase();
  return categoryAliases[normalized] ?? null;
}

export function getProductCategoriesForStorefront(category?: string | null): string[] {
  const normalized = normalizeCategorySlug(category);
  if (!normalized) return [];
  return productCategoriesByStorefront[normalized] ?? [];
}

export function formatOrderStatus(status?: string | null): string {
  if (!status) return "";
  const normalized = status.trim().toLowerCase();
  return orderStatusLabels[normalized] ?? capitalize(normalized.replace(/[-_]/g, " "));
}
