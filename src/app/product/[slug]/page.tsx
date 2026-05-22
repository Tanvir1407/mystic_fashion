import { notFound, redirect } from 'next/navigation';
import ProductClient from './ProductClient';
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SidebarCart from "@/components/SidebarCart";
import prisma from "@/lib/prisma";
import { getFooterData } from "@/lib/footer";
import { cookies } from 'next/headers';

export const dynamic = "force-dynamic";

export default async function ProductPage({ params }: { params: { slug: string } }) {
  const cookieStore = cookies();
  const isAdmin = cookieStore.get("admin-auth")?.value === "true";

  const identifier = params.slug;
  // Match UUID pattern (standard Prisma UUID format)
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(identifier);

  let product = null;

  if (isUuid) {
    product = await prisma.product.findUnique({
      where: { id: identifier },
      include: {
        variants: true,
        sizeChart: true,
        discount: true,
      }
    });

    // If found by ID and has a slug, do a 301 redirect to the slug-based URL!
    if (product && product.slug) {
      redirect(`/product/${product.slug}`);
    }
  } else {
    product = await prisma.product.findUnique({
      where: { slug: identifier },
      include: {
        variants: true,
        sizeChart: true,
        discount: true,
      }
    });
  }

  // Fallback: If not found by slug, maybe check if it's an ID (non-standard format fallback)
  if (!product) {
    product = await prisma.product.findUnique({
      where: { id: identifier },
      include: {
        variants: true,
        sizeChart: true,
        discount: true,
      }
    });
    if (product && product.slug) {
      redirect(`/product/${product.slug}`);
    }
  }

  if (!product || (!product.isPublished && !isAdmin)) {
    notFound();
  }

  // Sort variants in-memory to prevent Prisma Client caching issues
  product.variants.sort((a, b) => (a.order || 0) - (b.order || 0));

  const [delivery, footerData] = await Promise.all([
    prisma.deliverySetting.findUnique({
      where: { id: "default" }
    }),
    getFooterData()
  ]);

  const deliveryData = delivery || { insideDhaka: 80, outsideDhaka: 150 };

  return (
    <div className="min-h-screen bg-white">
      <Header />
      <main className="w-full">
        <ProductClient product={product} sizeChartData={product.sizeChart || null} deliveryData={deliveryData} />
      </main>
      <Footer config={footerData} />
      <SidebarCart />
    </div>
  );
}
