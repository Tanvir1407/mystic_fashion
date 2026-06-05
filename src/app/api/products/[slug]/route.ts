import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(_req: NextRequest, { params }: { params: { slug: string } }) {
  try {
    const { slug } = params;

    const product = await prisma.product.findFirst({
      where: {
        OR: [{ slug }, { id: slug }],
        isPublished: true,
        deletedAt: null,
      },
      include: {
        discount: true,
        brand: { select: { id: true, name: true } },
        categoryRel: { select: { id: true, name: true } },
        subcategory: { select: { id: true, name: true } },
        sizeChart: { select: { id: true, category: true, data: true } },
        mediaAssets: { orderBy: { sortOrder: "asc" } },
        variants: {
          orderBy: { order: "asc" },
          include: {
            pricingMatrix: true,
            stocks: { where: { warehouse: { code: "WH-MAIN" } } }
          }
        },
      },
    });

    if (!product) {
      return NextResponse.json({ success: false, error: "Product not found" }, { status: 404 });
    }

    const basePrice = product.variants?.[0]?.pricingMatrix?.basePrice
      ? Number(product.variants[0].pricingMatrix.basePrice)
      : 0;

    const displayImages = (product.mediaAssets && product.mediaAssets.length > 0)
      ? product.mediaAssets.map((asset: any) => asset.url)
      : ((product as any).images || []);

    let finalPrice = basePrice;
    if (product.discount?.active) {
      if (product.discount.discountType === "PERCENTAGE") {
        finalPrice = basePrice - basePrice * (product.discount.value / 100);
      } else {
        finalPrice = Math.max(0, basePrice - product.discount.value);
      }
      finalPrice = Math.round(finalPrice);
    }

    return NextResponse.json({
      success: true,
      data: {
        id: product.id,
        name: product.name,
        slug: product.slug,
        description: product.description,
        price: basePrice,
        finalPrice,
        images: displayImages,
        isFeatured: product.isFeatured,
        isCustomize: product.isCustomize,
        brand: product.brand,
        category: product.categoryRel,
        subcategory: product.subcategory,
        sizeChart: product.sizeChart,
        discount: product.discount
          ? { type: product.discount.discountType, value: product.discount.value }
          : null,
        variants: product.variants.map((v) => ({
          id: v.id,
          size: v.size,
          color: v.color,
          colorCode: v.colorCode,
          sku: v.sku,
          stock: v.stocks?.[0]?.availableQuantity ?? 0,
        })),
      },
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
