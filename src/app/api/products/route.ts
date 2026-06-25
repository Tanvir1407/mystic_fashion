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
    const page = Math.max(1, Number(searchParams.get("page") || 1));
    const limit = Math.min(50, Math.max(1, Number(searchParams.get("limit") || 12)));
    const skip = (page - 1) * limit;
    const category = searchParams.get("category") || "";
    const subcategory = searchParams.get("subcategory") || "";
    const brand = searchParams.get("brand") || "";
    const minPrice = searchParams.get("minPrice") ? Number(searchParams.get("minPrice")) : null;
    const maxPrice = searchParams.get("maxPrice") ? Number(searchParams.get("maxPrice")) : null;
    const sort = searchParams.get("sort") || "newest";
    const featured = searchParams.get("featured");

    const where: any = { isPublished: true, deletedAt: null };

    if (featured === "true") where.isFeatured = true;

    if (category) {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(category);
      if (isUuid) {
        where.categoryId = category;
      } else {
        where.categoryRel = { name: { equals: category, mode: "insensitive" } };
      }
    }

    if (subcategory) {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(subcategory);
      if (isUuid) {
        where.subcategoryId = subcategory;
      } else {
        where.subcategory = { name: { equals: subcategory, mode: "insensitive" } };
      }
    }

    if (brand) {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(brand);
      if (isUuid) {
        where.brandId = brand;
      } else {
        where.brand = { name: { equals: brand, mode: "insensitive" } };
      }
    }

    if (minPrice !== null || maxPrice !== null) {
      where.price = {};
      if (minPrice !== null) where.price.gte = minPrice;
      if (maxPrice !== null) where.price.lte = maxPrice;
    }

    const orderBy: any =
      sort === "price_asc" ? { price: "asc" } :
      sort === "price_desc" ? { price: "desc" } :
      sort === "oldest" ? { createdAt: "asc" } :
      sort === "featured" ? [{ isFeatured: "desc" }, { createdAt: "desc" }] :
      [{ isFeatured: "desc" }, { createdAt: "desc" }]; // newest (default)

    const [total, products] = await Promise.all([
      prisma.product.count({ where }),
      prisma.product.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          discount: true,
          brand: { select: { id: true, name: true } },
          categoryRel: { select: { id: true, name: true } },
          subcategory: { select: { id: true, name: true } },
          variants: { orderBy: { order: "asc" } },
          mediaAssets: { orderBy: { sortOrder: "asc" } },
        },
      }),
    ]);

    const data = products.map((p) => ({
      id: p.id,
      name: p.name,
      slug: p.slug,
      price: p.price,
      finalPrice: calcFinalPrice(p),
      images: p.mediaAssets.map((ma) => ma.url),
      isFeatured: p.isFeatured,
      isCustomize: p.isCustomize,
      trackStock: p.trackStock,
      brand: p.brand,
      category: p.categoryRel,
      subcategory: p.subcategory,
      discount: p.discount
        ? { type: p.discount.discountType, value: p.discount.value }
        : null,
      variants: p.variants.map((v) => ({
        id: v.id,
        size: v.size,
        color: v.color,
        colorCode: v.colorCode,
        stock: v.stock,
      })),
    }));

    return NextResponse.json({
      success: true,
      data,
      pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
