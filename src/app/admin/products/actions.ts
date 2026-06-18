"use server";

import prisma from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import { withAuditLog } from "@/lib/audit";
import { revalidatePath } from "next/cache";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { slugify } from "@/utils/slugify";

function formatPrismaError(error: any): string {
  if (!(error instanceof Error)) {
    return "An unexpected error occurred.";
  }

  // Handle Prisma Client Validation Error (e.g. invalid arguments/types)
  if (error.name === "PrismaClientValidationError") {
    const lines = error.message.split("\n");
    const details = lines
      .map((line) => line.trim())
      .filter((line) =>
        line.startsWith("Argument") ||
        line.startsWith("Unknown arg") ||
        line.includes("is missing") ||
        line.includes("must be") ||
        line.includes("Expected ") ||
        line.includes("Required field")
      );

    if (details.length > 0) {
      const cleanDetails = details.map((d) => d.replace(/`/g, "'")).join(". ");
      return `Database validation error: ${cleanDetails}`;
    }

    return "Database validation error: One or more fields have invalid values or types. Please check your inputs.";
  }

  // Handle Prisma Client Known Request Error (e.g. constraints)
  if (error.name === "PrismaClientKnownRequestError") {
    const code = (error as any).code;
    const meta = (error as any).meta;
    if (code === "P2002") {
      const target = Array.isArray(meta?.target) ? meta.target.join(", ") : String(meta?.target || "unique field");
      return `Database constraint error: A record already exists with this ${target.replace(/`/g, "'")}. Please use a unique value.`;
    }
    if (code === "P2025") {
      return "Database error: The requested record could not be found.";
    }
    return `Database error (${code}): ${error.message.replace(/`/g, "'")}`;
  }

  return error.message.replace(/`/g, "'");
}

// ─── PRODUCT CRUD ─────────────────────────────────────────────────────────────

async function _createProduct(data: {
  name: string;
  slug?: string | null;
  description: string;
  price: number;
  images: (string | { url: string; boundAttributes?: any })[];
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
  variants: { size: string; color: string; colorCode?: string; sku?: string; stock: number; price?: number; attributes?: any }[];
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

    // Proactive SKU uniqueness validation check
    const incomingSkus = data.variants.map(v => v.sku).filter(Boolean) as string[];
    if (incomingSkus.length > 0) {
      const duplicateSkuVariant = await prisma.productVariant.findFirst({
        where: { sku: { in: incomingSkus } },
        include: { product: true }
      });

      if (duplicateSkuVariant) {
        return {
          success: false,
          error: `SKU "${duplicateSkuVariant.sku}" is already in use by product "${duplicateSkuVariant.product.name}". Please ensure all SKUs are unique.`
        };
      }
    }

    const product = await prisma.$transaction(async (tx) => {
      const warehouseCode = "MAIN";
      let warehouse = await tx.warehouse.findUnique({ where: { code: warehouseCode } });
      if (!warehouse) {
        warehouse = await tx.warehouse.create({
          data: {
            code: warehouseCode,
            name: "Main Warehouse Hub",
            address: "Central fulfillment Center",
            isActive: true,
          },
        });
      }

      const prod = await tx.product.create({
        data: {
          name: data.name,
          slug: finalSlug,
          description: data.description,

          team: data.team || null,
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
              order: idx,
              attributes: v.attributes || {},
            })),
          },
        },
        include: { variants: true },
      }) as any;

      for (let idx = 0; idx < data.images.length; idx++) {
        const img = data.images[idx];
        const imageUrl = typeof img === "string" ? img : img.url;
        const boundAttrs = typeof img === "string" ? {} : (img.boundAttributes || {});
        await tx.mediaAsset.create({
          data: {
            productId: prod.id,
            url: imageUrl,
            sortOrder: idx,
            boundAttributes: boundAttrs,
          },
        });
      }

      for (const variant of prod.variants) {
        const inputVariant = data.variants.find(
          v => v.size === variant.size && v.color === variant.color
        );
        const stockQty = inputVariant?.stock ?? 0;
        const variantPrice = inputVariant?.price !== undefined && inputVariant.price > 0
          ? inputVariant.price
          : data.price;

        await tx.variantPricingMatrix.create({
          data: {
            variantId: variant.id,
            basePrice: new Prisma.Decimal(variantPrice),
            costPrice: null,
            tierPrices: {},
          },
        });

        const stock = await tx.stock.create({
          data: {
            variantId: variant.id,
            warehouseId: warehouse.id,
            physicalQuantity: stockQty,
            availableQuantity: stockQty,
            reservedQuantity: 0,
            version: 0,
          },
        });

        if (stockQty > 0) {
          await tx.stockLedgerEntry.create({
            data: {
              stockId: stock.id,
              movementType: "RECEIPT",
              quantity: stockQty,
              previousPhysicalQuantity: 0,
              previousAvailableQuantity: 0,
              newPhysicalQuantity: stockQty,
              newAvailableQuantity: stockQty,
              referenceId: prod.id,
              referenceType: "PRODUCT_CREATE",
            },
          });
        }
      }

      return prod;
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
      error: formatPrismaError(error),
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
    images: (string | { url: string; boundAttributes?: any })[];
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
    variants: { size: string; color: string; colorCode?: string; sku?: string; stock: number; price?: number; attributes?: any }[];
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

    // Proactive SKU uniqueness validation check (excluding current product being updated)
    const incomingSkus = data.variants.map(v => v.sku).filter(Boolean) as string[];
    if (incomingSkus.length > 0) {
      const duplicateSkuVariant = await prisma.productVariant.findFirst({
        where: {
          sku: { in: incomingSkus },
          productId: { not: id }
        },
        include: { product: true }
      });

      if (duplicateSkuVariant) {
        return {
          success: false,
          error: `SKU "${duplicateSkuVariant.sku}" is already in use by product "${duplicateSkuVariant.product.name}". Please ensure all SKUs are unique.`
        };
      }
    }

    const product = await prisma.$transaction(async (tx) => {
      const warehouseCode = "MAIN";
      let warehouse = await tx.warehouse.findUnique({ where: { code: warehouseCode } });
      if (!warehouse) {
        warehouse = await tx.warehouse.create({
          data: {
            code: warehouseCode,
            name: "Main Warehouse Hub",
            address: "Central fulfillment Center",
            isActive: true,
          },
        });
      }

      const prod = await tx.product.update({
        where: { id },
        data: {
          name: data.name,
          slug: finalSlug,
          description: data.description,

          team: data.team || null,
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

      await tx.mediaAsset.deleteMany({ where: { productId: id } });
      for (let idx = 0; idx < data.images.length; idx++) {
        const img = data.images[idx];
        const imageUrl = typeof img === "string" ? img : img.url;
        const boundAttrs = typeof img === "string" ? {} : (img.boundAttributes || {});
        await tx.mediaAsset.create({
          data: {
            productId: id,
            url: imageUrl,
            sortOrder: idx,
            boundAttributes: boundAttrs,
          },
        });
      }

      const upserted = [];
      for (let idx = 0; idx < data.variants.length; idx++) {
        const v = data.variants[idx];
        const variant = await tx.productVariant.upsert({
          where: { productId_size_color: { productId: id, size: v.size, color: v.color } },
          update: { sku: v.sku, order: idx, colorCode: v.colorCode, attributes: v.attributes || {} },
          create: {
            productId: id,
            size: v.size,
            color: v.color,
            colorCode: v.colorCode,
            sku: v.sku,
            order: idx,
            attributes: v.attributes || {},
          },
        });
        upserted.push(variant);

        const variantPrice = v.price !== undefined && v.price > 0
          ? v.price
          : data.price;

        await tx.variantPricingMatrix.upsert({
          where: { variantId: variant.id },
          update: { basePrice: new Prisma.Decimal(variantPrice) },
          create: {
            variantId: variant.id,
            basePrice: new Prisma.Decimal(variantPrice),
            tierPrices: {},
          },
        });

        const existingStock = await tx.stock.findUnique({
          where: {
            variantId_warehouseId: {
              variantId: variant.id,
              warehouseId: warehouse.id,
            },
          },
        });

        if (existingStock) {
          const diff = v.stock - existingStock.physicalQuantity;
          if (diff !== 0) {
            await tx.stock.update({
              where: { id: existingStock.id },
              data: {
                physicalQuantity: v.stock,
                availableQuantity: v.stock,
                version: { increment: 1 },
              },
            });

            await tx.stockLedgerEntry.create({
              data: {
                stockId: existingStock.id,
                movementType: "ADJUSTMENT",
                quantity: diff,
                previousPhysicalQuantity: existingStock.physicalQuantity,
                previousAvailableQuantity: existingStock.availableQuantity,
                newPhysicalQuantity: v.stock,
                newAvailableQuantity: v.stock,
                referenceId: prod.id,
                referenceType: "PRODUCT_UPDATE",
              },
            });
          }
        } else {
          const stock = await tx.stock.create({
            data: {
              variantId: variant.id,
              warehouseId: warehouse.id,
              physicalQuantity: v.stock,
              availableQuantity: v.stock,
              reservedQuantity: 0,
              version: 0,
            },
          });

          if (v.stock > 0) {
            await tx.stockLedgerEntry.create({
              data: {
                stockId: stock.id,
                movementType: "RECEIPT",
                quantity: v.stock,
                previousPhysicalQuantity: 0,
                previousAvailableQuantity: 0,
                newPhysicalQuantity: v.stock,
                newAvailableQuantity: v.stock,
                referenceId: prod.id,
                referenceType: "PRODUCT_UPDATE",
              },
            });
          }
        }
      }

      const keptVariantIds = upserted.map((v) => v.id);
      await tx.productVariant.deleteMany({
        where: { productId: id, id: { notIn: keptVariantIds } },
      });

      return prod;
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
      error: formatPrismaError(error),
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
  } catch (e) { }

  const filePath = join(publicUploadsDir, uniqueName);
  await writeFile(filePath, buffer);

  return `/uploads/${uniqueName}`;
}

// ─── PRODUCT QUERIES ──────────────────────────────────────────────────────────

export async function getProductsForOrder() {
  const products = await prisma.product.findMany({
    include: {
      mediaAssets: { orderBy: { sortOrder: "asc" } },
      discount: true,
      variants: {
        include: {
          pricingMatrix: true,
          stocks: {
            where: { warehouse: { code: "MAIN" } }
          }
        }
      }
    },
    orderBy: { name: "asc" },
  });

  return products.map(p => {
    const basePrice = p.variants?.[0]?.pricingMatrix?.basePrice
      ? Number(p.variants[0].pricingMatrix.basePrice)
      : 0;

    const displayImages = (p.mediaAssets && p.mediaAssets.length > 0)
      ? p.mediaAssets.map((asset: any) => asset.url)
      : ((p as any).images || []);

    return {
      ...p,
      price: basePrice,
      images: displayImages,
      variants: p.variants.map(v => ({
        ...v,
        stock: v.stocks?.[0]?.availableQuantity ?? 0
      }))
    };
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
