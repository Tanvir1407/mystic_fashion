import prisma from "@/lib/prisma";
import ProductFormClient from "../../new/ProductFormClient";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function EditProductPage({ params }: { params: { id: string } }) {
  const product = await prisma.product.findUnique({
    where: { id: params.id },
    include: { variants: true }
  });

  if (!product) notFound();

  // Sort variants in-memory to prevent Prisma Client caching issues
  product.variants.sort((a, b) => (a.order || 0) - (b.order || 0));

  const sizeCharts = await prisma.sizeChart.findMany();
  const discounts = await prisma.discount.findMany({ where: { active: true } });

  return <ProductFormClient initialData={product} sizeCharts={sizeCharts} discounts={discounts} />;
}
