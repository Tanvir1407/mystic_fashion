import Header from "@/components/Header";
import HeroCarousel from "@/components/HeroCarousel";
import Footer from "@/components/Footer";
import SidebarCart from "@/components/SidebarCart";
import HomepageMain from "@/components/HomepageMain";
import prisma from "@/lib/prisma";
import { getFooterData } from "@/lib/footer";

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

  // Common select include block for products in enterprise schema
  const productIncludeBlock = {
    discount: true,
    mediaAssets: { orderBy: { sortOrder: "asc" } as const },
    variants: {
      orderBy: { order: "asc" } as const,
      include: {
        pricingMatrix: true,
        stocks: { where: { warehouse: { code: "WH-MAIN" } } }
      }
    }
  };

  const [categoryRecentRes, categoryShowroomRes, heroSlidesRes, footerData] = await Promise.all([
    // 1. New Arrivals: top 4 recent products per category
    Promise.all(
      categoriesList.map((cat) =>
        prisma.product.findMany({
          where: {
            isPublished: true,
            category: { equals: cat, mode: "insensitive" }
          },
          take: 4,
          orderBy: { createdAt: "desc" },
          include: productIncludeBlock
        }).catch(e => { console.error(e); return []; })
      )
    ),
    // 2. Showrooms: top 4 products (isFeatured: true first, then top sold)
    Promise.all(
      categoriesList.map(async (catName) => {
        try {
          // Fetch featured products (up to 4)
          const featured = await prisma.product.findMany({
            where: {
              isPublished: true,
              category: { equals: catName, mode: "insensitive" },
              isFeatured: true
            },
            take: 4,
            include: productIncludeBlock
          });

          let finalProducts = [...featured];

          // If less than 4, fill with top sold items
          if (finalProducts.length < 4) {
            const remainingCount = 4 - finalProducts.length;
            const topSold = await prisma.product.findMany({
              where: {
                isPublished: true,
                category: { equals: catName, mode: "insensitive" },
                id: { notIn: finalProducts.map(p => p.id) }
              },
              orderBy: {
                orderItems: {
                  _count: "desc"
                }
              },
              take: remainingCount,
              include: productIncludeBlock
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

  // Map database product fields to match local frontend schema
  const mapProduct = (product: any) => {
    const basePrice = product.variants?.[0]?.pricingMatrix?.basePrice
      ? Number(product.variants[0].pricingMatrix.basePrice)
      : 0;

    const displayImages = (product.mediaAssets && product.mediaAssets.length > 0)
      ? product.mediaAssets.map((asset: any) => asset.url)
      : [];

    const mappedVariants = product.variants?.map((v: any) => ({
      ...v,
      stock: v.stocks?.[0]?.availableQuantity ?? 0
    })) || [];

    return {
      ...product,
      price: basePrice,
      images: displayImages,
      variants: mappedVariants
    };
  };

  const newArrivalsProducts = categoryRecentRes.flat().map(mapProduct);
  const showroomProducts = categoryShowroomRes.flat().map(mapProduct);
  const heroSlides = heroSlidesRes;

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
