import Header from "@/components/Header";
import HeroCarousel from "@/components/HeroCarousel";
import Footer from "@/components/Footer";
import SidebarCart from "@/components/SidebarCart";
import HomepageMain from "@/components/HomepageMain";
import prisma from "@/lib/prisma";
import { getFooterData } from "@/lib/footer";

export const dynamic = "force-dynamic";

export default async function Home() {
  const [productsRes, heroSlidesRes, footerData] = await Promise.all([
    prisma.product.findMany({
      where: { isPublished: true },
      take: 80,
      orderBy: [
        { isFeatured: "desc" },
        { createdAt: "desc" }
      ],
      include: { discount: true, variants: true }
    }).catch(e => { console.error(e); return []; }),
    prisma.heroSlide.findMany({
      where: { active: true },
      orderBy: { sortOrder: "asc" }
    }).catch(e => { console.error(e); return []; }),
    getFooterData()
  ]);

  const products = productsRes;
  const heroSlides = heroSlidesRes;

  products.forEach(product => {
    if (product.variants) {
      product.variants.sort((a, b) => (a.order || 0) - (b.order || 0));
    }
  });

  return (
    <main className="min-h-screen bg-white dark:bg-zinc-950">
      <Header />
      <HeroCarousel slides={heroSlides} />

      <HomepageMain products={products} />

      <Footer config={footerData} />
      <SidebarCart />
    </main>
  );
}
