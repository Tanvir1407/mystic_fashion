import prisma from "@/lib/prisma";
import ProductFormClient from "./ProductFormClient";

export const dynamic = "force-dynamic";

export default async function NewProductPage() {
  const sizeCharts = await prisma.sizeChart.findMany();
  const discounts = await prisma.discount.findMany({ where: { active: true } });
  const brands = await prisma.brand.findMany({ orderBy: { name: 'asc' } });
  const categories = await prisma.category.findMany({
    orderBy: { name: 'asc' },
    include: { subcategories: { orderBy: { name: 'asc' } } }
  });
  const allProducts = await prisma.product.findMany({
    where: { deletedAt: null },
    select: { id: true, name: true, categoryId: true, categoryRel: { select: { name: true } }, mediaAssets: { select: { url: true }, take: 1 } },
    orderBy: { name: 'asc' }
  });
  
  return <ProductFormClient sizeCharts={sizeCharts} discounts={discounts} brands={brands} categories={categories} allProducts={allProducts} />;
}
