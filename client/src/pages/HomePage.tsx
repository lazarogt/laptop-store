import { motion } from "framer-motion";
import { Link } from "wouter";
import { ArrowRight, ShieldCheck, Truck, Sparkles, Zap } from "lucide-react";
import { useProducts } from "@/hooks/use-products.ts";
import { Layout } from "@/components/premium/Layout.tsx";
import { ProductGrid } from "@/components/premium/ProductGrid.tsx";
import { PremiumBadge } from "@/components/premium/Badge.tsx";

const featureItems = [
  {
    title: "Envío express",
    description: "Entrega prioritaria en pedidos seleccionados.",
    icon: Truck,
  },
  {
    title: "Compra protegida",
    description: "Soporte dedicado y garantía extendida.",
    icon: ShieldCheck,
  },
  {
    title: "Curación premium",
    description: "Selección con enfoque en rendimiento real.",
    icon: Sparkles,
  },
];

export default function HomePage() {
  const { data: products, isLoading } = useProducts({ sort: "rating" });
  const featuredProducts = products?.slice(0, 8) || [];
  const dealProducts =
    products?.filter((product) => product.badges?.some((badge) => badge.toLowerCase().includes("oferta"))).slice(0, 4) || [];

  return (
    <Layout>
      <section className="mx-auto w-full max-w-[1280px] px-4 pt-10 md:px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white px-7 py-10 shadow-sm md:px-12 md:py-14"
        >
          <div className="absolute -right-20 -top-20 h-72 w-72 rounded-full bg-slate-100 blur-3xl" />
          <div className="absolute -bottom-16 right-16 h-52 w-52 rounded-full bg-blue-100/70 blur-3xl" />

          <div className="relative z-10 max-w-3xl">
            <PremiumBadge tone="accent">Colección premium 2026</PremiumBadge>
            <h1 className="mt-6 text-4xl font-semibold tracking-tight text-slate-900 md:text-6xl">
              Encuentra tu próxima laptop con criterio de alto rendimiento.
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-slate-600 md:text-lg">
              Un catálogo con enfoque en productividad real, diseño sobrio y potencia para trabajo, juegos y creación de contenido.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/search"
                className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-6 py-3 text-sm font-semibold text-white shadow-md transition-all duration-300 hover:-translate-y-0.5 hover:bg-slate-800"
              >
                Explorar catálogo
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/deals"
                className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-6 py-3 text-sm font-semibold text-slate-700 transition-all duration-300 hover:-translate-y-0.5 hover:bg-slate-50"
              >
                Ver ofertas activas
              </Link>
            </div>
          </div>
        </motion.div>
      </section>

      <section className="mx-auto mt-8 grid w-full max-w-[1280px] grid-cols-1 gap-4 px-4 md:grid-cols-3 md:px-6">
        {featureItems.map((feature, idx) => (
          <motion.article
            key={feature.title}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.08, duration: 0.3, ease: "easeOut" }}
            className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm"
          >
            <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
              <feature.icon className="h-5 w-5" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900">{feature.title}</h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">{feature.description}</p>
          </motion.article>
        ))}
      </section>

      <section className="mx-auto mt-14 w-full max-w-[1280px] px-4 md:px-6">
        <div className="mb-7 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-3xl font-semibold tracking-tight text-slate-900">Recomendadas para ti</h2>
            <p className="mt-1 text-sm text-slate-500">Productos destacados por valoración y demanda.</p>
          </div>
          <Link href="/search" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700 hover:text-slate-900">
            Ver todo
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <ProductGrid products={featuredProducts} isLoading={isLoading} skeletonCount={8} />
      </section>

      <section className="mx-auto mt-14 w-full max-w-[1280px] px-4 pb-6 md:px-6">
        <div className="mb-7 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <h2 className="text-3xl font-semibold tracking-tight text-slate-900">Ofertas seleccionadas</h2>
            <PremiumBadge tone="danger">
              <span className="inline-flex items-center gap-1">
                <Zap className="h-3 w-3" />
                Tiempo limitado
              </span>
            </PremiumBadge>
          </div>
          <Link href="/deals" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700 hover:text-slate-900">
            Ver ofertas
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <ProductGrid
          products={dealProducts}
          isLoading={isLoading}
          skeletonCount={4}
          emptyTitle="Sin ofertas por ahora"
          emptyDescription="Muy pronto agregaremos nuevas promociones destacadas."
        />
      </section>
    </Layout>
  );
}
