import "./load-env";
import prisma from "../src/lib/prisma";

async function main() {
  console.log("=== HEALING DATABASE CONSTRAINTS (OPTIMIZED) ===");

  // 1. Fetch existing SKUs
  const existingVariants = await prisma.productVariant.findMany({
    where: { sku: { not: null } },
    select: { sku: true }
  });
  const existingSkus = new Set(existingVariants.map(v => v.sku));

  // 2. Fetch variants needing SKUs
  const nullSkuVariants = await prisma.productVariant.findMany({
    where: { sku: null },
    include: { product: true }
  });

  console.log(`Found ${nullSkuVariants.length} variants with null SKUs.`);
  let skuHealed = 0;

  for (const variant of nullSkuVariants) {
    const slug = variant.product.slug || "prod";
    const color = (variant.color || "default").replace(/\s+/g, "-").toLowerCase();
    const size = (variant.size || "default").replace(/\s+/g, "-").toLowerCase();
    const proposedSku = `SKU-${slug}-${color}-${size}`.substring(0, 40).toUpperCase();

    let finalSku = proposedSku;
    let counter = 1;
    while (existingSkus.has(finalSku)) {
      finalSku = `${proposedSku}-${counter}`.substring(0, 50).toUpperCase();
      counter++;
    }

    existingSkus.add(finalSku);

    try {
      console.log(`[Updating] Variant ID ${variant.id} -> SKU ${finalSku}`);
      await prisma.productVariant.update({
        where: { id: variant.id },
        data: { sku: finalSku }
      });
      skuHealed++;
    } catch (err: any) {
      console.error(`Failed to update variant ID ${variant.id} with SKU ${finalSku}:`, err.message || err);
      throw err;
    }
  }
  console.log(`✅ Successfully generated unique SKUs for ${skuHealed} variants.`);

  // 3. Handle OrderItems with null variantId
  const nullVariantOrderItems = await prisma.orderItem.findMany({
    where: { variantId: null }
  });

  console.log(`Found ${nullVariantOrderItems.length} order items with null variantId.`);

  if (nullVariantOrderItems.length > 0) {
    let fallbackProduct = await prisma.product.findUnique({
      where: { slug: "historic-deleted-product" }
    });

    if (!fallbackProduct) {
      console.log("Creating fallback product for historic deleted variants...");
      fallbackProduct = await prisma.product.create({
        data: {
          id: "historic-deleted-product",
          name: "Historic Deleted Product",
          slug: "historic-deleted-product",
          description: "Placeholder product for historic order items.",
          category: "System",
          isPublished: false
        }
      });
    }

    let fallbackVariant = await prisma.productVariant.findUnique({
      where: { sku: "HISTORIC-FALLBACK" }
    });

    if (!fallbackVariant) {
      console.log("Creating fallback variant...");
      fallbackVariant = await prisma.productVariant.create({
        data: {
          id: "historic-deleted-variant",
          productId: fallbackProduct.id,
          size: "N/A",
          color: "N/A",
          sku: "HISTORIC-FALLBACK",
          pricingMatrix: {
            create: {
              costPrice: 0,
              basePrice: 0
            }
          }
        }
      });

      const defaultWarehouse = await prisma.warehouse.findUnique({
        where: { code: "WH-MAIN" }
      });

      if (defaultWarehouse) {
        await prisma.stock.create({
          data: {
            variantId: fallbackVariant.id,
            warehouseId: defaultWarehouse.id,
            physicalQuantity: 0,
            availableQuantity: 0,
            reservedQuantity: 0,
            version: 0
          }
        });
      }

      await prisma.variantPricingMatrix.create({
        data: {
          variantId: fallbackVariant.id,
          basePrice: 0,
          tierPrices: {}
        }
      });
    }

    const updateResult = await prisma.orderItem.updateMany({
      where: { variantId: null },
      data: { variantId: fallbackVariant.id }
    });

    console.log(`✅ Successfully linked ${updateResult.count} historic order items.`);
  }

  console.log("🎉 HEALING COMPLETED SUCCESSFULLY.");
}

main().finally(() => prisma.$disconnect());
