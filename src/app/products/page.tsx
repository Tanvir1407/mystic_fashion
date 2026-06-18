import { Suspense } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SidebarCart from "@/components/SidebarCart";
import prisma from "@/lib/prisma";
import { getFooterData } from "@/lib/footer";
import ProductsClient from "./ProductsClient";

export const dynamic = "force-dynamic";

// Helper to calculate product final price after active discount on server
const getFinalPrice = (product: any): number => {
  let finalPrice = product.price;
  if (product.discount && product.discount.active) {
    if (product.discount.discountType === "PERCENTAGE") {
      finalPrice = product.price - (product.price * (product.discount.value / 100));
    } else {
      finalPrice = Math.max(0, product.price - product.discount.value);
    }
  }
  return Math.round(finalPrice);
};

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

  // Build the database query clauses dynamically
  const whereClause: any = { isPublished: true };

  // Category filter (match name case-insensitively or match direct categoryRel ID)
  if (categoryParam) {
    const isUuid = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(categoryParam);
    if (isUuid) {
      whereClause.categoryId = categoryParam;
    } else {
      whereClause.categoryRel = {
        name: { equals: categoryParam, mode: "insensitive" }
      };
    }
  }

  // Subcategory filter (match name case-insensitively or match direct subcategory ID)
  if (subcategoryParam) {
    const isUuid = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(subcategoryParam);
    if (isUuid) {
      whereClause.subcategoryId = subcategoryParam;
    } else {
      whereClause.subcategory = {
        name: { equals: subcategoryParam, mode: "insensitive" }
      };
    }
  }

  // Brand filter (supports comma-separated list of IDs or a brand name)
  if (brandParam) {
    const brandsList = brandParam.split(",");
    const isUuid = (str: string) => /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(str);
    
    if (brandsList.every(isUuid)) {
      whereClause.brandId = { in: brandsList };
    } else {
      whereClause.brand = {
        name: { in: brandsList, mode: "insensitive" }
      };
    }
  }

  // Fetch all filtered products, categories (active), brands (active), and footerData in concurrent queries
  const [productsRes, categoriesRes, brandsRes, footerData] = await Promise.all([
    prisma.product.findMany({
      where: whereClause,
      select: {
        id: true,
        slug: true,
        name: true,
        description: true,
        team: true,
        category: true,
        brandId: true,
        categoryId: true,
        subcategoryId: true,
        createdAt: true,
        isFeatured: true,
        isPublished: true,
        brand: true,
        categoryRel: true,
        subcategory: true,
        discount: true,
        mediaAssets: { orderBy: { sortOrder: "asc" } },
        variants: {
          select: {
            id: true,
            size: true,
            color: true,
            colorCode: true,
            sku: true,
            order: true,
            pricingMatrix: true,
            stocks: { where: { warehouse: { code: "WH-MAIN" } } }
          }
        }
      },
      orderBy: { createdAt: "desc" },
    }).catch((e) => {
      console.error("Failed to fetch products:", e);
      return [];
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

  // Map products to legacy structure so the client page remains unaffected
  const rawProducts = (productsRes || []).map((product: any) => {
    const basePrice = product.variants?.[0]?.pricingMatrix?.basePrice
      ? Number(product.variants[0].pricingMatrix.basePrice)
      : product.price;

    const displayImages = (product.mediaAssets && product.mediaAssets.length > 0)
      ? product.mediaAssets.map((asset: any) => asset.url)
      : (product.images || []);

    const mappedVariants = product.variants?.map((v: any) => ({
      ...v,
      stock: v.stocks?.[0]?.availableQuantity ?? v.stock ?? 0,
      pricingMatrix: v.pricingMatrix ? {
        ...v.pricingMatrix,
        basePrice: v.pricingMatrix.basePrice ? Number(v.pricingMatrix.basePrice) : 0,
        costPrice: v.pricingMatrix.costPrice ? Number(v.pricingMatrix.costPrice) : null,
      } : null
    })) || [];

    // Sort variants by order field in-place
    mappedVariants.sort((a: any, b: any) => (a.order || 0) - (b.order || 0));

    return {
      ...product,
      price: basePrice,
      purchasePrice: product.variants?.[0]?.pricingMatrix?.costPrice
        ? Number(product.variants[0].pricingMatrix.costPrice)
        : 0,
      images: displayImages,
      variants: mappedVariants
    };
  });

  // Apply Price Range filtering in-memory on the server side (to fully support active dynamic discounts in Prisma without RAW SQL)
  const minPrice = Number(minPriceParam) || 0;
  const maxPrice = Number(maxPriceParam) || Infinity;

  const priceFilteredProducts = rawProducts.filter((product) => {
    const finalPrice = getFinalPrice(product);
    return finalPrice >= minPrice && finalPrice <= maxPrice;
  });

  // Calculate the global min/max price range strictly for the filtered set (used to set the bounds of the sidebar price range UI)
  const allFinalPrices = priceFilteredProducts.map(getFinalPrice);
  const globalMinPrice = allFinalPrices.length > 0 ? Math.min(...allFinalPrices) : 0;
  const globalMaxPrice = allFinalPrices.length > 0 ? Math.max(...allFinalPrices) : 10000;

  // Apply selected Sorting options
  const sortedProducts = [...priceFilteredProducts];
  if (sortParam === "price-asc") {
    sortedProducts.sort((a, b) => getFinalPrice(a) - getFinalPrice(b));
  } else if (sortParam === "price-desc") {
    sortedProducts.sort((a, b) => getFinalPrice(b) - getFinalPrice(a));
  } else {
    // default: newest
    sortedProducts.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

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
