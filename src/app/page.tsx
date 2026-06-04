import Header from "@/components/Header";
import HeroCarousel from "@/components/HeroCarousel";
import Footer from "@/components/Footer";
import SidebarCart from "@/components/SidebarCart";
import ProductCard from "@/components/ProductCard";
import Link from "next/link";
import prisma from "@/lib/prisma";
import { getFooterData } from "@/lib/footer";

export const dynamic = "force-dynamic";

export default async function Home({ searchParams }: { searchParams?: { limit?: string } }) {
  const limit = searchParams?.limit ? parseInt(searchParams.limit) : 12;

  const [productsRes, totalCountRes, heroSlidesRes, footerData] = await Promise.all([
    prisma.product.findMany({
      where: { isPublished: true },
      take: limit,
      orderBy: [
        { isFeatured: "desc" },
        { createdAt: "desc" }
      ],
      include: {
        discount: true,
        mediaAssets: { orderBy: { sortOrder: "asc" } },
        variants: {
          orderBy: { order: "asc" },
          include: {
            pricingMatrix: true,
            stocks: { where: { warehouse: { code: "WH-MAIN" } } }
          }
        }
      }
    }).catch(e => { console.error(e); return []; }),
    prisma.product.count({ where: { isPublished: true } }).catch(() => 0),
    prisma.heroSlide.findMany({
      where: { active: true },
      orderBy: { sortOrder: "asc" }
    }).catch(e => { console.error(e); return []; }),
    getFooterData()
  ]);

  const rawProducts = productsRes;
  const heroSlides = heroSlidesRes;

  const products = rawProducts.map((product: any) => {
    const basePrice = product.variants?.[0]?.pricingMatrix?.basePrice
      ? Number(product.variants[0].pricingMatrix.basePrice)
      : product.price;

    const displayImages = (product.mediaAssets && product.mediaAssets.length > 0)
      ? product.mediaAssets.map((asset: any) => asset.url)
      : (product.images || []);

    const mappedVariants = product.variants?.map((v: any) => ({
      ...v,
      stock: v.stocks?.[0]?.availableQuantity ?? v.stock ?? 0
    })) || [];

    return {
      ...product,
      price: basePrice,
      images: displayImages,
      variants: mappedVariants
    };
  });

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

        {products.length < totalCountRes && (
          <div className="flex justify-center mt-12">
            <Link
              href={`/?limit=${limit + 12}`}
              scroll={false}
              className="border-2 border-primary hover:border-primary/80 text-primary hover:text-primary/80 transition-colors px-10 py-3.5  font-bold uppercase text-sm"
            >
              View More Products
            </Link>
          </div>
        )}
      </section>
      <Footer config={footerData} />
      <SidebarCart />
    </main>
  );
}
