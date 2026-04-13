import { notFound } from 'next/navigation';
import ProductClient from './ProductClient';
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SidebarCart from "@/components/SidebarCart";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function ProductPage({ params }: { params: { id: string } }) {
  const [product, delivery] = await Promise.all([
    prisma.product.findUnique({
      where: { id: params.id },
      include: {
        variants: true,
        sizeChart: true,
        discount: true,
      }
    }),
    prisma.deliverySetting.findUnique({
      where: { id: "default" }
    })
  ]);

  if (!product) {
    notFound();
  }

  const deliveryData = delivery || { insideDhaka: 80, outsideDhaka: 150 };

  return (
    <div className="min-h-screen bg-white">
      <Header />
      <main className="w-full">
        <ProductClient product={product} sizeChartData={product.sizeChart || null} deliveryData={deliveryData} />
      </main>
      <Footer />
      <SidebarCart />
    </div>
  );
}
