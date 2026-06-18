"use server";

import prisma from "@/lib/prisma";

// Helper to calculate product final price after active discount on server
const getFinalPrice = (product: any): number => {
  let finalPrice = product.price;
  if (product.discount && product.discount.active) {
    if (product.discount.discountType === "PERCENTAGE") {
      finalPrice = product.price - (product.price * (product.discount.value / 100));
    } else {
      finalPrice = Math.max(0, product.price - product.discount.value);
    }
  }
  return Math.round(finalPrice);
};

export async function getFilteredProductsList(params: {
  category?: string;
  subcategory?: string;
  brand?: string;
  minPrice?: string;
  maxPrice?: string;
  sort?: string;
}) {
  const categoryVal = params.category || "";
  const subcategoryVal = params.subcategory || "";
  const brandVal = params.brand || "";
  const minPriceVal = params.minPrice || "";
  const maxPriceVal = params.maxPrice || "";
  const sortVal = params.sort || "newest";

  const whereClause: any = { isPublished: true };

  // Category filter
  if (categoryVal) {
    const isUuid = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(categoryVal);
    if (isUuid) {
      whereClause.categoryId = categoryVal;
    } else {
      whereClause.categoryRel = {
        name: { equals: categoryVal, mode: "insensitive" }
      };
    }
  }

  // Subcategory filter
  if (subcategoryVal) {
    const isUuid = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(subcategoryVal);
    if (isUuid) {
      whereClause.subcategoryId = subcategoryVal;
    } else {
      whereClause.subcategory = {
        name: { equals: subcategoryVal, mode: "insensitive" }
      };
    }
  }

  // Brand filter
  if (brandVal) {
    const brandsList = brandVal.split(",");
    const isUuid = (str: string) => /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(str);
    
    if (brandsList.every(isUuid)) {
      whereClause.brandId = { in: brandsList };
    } else {
      whereClause.brand = {
        name: { in: brandsList, mode: "insensitive" }
      };
    }
  }

  const productsRes = await prisma.product.findMany({
    where: whereClause,
    include: {
      brand: true,
      categoryRel: true,
      subcategory: true,
      discount: true,
      mediaAssets: { orderBy: { sortOrder: "asc" } },
      variants: {
        include: {
          pricingMatrix: true,
          stocks: {
            where: { warehouse: { code: "WH-MAIN" } }
          }
        }
      }
    },
    orderBy: { createdAt: "desc" },
  }).catch((e) => {
    console.error("Failed to fetch products:", e);
    return [];
  });

  const rawProducts = (productsRes || []).map((p) => {
    const basePrice = p.variants?.[0]?.pricingMatrix?.basePrice
      ? Number(p.variants[0].pricingMatrix.basePrice)
      : 0;

    const displayImages = (p.mediaAssets && p.mediaAssets.length > 0)
      ? p.mediaAssets.map((asset: any) => asset.url)
      : [];

    const mappedVariants = p.variants.map((v) => {
      const vPrice = v.pricingMatrix?.basePrice ? Number(v.pricingMatrix.basePrice) : basePrice;
      const vStock = v.stocks?.[0]?.availableQuantity ?? 0;
      return {
        id: v.id,
        size: v.size,
        color: v.color,
        colorCode: v.colorCode,
        sku: v.sku,
        stock: vStock,
        price: vPrice,
        order: v.order
      };
    });

    mappedVariants.sort((a, b) => (a.order || 0) - (b.order || 0));

    return {
      id: p.id,
      slug: p.slug,
      name: p.name,
      description: p.description,
      price: basePrice,
      purchasePrice: p.variants?.[0]?.pricingMatrix?.costPrice
        ? Number(p.variants[0].pricingMatrix.costPrice)
        : 0,
      images: displayImages,
      team: p.team,
      category: p.category,
      brandId: p.brandId,
      categoryId: p.categoryId,
      subcategoryId: p.subcategoryId,
      createdAt: p.createdAt,
      isFeatured: p.isFeatured,
      featuredOrder: p.featuredOrder,
      isPublished: p.isPublished,
      trackStock: p.trackStock,
      brand: p.brand,
      categoryRel: p.categoryRel,
      subcategory: p.subcategory,
      discount: p.discount,
      variants: mappedVariants
    };
  });

  // In-memory price range filtering
  const minPrice = Number(minPriceVal) || 0;
  const maxPrice = Number(maxPriceVal) || Infinity;

  const priceFilteredProducts = rawProducts.filter((product) => {
    const finalPrice = getFinalPrice(product);
    return finalPrice >= minPrice && finalPrice <= maxPrice;
  });

  // Global price bounds
  const allFinalPrices = priceFilteredProducts.map(getFinalPrice);
  const globalMinPrice = allFinalPrices.length > 0 ? Math.min(...allFinalPrices) : 0;
  const globalMaxPrice = allFinalPrices.length > 0 ? Math.max(...allFinalPrices) : 10000;

  // Sorting logic
  const sortedProducts = [...priceFilteredProducts];
  if (categoryVal && sortVal === "newest") {
    const featuredProducts = sortedProducts.filter((p) => p.isFeatured);
    const regularProducts = sortedProducts.filter((p) => !p.isFeatured);

    featuredProducts.sort((a, b) => {
      const orderA = a.featuredOrder ?? 0;
      const orderB = b.featuredOrder ?? 0;
      if (orderA !== orderB) {
        return orderA - orderB;
      }
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    regularProducts.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    sortedProducts.splice(0, sortedProducts.length, ...featuredProducts, ...regularProducts);
  } else {
    if (sortVal === "price-asc") {
      sortedProducts.sort((a, b) => getFinalPrice(a) - getFinalPrice(b));
    } else if (sortVal === "price-desc") {
      sortedProducts.sort((a, b) => getFinalPrice(b) - getFinalPrice(a));
    } else {
      sortedProducts.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }
  }

  return {
    products: sortedProducts,
    globalMinPrice,
    globalMaxPrice,
  };
}

export async function fetchProductsAction(params: {
  category?: string;
  subcategory?: string;
  brand?: string;
  minPrice?: string;
  maxPrice?: string;
  sort?: string;
  page: number;
  limit?: number;
}) {
  const { page, limit = 12 } = params;
  
  const result = await getFilteredProductsList({
    category: params.category,
    subcategory: params.subcategory,
    brand: params.brand,
    minPrice: params.minPrice,
    maxPrice: params.maxPrice,
    sort: params.sort,
  });

  const totalCount = result.products.length;
  const totalPages = Math.ceil(totalCount / limit);
  const paginatedProducts = result.products.slice((page - 1) * limit, page * limit);

  return {
    products: paginatedProducts,
    totalCount,
    totalPages,
    currentPage: page,
  };
}
