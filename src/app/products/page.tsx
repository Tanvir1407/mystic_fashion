import { Suspense } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SidebarCart from "@/components/SidebarCart";
import prisma from "@/lib/prisma";
import { getFooterData } from "@/lib/footer";
import ProductsClient from "./ProductsClient";

export const dynamic = "force-dynamic";

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: { category?: string; brand?: string; subcategory?: string };
}) {
  const [productsRes, categoriesRes, brandsRes, footerData] = await Promise.all([
    prisma.product.findMany({
      where: { isPublished: true },
      include: {
        brand: true,
        categoryRel: true,
        subcategory: true,
        discount: true,
        variants: true,
      },
      orderBy: { createdAt: "desc" },
    }).catch((e) => {
      console.error("Failed to fetch products:", e);
      return [];
    }),
    prisma.category.findMany({
      include: { subcategories: true },
      orderBy: { name: "asc" },
    }).catch((e) => {
      console.error("Failed to fetch categories:", e);
      return [];
    }),
    prisma.brand.findMany({
      orderBy: { name: "asc" },
    }).catch((e) => {
      console.error("Failed to fetch brands:", e);
      return [];
    }),
    getFooterData().catch((e) => {
      console.error("Failed to fetch footer data:", e);
      return null;
    }),
  ]);

  // Sort variants by order field
  const products = productsRes || [];
  products.forEach((product) => {
    if (product.variants) {
      product.variants.sort((a, b) => (a.order || 0) - (b.order || 0));
    }
  });

  return (
    <main className="min-h-screen bg-white dark:bg-zinc-950">
      <Header />
      
      <Suspense fallback={
        <div className="w-full bg-slate-50 dark:bg-zinc-950 py-6 animate-pulse border-t border-slate-200 dark:border-zinc-800 min-h-[600px]">
          <div className="container mx-auto px-4 md:px-0">
            <div className="h-7 bg-slate-200 dark:bg-zinc-800 w-48 mb-10" />
            <div className="flex gap-2 relative items-start">
              {/* Left filter sidebar loading skeleton */}
              <div className="hidden md:block w-72 h-[500px] bg-slate-200 dark:bg-zinc-800 rounded-none flex-shrink-0" />
              {/* Right grid loading skeleton */}
              <div className="flex-1 grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2 md:gap-4">
                {[...Array(8)].map((_, idx) => (
                  <div key={idx} className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 h-96 rounded-none p-4 space-y-4">
                    <div className="aspect-[3/4] bg-slate-100 dark:bg-zinc-800 w-full rounded-none" />
                    <div className="h-4 bg-slate-200 dark:bg-zinc-800 w-2/3" />
                    <div className="h-3 bg-slate-200 dark:bg-zinc-800 w-1/2" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      }>
        <ProductsClient
          products={products}
          categories={categoriesRes || []}
          brands={brandsRes || []}
          initialCategory={searchParams.category}
          initialBrand={searchParams.brand}
          initialSubcategory={searchParams.subcategory}
        />
      </Suspense>

      <Footer config={footerData} />
      <SidebarCart />
    </main>
  );
}
