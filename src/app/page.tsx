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
  const dbCategories = await prisma.category
    .findMany({
      where: { active: true, deletedAt: null },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: { id: true, name: true, image: true, sortOrder: true },
    })
    .catch((e) => {
      console.error(e);
      return [];
    });

  // Build ordered category name list for product queries
  const categoriesList = dbCategories.map((c) => c.name);

  const [categoryRecentRes, categoryShowroomRes, heroSlidesRes, footerData] =
    await Promise.all([
      // 1. New Arrivals: top 4 recent products per category
      Promise.all(
        categoriesList.map((cat) =>
          prisma.product
            .findMany({
              where: {
                isPublished: true,
                category: { equals: cat, mode: "insensitive" },
              },
              take: 4,
              orderBy: { createdAt: "desc" },
              include: {
                discount: true,
                variants: {
                  include: { pricingMatrix: { select: { basePrice: true } } },
                },
              },
            })
            .catch((e) => {
              console.error(e);
              return [];
            }),
        ),
      ),
      // 2. Showrooms: top 4 products (isFeatured: true first, then top sold)
      Promise.all(
        categoriesList.map(async (catName) => {
          try {
            // Fetch featured products (up to 4) ordered by featuredOrder
            const featured = await prisma.product.findMany({
              where: {
                isPublished: true,
                category: { equals: catName, mode: "insensitive" },
                isFeatured: true,
              },
              orderBy: { featuredOrder: "asc" },
              take: 4,
              include: {
                discount: true,
                variants: {
                  include: { pricingMatrix: { select: { basePrice: true } } },
                },
              },
            });

            let finalProducts = [...featured];

            // If less than 4, fill with top sold items
            if (finalProducts.length < 4) {
              const remainingCount = 4 - finalProducts.length;
              const topSold = await prisma.product.findMany({
                where: {
                  isPublished: true,
                  category: { equals: catName, mode: "insensitive" },
                  id: { notIn: finalProducts.map((p) => p.id) },
                },
                orderBy: {
                  orderItems: {
                    _count: "desc",
                  },
                },
                take: remainingCount,
                include: {
                  discount: true,
                  variants: {
                    include: { pricingMatrix: { select: { basePrice: true } } },
                  },
                },
              });
              finalProducts = [...finalProducts, ...topSold];
            }

            return finalProducts;
          } catch (e) {
            console.error(
              `Failed to fetch showroom products for ${catName}:`,
              e,
            );
            return [];
          }
        }),
      ),
      prisma.heroSlide
        .findMany({
          where: { active: true },
          orderBy: { sortOrder: "asc" },
        })
        .catch((e) => {
          console.error(e);
          return [];
        }),
      getFooterData(),
    ]);

  const newArrivalsProducts = categoryRecentRes.flat();
  const showroomProducts = categoryShowroomRes.flat();
  const heroSlides = heroSlidesRes;

  // Sort variants by order in place
  newArrivalsProducts.forEach((product) => {
    if (product.variants) {
      product.variants.sort((a, b) => (a.order || 0) - (b.order || 0));
    }
  });

  showroomProducts.forEach((product) => {
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
