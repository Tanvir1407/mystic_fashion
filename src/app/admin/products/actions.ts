"use server";

import prisma from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import { withAuditLog } from "@/lib/audit";
import { revalidatePath } from "next/cache";
import { mkdir } from "fs/promises";
import { join } from "path";
import sharp from "sharp";
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
      .filter(
        (line) =>
          line.startsWith("Argument") ||
          line.startsWith("Unknown arg") ||
          line.includes("is missing") ||
          line.includes("must be") ||
          line.includes("Expected ") ||
          line.includes("Required field"),
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
      const target = Array.isArray(meta?.target)
        ? meta.target.join(", ")
        : String(meta?.target || "unique field");
      return `Database constraint error: A record already exists with this ${target.replace(/`/g, "'")}. Please use a unique value.`;
    }
    if (code === "P2025") {
      return "Database error: The requested record could not be found.";
    }
    return `Database error (${code}): ${error.message.replace(/`/g, "'")}`;
  }

  return error.message.replace(/`/g, "'");
}

// ── SHARED HELPERS ──────────────────────────────────────────────────────────

function validateSlug(name: string, slug?: string | null): string | null {
  const raw = slug?.trim() || slugify(name);
  const final = slugify(raw);
  return final || null;
}

async function checkSlugExists(
  slug: string,
  excludeId?: string,
): Promise<string | null> {
  const existing = excludeId
    ? await prisma.product.findFirst({
        where: { slug, id: { not: excludeId } },
      })
    : await prisma.product.findUnique({ where: { slug } });
  return existing
    ? "Product slug already exists. Please choose a unique slug."
    : null;
}

async function checkDuplicateSkus(
  variants: { sku?: string }[],
  excludeProductId?: string,
): Promise<string | null> {
  const skus = variants.map((v) => v.sku).filter(Boolean) as string[];
  if (!skus.length) return null;
  const dup = await prisma.productVariant.findFirst({
    where: {
      sku: { in: skus },
      ...(excludeProductId ? { productId: { not: excludeProductId } } : {}),
    },
    include: { product: true },
  });
  return dup
    ? `SKU "${dup.sku}" is already in use by product "${dup.product.name}". Please ensure all SKUs are unique.`
    : null;
}

async function getOrCreateMainWarehouse(tx: any) {
  try {
    const code = "MAIN";
    let w = await tx.warehouse.findUnique({ where: { code } });
    if (!w) {
      w = await tx.warehouse.create({
        data: {
          code,
          name: "Main Warehouse Hub",
          address: "Central fulfillment Center",
          isActive: true,
        },
      });
    }
    return w;
  } catch (error) {
    console.error("Failed to get or create MAIN warehouse:", error);
    throw new Error("Warehouse setup failed. Please ensure database is properly initialized.");
  }
}

function handleProductError(
  error: any,
  context: string,
): { success: false; error: string } {
  if (
    error?.message === "NEXT_REDIRECT" ||
    error?.digest?.startsWith("NEXT_REDIRECT")
  ) {
    throw error;
  }
  console.error(`Error in ${context}:`, error);
  return { success: false, error: formatPrismaError(error) };
}

// ─── PRODUCT CRUD ─────────────────────────────────────────────────────────────

async function _createProduct(data: {
  name: string;
  slug?: string | null;
  description: string;
  price: number;
  images: (string | { url: string; boundAttributes?: any })[];
  team?: string;
  brandId?: string | null;
  categoryId?: string | null;
  subcategoryId?: string | null;
  sizeChartId?: string | null;
  discountId?: string | null;
  isFeatured: boolean;
  featuredOrder?: number;
  isPublished: boolean;
  isCustomize: boolean;
  trackStock: boolean;
  isCombo?: boolean;
  comboRequiredQty?: number;
  comboChildIds?: string[];
  comboDefaultChildIds?: string[];
  variants: {
    size: string;
    color: string;
    colorCode?: string;
    sku?: string;
    stock: number;
    price?: number;
    attributes?: any;
  }[];
}) {
  try {
    if (data.images.length > 20) {
      return {
        success: false,
        error: "A product can have a maximum of 20 images.",
      };
    }

    const finalSlug = validateSlug(data.name, data.slug);
    if (!finalSlug)
      return { success: false, error: "A valid unique slug is required." };

    const slugErr = await checkSlugExists(finalSlug);
    if (slugErr) return { success: false, error: slugErr };

    const skuErr = await checkDuplicateSkus(data.variants);
    if (skuErr) return { success: false, error: skuErr };

    const product = await prisma.$transaction(async (tx) => {
      const warehouse = await getOrCreateMainWarehouse(tx);

      const prod = (await tx.product.create({
        data: {
          name: data.name,
          slug: finalSlug,
          description: data.description,

          team: data.team || null,
          brandId: data.brandId || null,
          categoryId: data.categoryId || null,
          subcategoryId: data.subcategoryId || null,
          isFeatured: data.isFeatured,
          featuredOrder: data.featuredOrder ?? 0,
          isPublished: data.isPublished,
          //
          isCustomize: data.isCustomize ?? false,
          trackStock: data.trackStock ?? false,

          sizeChartId: data.sizeChartId || null,
          discountId: data.discountId || null,
          isCombo: data.isCombo ?? false,
          comboRequiredQty: data.comboRequiredQty ?? 0,
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
          mediaAssets: {
            create: data.images.map((img, idx) => ({
              url: typeof img === "string" ? img : img.url,
              sortOrder: idx,
              boundAttributes: typeof img === "string" ? {} : img.boundAttributes || {},
            })),
          },
        },
        include: { variants: true, mediaAssets: true },
      })) as any;

      for (const variant of prod.variants) {
        const inputVariant = data.variants.find(
          (v) => v.size === variant.size && v.color === variant.color,
        );
        const stockQty = inputVariant?.stock ?? 0;
        const variantPrice =
          inputVariant?.price !== undefined && inputVariant.price > 0
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

      if (data.isCombo && data.comboChildIds && data.comboChildIds.length > 0) {
        await tx.comboConfiguration.createMany({
          data: data.comboChildIds.map((childId) => ({
            parentProductId: prod.id,
            childProductId: childId,
            maxQuantity: 1,
            isDefault: (data.comboDefaultChildIds ?? []).includes(childId),
          })),
        });
      }

      return prod;
    });

    revalidatePath("/admin/products");
    revalidatePath("/");
    revalidatePath("/product/[slug]", "page");
    return { success: true, data: product };
  } catch (error: any) {
    return handleProductError(error, "createProduct");
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
    brandId?: string | null;
    categoryId?: string | null;
    subcategoryId?: string | null;
    sizeChartId?: string | null;
    discountId?: string | null;
    isFeatured: boolean;
    featuredOrder?: number;
    isPublished: boolean;

    ///
    isCustomize: boolean;
    trackStock: boolean;
    //
    isCombo?: boolean;
    comboRequiredQty?: number;
    comboChildIds?: string[];
    comboDefaultChildIds?: string[];
    variants: {
      size: string;
      color: string;
      colorCode?: string;
      sku?: string;
      stock: number;
      price?: number;
      attributes?: any;
    }[];
  },
) {
  try {
    if (data.images.length > 20) {
      return {
        success: false,
        error: "A product can have a maximum of 20 images.",
      };
    }

    const finalSlug = validateSlug(data.name, data.slug);
    if (!finalSlug)
      return { success: false, error: "A valid unique slug is required." };

    const slugErr = await checkSlugExists(finalSlug, id);
    if (slugErr) return { success: false, error: slugErr };

    const skuErr = await checkDuplicateSkus(data.variants, id);
    if (skuErr) return { success: false, error: skuErr };

    const product = await prisma.$transaction(async (tx) => {
      const warehouse = await getOrCreateMainWarehouse(tx);

      const prod = await tx.product.update({
        where: { id },
        data: {
          name: data.name,
          slug: finalSlug,
          description: data.description,
          team: data.team || null,
          brandId: data.brandId || null,
          categoryId: data.categoryId || null,
          subcategoryId: data.subcategoryId || null,
          isFeatured: data.isFeatured,
          featuredOrder: data.featuredOrder ?? 0,
          isPublished: data.isPublished,
          isCustomize: data.isCustomize ?? false,
          trackStock: data.trackStock ?? false,
          sizeChartId: data.sizeChartId || null,
          discountId: data.discountId || null,
          isCombo: data.isCombo ?? false,
          comboRequiredQty: data.comboRequiredQty ?? 0,
          mediaAssets: {
            deleteMany: {},
            create: data.images.map((img, idx) => ({
              url: typeof img === "string" ? img : img.url,
              sortOrder: idx,
              boundAttributes: typeof img === "string" ? {} : img.boundAttributes || {},
            })),
          },
        },
        include: { mediaAssets: true },
      });

      // ── Batch pre-fetch existing variants and stock ──────────────────────────
      const existingVariants = await tx.productVariant.findMany({
        where: { productId: id },
        select: { id: true, size: true, color: true },
      });
      const existingVariantIds = existingVariants.map((v) => v.id);
      const existingStocks =
        existingVariantIds.length > 0
          ? await tx.stock.findMany({
              where: {
                variantId: { in: existingVariantIds },
                warehouseId: warehouse.id,
              },
            })
          : [];
      const stockMap = new Map<string, (typeof existingStocks)[number]>();
      for (const s of existingStocks) {
        stockMap.set(s.variantId, s);
      }

      const upserted = [];
      for (let idx = 0; idx < data.variants.length; idx++) {
        const v = data.variants[idx];
        const variant = await tx.productVariant.upsert({
          where: {
            productId_size_color: {
              productId: id,
              size: v.size,
              color: v.color,
            },
          },
          update: {
            sku: v.sku,
            order: idx,
            colorCode: v.colorCode,
            attributes: v.attributes || {},
          },
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

        const variantPrice =
          v.price !== undefined && v.price > 0 ? v.price : data.price;

        await tx.variantPricingMatrix.upsert({
          where: { variantId: variant.id },
          update: { basePrice: new Prisma.Decimal(variantPrice) },
          create: {
            variantId: variant.id,
            basePrice: new Prisma.Decimal(variantPrice),
            tierPrices: {},
          },
        });

        const existingStock = stockMap.get(variant.id);

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

      if (data.isCombo) {
        await tx.comboConfiguration.deleteMany({
          where: { parentProductId: id },
        });
        if (data.comboChildIds && data.comboChildIds.length > 0) {
          await tx.comboConfiguration.createMany({
            data: data.comboChildIds.map((childId) => ({
              parentProductId: id,
              childProductId: childId,
              maxQuantity: 1,
              isDefault: (data.comboDefaultChildIds ?? []).includes(childId),
            })),
          });
        }
      } else {
        await tx.comboConfiguration.deleteMany({
          where: { parentProductId: id },
        });
      }

      return prod;
    });

    revalidatePath("/admin/products");
    revalidatePath(`/admin/products/${id}`);
    revalidatePath("/");
    revalidatePath(`/product/${finalSlug}`);
    revalidatePath("/product/[slug]", "page");
    return { success: true, data: product };
  } catch (error: any) {
    return handleProductError(error, "updateProduct");
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
      error:
        error instanceof Error
          ? error.message
          : "An unexpected error occurred.",
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
    return {
      success: false,
      error: error.message || "Failed to restore product.",
    };
  }
}

export const restoreProduct = withAuditLog(_restoreProduct, {
  entityType: "Product",
  action: "UPDATE",
  getEntityId: (args) => args[0],
  describe: (args) => `Restored product ${args[0]}`,
});

// ─── IMAGE UPLOAD ─────────────────────────────────────────────────────────────

// maxWidth: 1920 for hero/banners, 800 for product/category thumbnails
export async function uploadImage(formData: FormData, maxWidth = 800) {
  const file = formData.get("file") as File;
  if (!file) throw new Error("No file received");

  const MAX_SIZE = 2 * 1024 * 1024; // 2MB raw — WebP conversion reduces significantly
  if (file.size > MAX_SIZE) {
    throw new Error(
      `Image "${file.name}" is too large (${(file.size / 1024 / 1024).toFixed(1)}MB). Maximum allowed size is 2MB.`,
    );
  }

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  // Extract title from formData, fallback to sanitized filename
  const rawTitle = (formData.get("title") as string)?.trim();
  const titleSlug = rawTitle ? slugify(rawTitle) : null;
  const fallback = slugify(file.name.replace(/\.[^.]+$/, ""));
  const slug = titleSlug || fallback || "product";

  const uniqueName = `${slug}-${Date.now()}.webp`;

  const publicUploadsDir = join(process.cwd(), "public", "uploads");
  try {
    await mkdir(publicUploadsDir, { recursive: true });
  } catch (e) {}

  const filePath = join(publicUploadsDir, uniqueName);
  await sharp(buffer)
    .resize({ width: maxWidth, withoutEnlargement: true })
    .webp({ quality: 80 })
    .toFile(filePath);

  return `/uploads/${uniqueName}`;
}

// ─── PRODUCT QUERIES ──────────────────────────────────────────────────────────

export async function getProductsForOrder() {
  const products = await prisma.product.findMany({
    include: {
      mediaAssets: { orderBy: { sortOrder: "asc" } },
      discount: true,
      categoryRel: { select: { name: true } },
      variants: {
        include: {
          pricingMatrix: true,
          stocks: {
            where: { warehouse: { code: "MAIN" } },
          },
        },
      },
      comboChildOptions: {
        include: {
          childProduct: {
            select: {
              id: true,
              name: true,
              variants: {
                select: { id: true, size: true, color: true },
              },
            },
          },
        },
      },
    },
    orderBy: { name: "asc" },
  });

  return products.map((p) => {
    const basePrice = p.variants?.[0]?.pricingMatrix?.basePrice
      ? Number(p.variants[0].pricingMatrix.basePrice)
      : 0;

    const displayImages = p.mediaAssets?.map((asset: any) => asset.url) || [];

    return {
      ...p,
      price: basePrice,
      category: p.categoryRel?.name || "",
      images: displayImages,
      variants: p.variants.map((v) => ({
        ...v,
        stock: v.stocks?.[0]?.availableQuantity ?? 0,
      })),
      isCombo: p.isCombo,
      comboRequiredQty: p.comboRequiredQty,
      comboChildOptions:
        p.comboChildOptions?.map((o: any) => ({
          id: o.childProduct.id,
          name: o.childProduct.name,
          variantId: o.childProduct.variants?.[0]?.id || "",
        })) || [],
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
      error:
        error instanceof Error
          ? error.message
          : "An unexpected error occurred.",
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
      error:
        error instanceof Error
          ? error.message
          : "An unexpected error occurred.",
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
