import prisma from "@/lib/prisma";
import ProductFormClient from "./ProductFormClient";

export const dynamic = "force-dynamic";

export default async function NewProductPage() {
  const sizeCharts = await prisma.sizeChart.findMany();
  const discounts = await prisma.discount.findMany({ where: { active: true } });
  
  return <ProductFormClient sizeCharts={sizeCharts} discounts={discounts} />;
}
