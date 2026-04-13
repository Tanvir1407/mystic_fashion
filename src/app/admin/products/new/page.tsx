import { prisma } from "@/lib/prisma";
import ProductFormClient from "./ProductFormClient";

export const dynamic = "force-dynamic";

export default async function NewProductPage() {
  // @ts-ignore
  const sizeCharts = await prisma.sizeChart.findMany();
  
  return <ProductFormClient sizeCharts={sizeCharts} />;
}
