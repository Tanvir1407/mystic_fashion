import { prisma } from "@/lib/prisma";
import ProductFormClient from "../../new/ProductFormClient";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function EditProductPage({ params }: { params: { id: string } }) {
  // @ts-ignore
  const product = await prisma.product.findUnique({
    where: { id: params.id },
    include: { variants: true }
  });

  if (!product) notFound();

  // @ts-ignore
  const sizeCharts = await prisma.sizeChart.findMany();

  return <ProductFormClient initialData={product} sizeCharts={sizeCharts} />;
}
