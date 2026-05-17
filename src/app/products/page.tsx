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
      
      <ProductsClient
        products={products}
        categories={categoriesRes || []}
        brands={brandsRes || []}
        initialCategory={searchParams.category}
        initialBrand={searchParams.brand}
        initialSubcategory={searchParams.subcategory}
      />

      <Footer config={footerData} />
      <SidebarCart />
    </main>
  );
}
