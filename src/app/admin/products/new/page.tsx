import prisma from "@/lib/prisma";
import ProductFormClient from "./ProductFormClient";

export const dynamic = "force-dynamic";

export default async function NewProductPage() {
  const sizeCharts = await prisma.sizeChart.findMany();
  const discounts = await prisma.discount.findMany({ where: { active: true } });
  const brands = await prisma.brand.findMany({ orderBy: { name: "asc" } });
  const categories = await prisma.category.findMany({
    orderBy: { name: "asc" },
    include: { subcategories: { orderBy: { name: "asc" } } },
  });

  return (
    <ProductFormClient
      sizeCharts={sizeCharts}
      discounts={discounts}
      brands={brands}
      categories={categories}
    />
  );
}
