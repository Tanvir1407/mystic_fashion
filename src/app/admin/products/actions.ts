"use server";

import prisma from "@/lib/prisma";
import { withAuditLog } from "@/lib/audit";
import { revalidatePath } from "next/cache";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { slugify } from "@/utils/slugify";

// ─── PRODUCT CRUD ─────────────────────────────────────────────────────────────

async function _createProduct(data: {
  name: string;
  slug?: string | null;
  description: string;
  price: number;
  images: string[];
  team?: string;
  category: string;
  brandId?: string | null;
  categoryId?: string | null;
  subcategoryId?: string | null;
  sizeChartId?: string | null;
  discountId?: string | null;
  isFeatured: boolean;
  featuredOrder?: number;
  isPublished: boolean;
  isCustomize?: boolean | null;
  trackStock: boolean;
  variants: { size: string; color: string; colorCode?: string; sku?: string; stock: number }[];
}) {
  try {
    if (data.images.length > 20) {
      return { success: false, error: "A product can have a maximum of 20 images." };
    }

    const rawSlug = data.slug ? data.slug.trim() : slugify(data.name);
    const finalSlug = slugify(rawSlug);

    if (!finalSlug) {
      return { success: false, error: "A valid unique slug is required." };
    }

    const existing = await prisma.product.findUnique({ where: { slug: finalSlug } });
    if (existing) {
      return {
        success: false,
        error: "Product slug already exists. Please choose a unique slug.",
      };
    }

    const product = await prisma.product.create({
      data: {
        name: data.name,
        slug: finalSlug,
        description: data.description,
        price: data.price,
        images: data.images,
        team: data.team,
        category: data.category,
        brandId: data.brandId || null,
        categoryId: data.categoryId || null,
        subcategoryId: data.subcategoryId || null,
        isFeatured: data.isFeatured,
        featuredOrder: data.featuredOrder ?? 0,
        isPublished: data.isPublished,
        isCustomize: data.isCustomize ?? false,
        trackStock: data.trackStock,
        sizeChartId: data.sizeChartId || null,
        discountId: data.discountId || null,
        variants: {
          create: data.variants.map((v, idx) => ({
            size: v.size,
            color: v.color,
            colorCode: v.colorCode,
            sku: v.sku,
            stock: v.stock,
            order: idx,
          })),
        },
      },
    });

    revalidatePath("/admin/products");
    revalidatePath("/");
    revalidatePath("/product/[slug]", "page");
    return { success: true, data: product };
  } catch (error: any) {
    if (
      error.message === "NEXT_REDIRECT" ||
      error.digest?.startsWith("NEXT_REDIRECT")
    ) {
      throw error;
    }
    console.error("Error in createProduct:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "An unexpected error occurred.",
    };
  }
}

export const createProduct = withAuditLog(_createProduct, {
  entityType: "Product",
  action: "CREATE",
  getEntityId: () => null,
  getEntityIdFromResult: (r: any) => r?.data?.id ?? null,
  fetchAfter: (id) => prisma.product.findUnique({ where: { id } }),
  describe: (args) => `Created product "${args[0].name}"`,
});

async function _updateProduct(
  id: string,
  data: {
    name: string;
    slug?: string | null;
    description: string;
    price: number;
    images: string[];
    team?: string;
    category: string;
    brandId?: string | null;
    categoryId?: string | null;
    subcategoryId?: string | null;
    sizeChartId?: string | null;
    discountId?: string | null;
    isFeatured: boolean;
    featuredOrder?: number;
    isPublished: boolean;
    isCustomize?: boolean | null;
    trackStock: boolean;
    variants: { size: string; color: string; colorCode?: string; sku?: string; stock: number }[];
  }
) {
  try {
    if (data.images.length > 20) {
      return { success: false, error: "A product can have a maximum of 20 images." };
    }

    const rawSlug = data.slug ? data.slug.trim() : slugify(data.name);
    const finalSlug = slugify(rawSlug);

    if (!finalSlug) {
      return { success: false, error: "A valid unique slug is required." };
    }

    const existing = await prisma.product.findFirst({
      where: { slug: finalSlug, id: { not: id } },
    });
    if (existing) {
      return {
        success: false,
        error: "Product slug already exists. Please choose a unique slug.",
      };
    }

    const product = await prisma.product.update({
      where: { id },
      data: {
        name: data.name,
        slug: finalSlug,
        description: data.description,
        price: data.price,
        images: data.images,
        team: data.team,
        category: data.category,
        brandId: data.brandId || null,
        categoryId: data.categoryId || null,
        subcategoryId: data.subcategoryId || null,
        isFeatured: data.isFeatured,
        featuredOrder: data.featuredOrder ?? 0,
        isPublished: data.isPublished,
        isCustomize: data.isCustomize ?? false,
        trackStock: data.trackStock,
        sizeChartId: data.sizeChartId || null,
        discountId: data.discountId || null,
      },
    });

    const upsertedVariants = await prisma.$transaction(
      data.variants.map((v, idx) =>
        prisma.productVariant.upsert({
          where: { productId_size_color: { productId: id, size: v.size, color: v.color } },
          update: { sku: v.sku, stock: v.stock, order: idx, colorCode: v.colorCode },
          create: {
            productId: id,
            size: v.size,
            color: v.color,
            colorCode: v.colorCode,
            sku: v.sku,
            stock: v.stock,
            order: idx,
          },
        })
      )
    );

    const keptVariantIds = upsertedVariants.map((v) => v.id);
    await prisma.productVariant.deleteMany({
      where: { productId: id, id: { notIn: keptVariantIds } },
    });

    revalidatePath("/admin/products");
    revalidatePath(`/admin/products/${id}`);
    revalidatePath("/");
    revalidatePath(`/product/${finalSlug}`);
    revalidatePath("/product/[slug]", "page");
    return { success: true, data: product };
  } catch (error: any) {
    if (
      error.message === "NEXT_REDIRECT" ||
      error.digest?.startsWith("NEXT_REDIRECT")
    ) {
      throw error;
    }
    console.error("Error in updateProduct:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "An unexpected error occurred.",
    };
  }
}

export const updateProduct = withAuditLog(_updateProduct, {
  entityType: "Product",
  action: "UPDATE",
  getEntityId: (args) => args[0],
  fetchBefore: (id) => prisma.product.findUnique({ where: { id } }),
  fetchAfter: (id) => prisma.product.findUnique({ where: { id } }),
  describe: (args) => `Updated product ${args[0]}`,
});

async function _deleteProduct(id: string) {
  try {
    const product = await prisma.product.delete({ where: { id } });
    revalidatePath("/admin/products");
    return { success: true, data: product };
  } catch (error: any) {
    console.error("Error in deleteProduct:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "An unexpected error occurred.",
    };
  }
}

export const deleteProduct = withAuditLog(_deleteProduct, {
  entityType: "Product",
  action: "DELETE",
  getEntityId: (args) => args[0],
  fetchBefore: (id) => prisma.product.findUnique({ where: { id } }),
  describe: (args) => `Deleted product ${args[0]}`,
});

async function _restoreProduct(id: string) {
  try {
    await prisma.product.update({
      where: { id, deletedAt: { not: null } as any },
      data: { deletedAt: null },
    });
    revalidatePath("/admin/products");
    revalidatePath("/");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to restore product." };
  }
}

export const restoreProduct = withAuditLog(_restoreProduct, {
  entityType: "Product",
  action: "UPDATE",
  getEntityId: (args) => args[0],
  describe: (args) => `Restored product ${args[0]}`,
});

// ─── IMAGE UPLOAD ─────────────────────────────────────────────────────────────

export async function uploadImage(formData: FormData) {
  const file = formData.get("file") as File;
  if (!file) throw new Error("No file received");

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  const uniqueName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`;

  const publicUploadsDir = join(process.cwd(), "public", "uploads");
  try {
    await mkdir(publicUploadsDir, { recursive: true });
  } catch (e) {}

  const filePath = join(publicUploadsDir, uniqueName);
  await writeFile(filePath, buffer);

  return `/uploads/${uniqueName}`;
}

// ─── PRODUCT QUERIES ──────────────────────────────────────────────────────────

export async function getProductsForOrder() {
  return await prisma.product.findMany({
    include: { variants: true, discount: true },
    orderBy: { name: "asc" },
  });
}

// ─── SIZE CHARTS ──────────────────────────────────────────────────────────────

async function _saveSizeChart(category: string, data: any) {
  try {
    const chart = await prisma.sizeChart.upsert({
      where: { category },
      update: { data },
      create: { category, data },
    });
    revalidatePath("/admin/size-charts");
    return { success: true, data: chart };
  } catch (error: any) {
    if (
      error.message === "NEXT_REDIRECT" ||
      error.digest?.startsWith("NEXT_REDIRECT")
    ) {
      throw error;
    }
    console.error("Error in saveSizeChart:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "An unexpected error occurred.",
    };
  }
}

export const saveSizeChart = withAuditLog(_saveSizeChart, {
  entityType: "SizeChart",
  action: "UPDATE",
  getEntityId: () => null,
  getEntityIdFromResult: (r: any) => r?.data?.id ?? null,
  fetchAfter: (id) => prisma.sizeChart.findUnique({ where: { id } }),
  describe: (args) => `Saved size chart for category "${args[0]}"`,
});

async function _deleteSizeChart(id: string) {
  try {
    const chart = await prisma.sizeChart.delete({ where: { id } });
    revalidatePath("/admin/size-charts");
    return { success: true, data: chart };
  } catch (error: any) {
    console.error("Error in deleteSizeChart:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "An unexpected error occurred.",
    };
  }
}

export const deleteSizeChart = withAuditLog(_deleteSizeChart, {
  entityType: "SizeChart",
  action: "DELETE",
  getEntityId: (args) => args[0],
  fetchBefore: (id) => prisma.sizeChart.findUnique({ where: { id } }),
  describe: (args) => `Deleted size chart ${args[0]}`,
});
