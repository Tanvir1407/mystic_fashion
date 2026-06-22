import prisma from "@/lib/prisma";
import ProductFormClient from "../../new/ProductFormClient";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function EditProductPage({ params }: { params: { id: string } }) {
  const sizeCharts = await prisma.sizeChart.findMany();
  const discounts = await prisma.discount.findMany({ where: { active: true } });
  const brands = await prisma.brand.findMany({ orderBy: { name: 'asc' } });
  const categories = await prisma.category.findMany({
    orderBy: { name: 'asc' },
    include: { subcategories: { orderBy: { name: 'asc' } } }
  });

  const productRes = await prisma.product.findUnique({
    where: { id: params.id },
    include: {
      variants: {
        include: {
          pricingMatrix: true,
          stocks: {
            where: {
              warehouse: { code: "MAIN" }
            }
          }
        }
      },
      mediaAssets: true,
      comboChildOptions: true
    }
  });

  if (!productRes) notFound();

  // Sort variants in-memory to prevent Prisma Client caching issues
  productRes.variants.sort((a, b) => (a.order || 0) - (b.order || 0));

  const basePrice = productRes.variants?.[0]?.pricingMatrix?.basePrice
    ? Number(productRes.variants[0].pricingMatrix.basePrice)
    : 0;

  const displayImages = productRes.mediaAssets && productRes.mediaAssets.length > 0
    ? productRes.mediaAssets.map((asset: any) => asset.url)
    : [];

  const mappedVariants = productRes.variants.map((v: any) => ({
    ...v,
    stock: v.stocks?.[0]?.availableQuantity ?? 0,
    pricingMatrix: v.pricingMatrix ? {
      ...v.pricingMatrix,
      costPrice: v.pricingMatrix.costPrice ? Number(v.pricingMatrix.costPrice) : null,
      basePrice: v.pricingMatrix.basePrice ? Number(v.pricingMatrix.basePrice) : 0,
      msrp: v.pricingMatrix.msrp ? Number(v.pricingMatrix.msrp) : null,
      b2bPrice: v.pricingMatrix.b2bPrice ? Number(v.pricingMatrix.b2bPrice) : null,
    } : null
  }));

  const resolvedCategoryId = productRes.categoryId;

  const product = {
    ...productRes,
    price: basePrice,
    images: displayImages,
    variants: mappedVariants,
    categoryId: resolvedCategoryId,
    isCombo: productRes.isCombo,
    comboRequiredQty: productRes.comboRequiredQty,
    comboChildIds: productRes.comboChildOptions?.map((o: any) => o.childProductId) || []
  };

  const allProducts = await prisma.product.findMany({
    where: { deletedAt: null, id: { not: params.id } },
    select: { id: true, name: true },
    orderBy: { name: 'asc' }
  });

  return <ProductFormClient initialData={product} sizeCharts={sizeCharts} discounts={discounts} brands={brands} categories={categories} allProducts={allProducts} />;
}

