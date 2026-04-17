import Header from "@/components/Header";
import HeroCarousel from "@/components/HeroCarousel";
import Footer from "@/components/Footer";
import SidebarCart from "@/components/SidebarCart";
import ProductCard from "@/components/ProductCard";
import Link from "next/link";
import Image from "next/image";
import prisma from "@/lib/prisma";
import { getFooterData } from "@/lib/footer";

export const dynamic = "force-dynamic";

function formatBDT(price: number) {
  return `৳${price.toLocaleString("en-IN")}`;
}

export default async function Home() {
  const [productsRes, heroSlidesRes, footerData] = await Promise.all([
    prisma.product.findMany({
      take: 12,
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

  return (
    <main className="min-h-screen bg-white dark:bg-zinc-950">
      <Header />
      <HeroCarousel slides={heroSlides} />

      <section className="container mx-auto py-20 px-4 md:px-0">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4 md:gap-6">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}

          {products.length === 0 && (
            <div className="col-span-2 lg:col-span-4 py-20 text-center text-slate-500 font-medium">
              No products found in the database. Please add items via the admin console!
            </div>
          )}
        </div>
      </section>

      <Footer config={footerData} />
      <SidebarCart />
    </main>
  );
}
