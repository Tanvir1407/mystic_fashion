import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

function calcFinalPrice(product: any): number {
  let price = product.price;
  if (product.discount?.active) {
    if (product.discount.discountType === "PERCENTAGE") {
      price = price - price * (product.discount.value / 100);
    } else {
      price = Math.max(0, price - product.discount.value);
    }
  }
  return Math.round(price);
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const q = searchParams.get("q")?.trim() || "";
    const page = Math.max(1, Number(searchParams.get("page") || 1));
    const limit = Math.min(50, Math.max(1, Number(searchParams.get("limit") || 12)));
    const skip = (page - 1) * limit;

    if (!q) {
      return NextResponse.json({ success: true, data: [], pagination: { total: 0, page, limit, totalPages: 0 } });
    }

    const where: any = {
      isPublished: true,
      deletedAt: null,
      OR: [
        { name: { contains: q, mode: "insensitive" } },
        { description: { contains: q, mode: "insensitive" } },
        { slug: { contains: q, mode: "insensitive" } },
        { categoryRel: { name: { contains: q, mode: "insensitive" } } },
        { brand: { name: { contains: q, mode: "insensitive" } } },
      ],
    };

    const [total, products] = await Promise.all([
      prisma.product.count({ where }),
      prisma.product.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ isFeatured: "desc" }, { createdAt: "desc" }],
        include: {
          discount: true,
          brand: { select: { id: true, name: true } },
          categoryRel: { select: { id: true, name: true } },
          mediaAssets: { orderBy: { sortOrder: "asc" } },
          variants: {
            orderBy: { order: "asc" },
            include: {
              pricingMatrix: true,
              stocks: { where: { warehouse: { code: "MAIN" } } }
            }
          },
        },
      }),
    ]);

    const data = products.map((p) => {
      const basePrice = p.variants?.[0]?.pricingMatrix?.basePrice
        ? Number(p.variants[0].pricingMatrix.basePrice)
        : 0;

      const displayImages = (p.mediaAssets && p.mediaAssets.length > 0)
        ? p.mediaAssets.map((asset: any) => asset.url)
        : [];

      return {
        id: p.id,
        name: p.name,
        slug: p.slug,
        price: basePrice,
        finalPrice: calcFinalPrice({ ...p, price: basePrice }),
        images: displayImages,
        brand: p.brand,
        category: p.categoryRel,
        discount: p.discount ? { type: p.discount.discountType, value: p.discount.value } : null,
        variants: p.variants.map((v) => ({
          id: v.id,
          size: v.size,
          color: v.color,
          stock: v.stocks?.[0]?.availableQuantity ?? 0,
        })),
      };
    });

    return NextResponse.json({
      success: true,
      data,
      pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
