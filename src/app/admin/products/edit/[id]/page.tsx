import prisma from "@/lib/prisma";
import ProductFormClient from "../../new/ProductFormClient";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function EditProductPage({
  params,
}: {
  params: { id: string };
}) {
  const product = await prisma.product.findUnique({
    where: { id: params.id },
    include: {
      variants: {
        include: {
          pricingMatrix: true,
        },
      },
      mediaAssets: {
        orderBy: { sortOrder: "asc" },
      },
    },
  });

  if (!product) notFound();

  // Sort variants in-memory to prevent Prisma Client caching issues
  product.variants.sort((a, b) => (a.order || 0) - (b.order || 0));

  const sizeCharts = await prisma.sizeChart.findMany();
  const discounts = await prisma.discount.findMany({ where: { active: true } });
  const brands = await prisma.brand.findMany({ orderBy: { name: "asc" } });
  const categories = await prisma.category.findMany({
    orderBy: { name: "asc" },
    include: { subcategories: { orderBy: { name: "asc" } } },
  });

  return (
    <ProductFormClient
      initialData={product}
      sizeCharts={sizeCharts}
      discounts={discounts}
      brands={brands}
      categories={categories}
    />
  );
}
