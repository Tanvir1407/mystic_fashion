import type { Metadata } from "next";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SidebarCart from "@/components/SidebarCart";
import HomepageMain from "@/components/HomepageMain";
import prisma from "@/lib/prisma";
import { getFooterData } from "@/lib/footer";
import nextDynamic from "next/dynamic";

export const metadata: Metadata = {
  title: "Mystic Fashion | Premium Jersey & Apparel in Bangladesh",
  description: "Shop authentic jerseys, sportswear & fashion apparel at Mystic Fashion. Premium quality with nationwide delivery across Bangladesh.",
  openGraph: {
    title: "Mystic Fashion | Premium Jersey & Apparel",
    description: "Shop authentic jerseys, sportswear & fashion apparel at Mystic Fashion.",
    url: "https://mysticfashion.co",
    siteName: "Mystic Fashion",
    images: [{ url: "https://mysticfashion.co/og-image.jpg", width: 1200, height: 630, alt: "Mystic Fashion" }],
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "Mystic Fashion | Premium Jersey & Apparel",
    description: "Shop authentic jerseys, sportswear & fashion apparel at Mystic Fashion.",
    images: ["https://mysticfashion.co/og-image.jpg"],
  },
  alternates: { canonical: "https://mysticfashion.co" },
};

const HeroCarousel = nextDynamic(() => import("@/components/HeroCarousel"), {
  ssr: false,
  loading: () => (
    <div className="container mx-auto mt-0 md:mt-2 px-4 md:px-0 w-full h-[250px] sm:h-[350px] md:h-[450px] lg:h-[500px] bg-slate-100 dark:bg-zinc-900 animate-pulse" />
  ),
});

export const dynamic = "force-dynamic";

export default async function Home() {
  // Fetch active categories from DB, sorted by sortOrder set in admin
  const dbCategories = await prisma.category.findMany({
    where: { active: true, deletedAt: null },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: { id: true, name: true, image: true, sortOrder: true },
  }).catch((e) => { console.error(e); return []; });

  // Build ordered category name list for product queries
  const categoriesList = dbCategories.map((c) => c.name);

  const [categoryRecentRes, categoryShowroomRes, heroSlidesRes, footerData] = await Promise.all([
    // 1. New Arrivals: top 4 recent products per category
    Promise.all(
      categoriesList.map((cat) =>
        prisma.product.findMany({
          where: {
            isPublished: true,
            categoryRel: { name: { equals: cat, mode: "insensitive" } }
          },
          take: 4,
          orderBy: { createdAt: "desc" },
          include: {
            discount: true,
            mediaAssets: { orderBy: { sortOrder: "asc" } },
            variants: {
              include: {
                pricingMatrix: true,
                stocks: { where: { warehouse: { code: "MAIN" } } }
              }
            }
          }
        }).catch(e => { console.error(e); return []; })
      )
    ),
    // 2. Showrooms: top 4 products (isFeatured: true first, then top sold)
    Promise.all(
      categoriesList.map(async (catName) => {
        try {
          // Fetch featured products (up to 4) ordered by featuredOrder
          const featured = await prisma.product.findMany({
            where: {
              isPublished: true,
              categoryRel: { name: { equals: catName, mode: "insensitive" } },
              isFeatured: true
            },
            orderBy: { featuredOrder: "asc" },
            take: 4,
            include: {
              discount: true,
              mediaAssets: { orderBy: { sortOrder: "asc" } },
              variants: {
                include: {
                  pricingMatrix: true,
                  stocks: { where: { warehouse: { code: "MAIN" } } }
                }
              }
            }
          });

          let finalProducts = [...featured];

          // If less than 4, fill with top sold items
          if (finalProducts.length < 4) {
            const remainingCount = 4 - finalProducts.length;
            const topSold = await prisma.product.findMany({
              where: {
                isPublished: true,
                categoryRel: { name: { equals: catName, mode: "insensitive" } },
                id: { notIn: finalProducts.map(p => p.id) }
              },
              orderBy: {
                orderItems: {
                  _count: "desc"
                }
              },
              take: remainingCount,
              include: {
              discount: true,
              mediaAssets: { orderBy: { sortOrder: "asc" } },
              variants: {
                include: {
                  pricingMatrix: true,
                  stocks: { where: { warehouse: { code: "MAIN" } } }
                }
              }
            }
            });
            finalProducts = [...finalProducts, ...topSold];
          }

          return finalProducts;
        } catch (e) {
          console.error(`Failed to fetch showroom products for ${catName}:`, e);
          return [];
        }
      })
    ),
    prisma.heroSlide.findMany({
      where: { active: true },
      orderBy: { sortOrder: "asc" }
    }).catch(e => { console.error(e); return []; }),
    getFooterData()
  ]);

  // Helper to map and convert pricingMatrix decimal values to standard numbers
  const mapProductPrices = (product: any) => {
    if (!product) return product;
    const toNumber = (val: any) => {
      if (val === null || val === undefined) return null;
      if (typeof val === "number") return val;
      if (typeof val.toNumber === "function") return val.toNumber();
      if (typeof val === "object" && Array.isArray(val.d)) {
        return parseFloat(val.toString()) || 0;
      }
      return Number(val) || 0;
    };
    const variants = product.variants?.map((v: any) => ({
      ...v,
      stock: v.stocks?.[0]?.availableQuantity ?? 0,
      pricingMatrix: v.pricingMatrix ? {
        ...v.pricingMatrix,
        basePrice: toNumber(v.pricingMatrix.basePrice) ?? 0,
        costPrice: toNumber(v.pricingMatrix.costPrice),
        msrp: toNumber(v.pricingMatrix.msrp),
        b2bPrice: toNumber(v.pricingMatrix.b2bPrice)
      } : null
    })) || [];
    const basePrice = variants[0]?.pricingMatrix?.basePrice ?? 0;
    const images = (product.mediaAssets && product.mediaAssets.length > 0)
      ? product.mediaAssets.map((a: any) => a.url)
      : (product.images || []);
    return {
      ...product,
      price: basePrice,
      category: product.categoryRel?.name || "",
      variants,
      images
    };
  };

  const newArrivalsProducts = categoryRecentRes.flat().map(mapProductPrices);
  const showroomProducts = categoryShowroomRes.flat().map(mapProductPrices);
  const heroSlides = heroSlidesRes;

  // Sort variants by order in place
  newArrivalsProducts.forEach(product => {
    if (product.variants) {
      product.variants.sort((a, b) => (a.order || 0) - (b.order || 0));
    }
  });

  showroomProducts.forEach(product => {
    if (product.variants) {
      product.variants.sort((a, b) => (a.order || 0) - (b.order || 0));
    }
  });

  return (
    <main className="min-h-screen bg-white dark:bg-zinc-950">
      <Header />
      <HeroCarousel slides={heroSlides} />

      <HomepageMain
        initialNewArrivalsProducts={newArrivalsProducts}
        showroomProducts={showroomProducts}
        categories={dbCategories}
      />

      <Footer config={footerData} />
      <SidebarCart />
    </main>
  );
}
