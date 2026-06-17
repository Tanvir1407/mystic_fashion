import "./load-env";
import prisma from "../src/lib/prisma";
import { Prisma } from "../src/generated/prisma";

const DRY_RUN = process.argv.includes("--dry-run");

async function main() {
  console.log(`=== STARTING PRODUCTION DATA BACKFILL ===`);
  console.log(`Mode: ${DRY_RUN ? "DRY RUN (No changes will be saved)" : "EXECUTE"}\n`);

  try {
    await prisma.$transaction(async (tx) => {
      // ------------------------------------------------------------------------
      // Step A: Fulfillment Origin (Warehouse)
      // ------------------------------------------------------------------------
      console.log("Step A: Creating default warehouse 'WH-MAIN'...");
      const warehouseCode = "WH-MAIN";
      let warehouse = await tx.warehouse.findUnique({ where: { code: warehouseCode } });

      if (!warehouse) {
        if (!DRY_RUN) {
          warehouse = await tx.warehouse.create({
            data: {
              code: warehouseCode,
              name: "Main Warehouse Hub",
              address: "Central fulfillment Center",
              isActive: true,
            },
          });
          console.log(`- Created default warehouse: ${warehouse.name} (${warehouse.code})`);
        } else {
          console.log(`- [DRY RUN] Would create default warehouse 'WH-MAIN'`);
          // Mock warehouse object for dry-run logic downstream
          warehouse = {
            id: "dry-run-warehouse-id",
            code: warehouseCode,
            name: "Main Warehouse Hub",
            address: "Central fulfillment Center",
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date(),
          };
        }
      } else {
        console.log(`- Default warehouse '${warehouseCode}' already exists.`);
      }

      const warehouseId = warehouse.id;

      // Fetch all products with their variants
      const products = await tx.product.findMany({
        include: { variants: true },
      });
      console.log(`\nFetched ${products.length} products to migrate variants, stock, and pricing.`);

      // ------------------------------------------------------------------------
      // Step B, C & D: Inventory, Financial Matrix, and Media Extraction
      // ------------------------------------------------------------------------
      let stockCreatedCount = 0;
      let pricingCreatedCount = 0;
      let mediaCreatedCount = 0;

      for (const product of products) {
        // Step D: Extract images to MediaAsset
        const legacyImages = (product as any).images || [];
        for (let idx = 0; idx < legacyImages.length; idx++) {
          const imageUrl = legacyImages[idx];
          // Check if media asset already exists
          const existingMedia = await tx.mediaAsset.findFirst({
            where: { productId: product.id, url: imageUrl },
          });

          if (!existingMedia) {
            if (!DRY_RUN) {
              await tx.mediaAsset.create({
                data: {
                  productId: product.id,
                  url: imageUrl,
                  sortOrder: idx,
                  boundAttributes: {},
                },
              });
            }
            mediaCreatedCount++;
          }
        }

        // Loop variants for Stock and Pricing Matrix
        for (const variant of product.variants) {
          // Step B: Stock record mapping
          const existingStock = await tx.stock.findUnique({
            where: {
              variantId_warehouseId: {
                variantId: variant.id,
                warehouseId: warehouseId,
              },
            },
          });

          if (!existingStock) {
            const legacyStockQty = (variant as any).stock || 0;
            if (!DRY_RUN) {
              const stock = await tx.stock.create({
                data: {
                  variantId: variant.id,
                  warehouseId: warehouseId,
                  physicalQuantity: legacyStockQty,
                  availableQuantity: legacyStockQty,
                  reservedQuantity: 0,
                  version: 0,
                },
              });

              // Create corresponding initial StockLedgerEntry
              await tx.stockLedgerEntry.create({
                data: {
                  stockId: stock.id,
                  movementType: "RECEIPT",
                  quantity: legacyStockQty,
                  previousPhysicalQuantity: 0,
                  previousAvailableQuantity: 0,
                  newPhysicalQuantity: legacyStockQty,
                  newAvailableQuantity: legacyStockQty,
                  referenceId: "INITIAL_MIGRATION",
                  referenceType: "MIGRATION",
                },
              });
            }
            stockCreatedCount++;
          }

          // Step C: Pricing Matrix mapping
          const existingPricing = await tx.variantPricingMatrix.findUnique({
            where: { variantId: variant.id },
          });

          if (!existingPricing) {
            const basePriceVal = new Prisma.Decimal((product as any).price || 0);
            const costPriceVal = (product as any).purchasePrice !== null && (product as any).purchasePrice !== undefined
              ? new Prisma.Decimal((product as any).purchasePrice)
              : null;

            if (!DRY_RUN) {
              await tx.variantPricingMatrix.create({
                data: {
                  variantId: variant.id,
                  basePrice: basePriceVal,
                  costPrice: costPriceVal,
                  tierPrices: {},
                },
              });
            }
            pricingCreatedCount++;
          }
        }
      }

      console.log(`\nInventory & PIM Summary:`);
      console.log(`- Stock records to create/created: ${stockCreatedCount}`);
      console.log(`- Pricing matrices to create/created: ${pricingCreatedCount}`);
      console.log(`- Media asset records to create/created: ${mediaCreatedCount}`);

      // ------------------------------------------------------------------------
      // Step E: Historical Order Matching
      // ------------------------------------------------------------------------
      console.log("\nStep E: Matching legacy OrderItem records to variants...");
      const orderItems = await tx.orderItem.findMany({
        where: { variantId: null },
      });
      console.log(`Found ${orderItems.length} OrderItems needing variant linking.`);

      let linkedOrderItemsCount = 0;
      let missingVariantsCount = 0;

      for (const item of orderItems) {
        // Fetch variants for this product and size
        const variants = await tx.productVariant.findMany({
          where: { productId: item.productId, size: (item as any).size },
        });

        if (variants.length > 0) {
          // Look for one with Default color first, otherwise fallback to the first one
          const matchedVariant = variants.find(v => v.color.toLowerCase() === "default") || variants[0];
          
          if (!DRY_RUN) {
            await tx.orderItem.update({
              where: { id: item.id },
              data: { variantId: matchedVariant.id },
            });
          }
          linkedOrderItemsCount++;
        } else {
          console.warn(`[WARNING] No variant found for Product ID ${item.productId} and Size ${(item as any).size} (OrderItem ID: ${item.id})`);
          missingVariantsCount++;
        }
      }

      console.log(`OrderItem Matching Summary:`);
      console.log(`- OrderItems successfully linked: ${linkedOrderItemsCount}`);
      console.log(`- OrderItems with missing variants: ${missingVariantsCount}`);

      if (DRY_RUN) {
        console.log("\n[DRY RUN] Transaction rolled back safely.");
        throw new Error("DRY_RUN_ROLLBACK"); // Force transaction rollback in dry-run mode
      }
    });

    console.log(`\n=== MIGRATION COMPLETED SUCCESSFULLY ===`);
  } catch (error: any) {
    if (error.message === "DRY_RUN_ROLLBACK") {
      console.log(`\n=== DRY RUN COMPLETED SUCCESSFULLY (NO DATA WAS COMMITTED) ===`);
    } else {
      console.error(`\n=== MIGRATION FAILED ===`);
      console.error(error);
      process.exit(1);
    }
  }
}

main();
