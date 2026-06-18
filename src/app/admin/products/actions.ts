"use server";

/**
 * ============================================================
 * SERVER ACTIONS FOR PRODUCT MANAGEMENT
 * ============================================================
 *
 * This file handles all product-related server operations:
 * - Create, Update, Delete, Restore products
 * - Variant & pricing matrix management
 * - Image uploads
 * - Size chart management
 *
 * Data Flow Overview:
 * 1. Client submits form data → Server Action receives it
 * 2. Validation (slug, images, etc.)
 * 3. Database transaction (Prisma) → writes to multiple tables
 * 4. Cache revalidation (revalidatePath) → updates frontend
 * 5. Audit log (withAuditLog) → tracks changes
 * ============================================================
 */

import prisma from "@/lib/prisma";
import { withAuditLog } from "@/lib/audit";
import { revalidatePath } from "next/cache";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { slugify } from "@/utils/slugify";
import { log } from "console";

// ─── PRODUCT CRUD ─────────────────────────────────────────────────────────────

/**
 * CREATE PRODUCT
 * ============================================================
 *
 * Flow:
 * 1. Validate input (images ≤ 6, slug generation, uniqueness)
 * 2. Create product in a single Prisma query with:
 *    - Product (main record)
 *    - Variants (nested create)
 *    - PricingMatrix (nested create inside each variant)
 * 3. Revalidate cache paths to reflect changes immediately
 * 4. Return success response with created product data
 *
 * Key Design Decision:
 * - Using nested create (variant.pricingMatrix) ensures atomicity
 * - All related records are created in one database round-trip
 * - CostPrice set to null by default (can be updated later via purchases)
 */
async function _createProduct(data: {
  name: string;
  slug?: string | null;
  description: string;
  price: number; // This will become basePrice for all variants
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
  variants: {
    size: string;
    color: string;
    colorCode?: string;
    sku?: string;
    stock: number;
    basePrice?: number;
  }[];
}) {
  try {
    // --- VALIDATION PHASE ---
    // Enforce max image limit (UI should also enforce this, but server-side validation is crucial)
    if (data.images.length > 6) {
      return {
        success: false,
        error: "A product can have a maximum of 6 images.",
      };
    }

    // Generate a URL-friendly slug from product name if not provided
    const rawSlug = data.slug ? data.slug.trim() : slugify(data.name);
    const finalSlug = slugify(rawSlug);

    // Slug must not be empty after sanitization
    if (!finalSlug) {
      return { success: false, error: "A valid unique slug is required." };
    }

    // Check for duplicate slug (unique constraint in DB, but we check early for better UX)
    const existing = await prisma.product.findUnique({
      where: { slug: finalSlug },
    });
    if (existing) {
      return {
        success: false,
        error: "Product slug already exists. Please choose a unique slug.",
      };
    }

    // --- DATABASE WRITE PHASE ---
    // Single Prisma create with nested relations:
    // Product → Variants → PricingMatrix (each variant gets its own pricing row)
    const product = await prisma.product.create({
      data: {
        name: data.name,
        slug: finalSlug,
        description: data.description,
        price: 0, // Keep legacy field for backward compatibility (fallback during migration)
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
        // Nested create: Each variant gets created with its pricing matrix
        variants: {
          create: data.variants.map((v, idx) => ({
            size: v.size,
            color: v.color,
            colorCode: v.colorCode,
            sku: v.sku,
            stock: v.stock,

            order: idx,
            // Preserve the order as provided by the client
            attributes: { size: v.size, color: v.color }, // JSON backup for future flexibility
            // ★ Pricing Matrix is created inline for each variant
            pricingMatrix: {
              create: {
                basePrice: v.basePrice ?? data.price, // Single price copied to all variants (Phase 1)
                costPrice: null, // Will be updated via purchase orders later
              },
            },
          })),
        },
      },
      // Return the created data with all relations loaded
      include: {
        variants: {
          include: {
            pricingMatrix: true, // Load pricing data for immediate use
          },
        },
      },
    });

    // --- CACHE INVALIDATION ---
    // After successful write, clear Next.js cache for affected paths
    // This ensures users see updated data immediately
    revalidatePath("/admin/products"); // Admin product list
    revalidatePath("/"); // Homepage (featured products, new arrivals, etc.)
    revalidatePath("/product/[slug]", "page"); // Dynamic product detail pages (ISR)

    return { success: true, data: product };
  } catch (error: any) {
    // Handle Next.js redirect errors (they shouldn't be caught as errors)
    if (
      error.message === "NEXT_REDIRECT" ||
      error.digest?.startsWith("NEXT_REDIRECT")
    ) {
      throw error;
    }
    console.error("Error in createProduct:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "An unexpected error occurred.",
    };
  }
}

// Export with audit logging wrapper (tracks who created what and when)
export const createProduct = withAuditLog(_createProduct, {
  entityType: "Product",
  action: "CREATE",
  getEntityId: () => null, // ID not known before creation
  getEntityIdFromResult: (r: any) => r?.data?.id ?? null, // Extract ID from result
  fetchAfter: (id) => prisma.product.findUnique({ where: { id } }),
  describe: (args) => `Created product "${args[0].name}"`,
});

/**
 * UPDATE PRODUCT
 * ============================================================
 *
 * Flow:
 * 1. Validate input (slug uniqueness, images limit)
 * 2. Start a database transaction to ensure all operations succeed or fail together
 * 3. Inside transaction:
 *    a) Update product main record
 *    b) For each variant: upsert (update if exists, create if new)
 *    c) For each variant: upsert pricing matrix (update basePrice, create if missing)
 *    d) Delete variants that were removed from the input list
 * 4. Revalidate cache paths to reflect changes
 * 5. Return updated product with all relations loaded
 *
 * Key Design Decisions:
 * - Using Promise.all for parallel variant processing (faster for many variants)
 * - Transaction ensures data consistency (no partial updates)
 * - Delete removed variants (hard delete; cascade handles pricingMatrix deletion)
 * - Revalidate multiple paths to ensure all UI updates
 */
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
    variants: {
      size: string;
      color: string;
      colorCode?: string;
      sku?: string;
      stock: number;
      basePrice?: number;
    }[];
  },
) {
  try {
    // --- VALIDATION PHASE ---
    if (data.images.length > 6) {
      return {
        success: false,
        error: "A product can have a maximum of 6 images.",
      };
    }

    const rawSlug = data.slug ? data.slug.trim() : slugify(data.name);
    const finalSlug = slugify(rawSlug);

    if (!finalSlug) {
      return { success: false, error: "A valid unique slug is required." };
    }

    // Check duplicate slug, excluding the current product
    const existing = await prisma.product.findFirst({
      where: { slug: finalSlug, id: { not: id } },
    });
    if (existing) {
      return {
        success: false,
        error: "Product slug already exists. Please choose a unique slug.",
      };
    }

    // --- DATABASE TRANSACTION ---
    // Money-related data (price) requires transactional integrity
    const updatedProduct = await prisma.$transaction(async (tx) => {
      // Step 1: Update main product record
      await tx.product.update({
        where: { id },
        data: {
          name: data.name,
          slug: finalSlug,
          description: data.description,
          price: data.price, // Keep legacy field updated
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

      // Step 2: Process all variants in parallel for performance
      // Uses Promise.all to run upsert operations concurrently
      const upsertPromises = data.variants.map(async (v, index) => {
        // Step 2a: Upsert variant (update if exists by (productId, size, color), else create)
        const variant = await tx.productVariant.upsert({
          where: {
            // Composite unique key: same product can have same size+color only once
            productId_size_color: {
              productId: id,
              size: v.size,
              color: v.color,
            },
          },
          update: {
            sku: v.sku,
            stock: v.stock,
            order: index, // Preserve order from client input
            colorCode: v.colorCode,
            attributes: { size: v.size, color: v.color }, // Keep JSON in sync
          },
          create: {
            productId: id,
            size: v.size,
            color: v.color,
            colorCode: v.colorCode,
            sku: v.sku,
            stock: v.stock,
            order: index,
            attributes: { size: v.size, color: v.color },
          },
        });

        // Step 2b: Upsert pricing matrix for this variant
        // variantId is unique, so we can update or create pricing data
        await tx.variantPricingMatrix.upsert({
          where: { variantId: variant.id },
          update: { basePrice: v.basePrice ?? data.price }, // Update price if already exists
          create: {
            variantId: variant.id,
            basePrice: v.basePrice ?? data.price,
            costPrice: null, // Cost price set null by default (to be filled via purchase orders)
          },
        });

        return variant; // Return variant for keeping track of IDs
      });

      // Wait for all variant upserts to complete
      const upsertedVariants = await Promise.all(upsertPromises);

      // Step 3: Delete variants that are no longer present in the input
      // This removes any variant that the user removed from the form
      const keptIds = upsertedVariants.map((v) => v.id);
      await tx.productVariant.deleteMany({
        where: { productId: id, id: { notIn: keptIds } },
      });
      // Note: PricingMatrix records will be automatically deleted via CASCADE
      // (as defined in the schema: onDelete: Cascade)

      // Step 4: Return the complete updated product with all relations
      // This ensures the client receives fresh data with pricing included
      return await tx.product.findUnique({
        where: { id },
        include: {
          variants: {
            include: {
              pricingMatrix: true, // Include pricing data for each variant
            },
          },
        },
      });
    });

    // --- CACHE INVALIDATION ---
    // Clear Next.js cache for multiple paths to ensure all UI components reflect changes
    revalidatePath("/admin/products"); // Admin list
    revalidatePath(`/admin/products/${id}`); // Admin edit page
    revalidatePath("/"); // Homepage
    revalidatePath(`/product/${finalSlug}`); // Specific product detail page
    revalidatePath("/product/[slug]", "page"); // All product detail pages (ISR)

    return { success: true, data: updatedProduct };
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
      error:
        error instanceof Error
          ? error.message
          : "An unexpected error occurred.",
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

/**
 * DELETE PRODUCT (Hard Delete)
 * ============================================================
 *
 * Flow:
 * 1. Hard delete product from database
 * 2. All related records (variants, pricingMatrix, etc.) are deleted via CASCADE
 * 3. Revalidate admin path to update the list
 *
 * Note: This is a hard delete. For soft delete, use restoreProduct.
 */
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

/**
 * RESTORE PRODUCT (Soft Delete Recovery)
 * ============================================================
 *
 * Flow:
 * 1. Update product setting deletedAt: null
 * 2. Only works if product was previously soft-deleted (deletedAt not null)
 * 3. Revalidate admin list and homepage
 */
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

/**
 * IMAGE UPLOAD
 * ============================================================
 *
 * Flow:
 * 1. Receive image file from FormData
 * 2. Generate unique filename (timestamp + sanitized original name)
 * 3. Save to /public/uploads/ directory
 * 4. Return the public URL for the uploaded image
 *
 * Note: In production, consider using cloud storage (S3, Cloudinary, etc.)
 */
export async function uploadImage(formData: FormData) {
  const file = formData.get("file") as File;
  if (!file) throw new Error("No file received");

  // Convert file to Buffer
  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  // Generate unique filename to prevent collisions
  const uniqueName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`;

  // Ensure uploads directory exists
  const publicUploadsDir = join(process.cwd(), "public", "uploads");
  try {
    await mkdir(publicUploadsDir, { recursive: true });
  } catch (e) {}

  // Write file to disk
  const filePath = join(publicUploadsDir, uniqueName);
  await writeFile(filePath, buffer);

  // Return the public URL (served from /public directory)
  return `/uploads/${uniqueName}`;
}

// ─── PRODUCT QUERIES ──────────────────────────────────────────────────────────

/**
 * GET PRODUCTS FOR ORDER CREATION
 * ============================================================
 *
 * Used in admin order creation form to populate product dropdowns.
 * Includes variants and discount information for price calculation.
 */
export async function getProductsForOrder() {
  return await prisma.product.findMany({
    include: { variants: true, discount: true },
    orderBy: { name: "asc" },
  });
}

// ─── SIZE CHARTS ──────────────────────────────────────────────────────────────

/**
 * SAVE SIZE CHART
 * ============================================================
 *
 * Upsert (update or create) size chart for a product category.
 * Size chart data is stored as JSON (flexible structure).
 */
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

/**
 * DELETE SIZE CHART
 */
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
