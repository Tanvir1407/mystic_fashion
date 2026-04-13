import Header from "@/components/Header";
import HeroCarousel from "@/components/HeroCarousel";
import Footer from "@/components/Footer";
import SidebarCart from "@/components/SidebarCart";
import AddToBagButton from "@/components/AddToBagButton";
import Link from "next/link";
import Image from "next/image";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function formatBDT(price: number) {
  return `৳${price.toLocaleString("en-IN")}`;
}

export default async function Home() {
  const [products, heroSlides] = await Promise.all([
    prisma.product.findMany({ take: 12, orderBy: { createdAt: "desc" } }),
    prisma.heroSlide.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" } }),
  ]);

  return (
    <main className="min-h-screen bg-white dark:bg-zinc-950">
      <Header />
      <HeroCarousel slides={heroSlides} />

      <section className="container mx-auto py-20 px-4 md:px-0">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          {products.map((product) => {
            return (
              <Link href={`/product/${product.id}`} key={product.id} className="group">
                <div className="flex flex-col bg-white dark:bg-zinc-900 rounded-xl overflow-hidden transition-all duration-300 shadow border border-transparent hover:border-slate-200 dark:hover:border-zinc-700 h-full">

                  {/* 1. Image Section */}
                  <div className="relative aspect-[3/4] bg-[#F5F5F5] dark:bg-zinc-800 overflow-hidden">
                    {product.images[0] ? (
                      <Image
                        src={product.images[0]}
                        alt={product.name}
                        fill
                        className="object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-400 text-sm font-medium">
                        View Product
                      </div>
                    )}
                  </div>

                  {/* 2. Product Info */}
                  <div className="p-3 md:p-4 flex flex-col gap-1.5 flex-1">
                    <h3 className="text-sm md:text-[15px] font-bold text-zinc-800 dark:text-zinc-100 leading-snug line-clamp-2 group-hover:text-[#800020] transition-colors duration-300">
                      {product.name}
                    </h3>
                    <div className="flex items-baseline gap-2 mt-auto pt-2">
                      <span className="text-[#800020] font-black text-base md:text-lg">{formatBDT(product.price)}</span>
                    </div>
                  </div>

                  {/* 3. Add to Bag */}
                  <div className="px-3 pb-3 md:px-4 md:pb-4 mt-auto">
                    <AddToBagButton product={{
                      id: product.id,
                      name: product.name,
                      price: product.price,
                      team: product.team,
                      image: product.images[0] || ""
                    }} />
                  </div>

                </div>
              </Link>
            );
          })}

          {products.length === 0 && (
            <div className="col-span-2 lg:col-span-4 py-20 text-center text-slate-500 font-medium">
              No products found in the database. Please add items via the admin console!
            </div>
          )}
        </div>
      </section>

      <Footer />
      <SidebarCart />
    </main>
  );
}
