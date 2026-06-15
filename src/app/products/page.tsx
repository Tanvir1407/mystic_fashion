import { Suspense } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SidebarCart from "@/components/SidebarCart";
import prisma from "@/lib/prisma";
import { getFooterData } from "@/lib/footer";
import ProductsClient from "./ProductsClient";
import { getFilteredProductsList } from "./actions";

export const dynamic = "force-dynamic";

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: { 
    category?: string; 
    brand?: string; 
    subcategory?: string;
    minPrice?: string;
    maxPrice?: string;
    sort?: string;
    page?: string;
  };
}) {
  const categoryParam = searchParams.category || "";
  const subcategoryParam = searchParams.subcategory || "";
  const brandParam = searchParams.brand || "";
  const minPriceParam = searchParams.minPrice || "";
  const maxPriceParam = searchParams.maxPrice || "";
  const sortParam = searchParams.sort || "newest";
  const pageParam = Number(searchParams.page) || 1;
  const limit = 12; // 12 products per page

  // Fetch all filtered products, categories (active), brands (active), and footerData in concurrent queries
  const [allProductsResult, categoriesRes, brandsRes, footerData] = await Promise.all([
    getFilteredProductsList({
      category: categoryParam,
      subcategory: subcategoryParam,
      brand: brandParam,
      minPrice: minPriceParam,
      maxPrice: maxPriceParam,
      sort: sortParam,
    }),
    prisma.category.findMany({
      where: { active: true },
      include: {
        subcategories: {
          where: { active: true },
          orderBy: { name: "asc" },
        },
      },
      orderBy: { name: "asc" },
    }).catch((e) => {
      console.error("Failed to fetch categories:", e);
      return [];
    }),
    prisma.brand.findMany({
      where: { active: true },
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

  const { products: sortedProducts, globalMinPrice, globalMaxPrice } = allProductsResult;

  // Paginate products
  const totalCount = sortedProducts.length;
  const totalPages = Math.ceil(totalCount / limit);
  const currentPage = Math.min(Math.max(1, pageParam), totalPages || 1);
  const paginatedProducts = sortedProducts.slice((currentPage - 1) * limit, currentPage * limit);

  return (
    <main className="min-h-screen bg-white dark:bg-zinc-950">
      <Header />
      
      <Suspense fallback={
        <div className="w-full bg-slate-50 dark:bg-zinc-950 py-6 animate-pulse border-t border-slate-200 dark:border-zinc-800 min-h-[600px]">
          <div className="container mx-auto px-4 md:px-0">
            <div className="h-7 bg-slate-200 dark:bg-zinc-800 w-48 mb-10" />
            <div className="flex gap-2 relative items-start">
              <div className="hidden md:block w-72 h-[500px] bg-slate-200 dark:bg-zinc-800 rounded-none flex-shrink-0" />
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
          products={paginatedProducts as any}
          categories={categoriesRes || []}
          brands={brandsRes || []}
          initialCategory={categoryParam}
          initialBrand={brandParam}
          initialSubcategory={subcategoryParam}
          totalCount={totalCount}
          currentPage={currentPage}
          totalPages={totalPages}
          globalMinPrice={globalMinPrice}
          globalMaxPrice={globalMaxPrice}
          initialMinPrice={minPriceParam}
          initialMaxPrice={maxPriceParam}
          initialSort={sortParam}
        />
      </Suspense>

      <Footer config={footerData} />
      <SidebarCart />
    </main>
  );
}
