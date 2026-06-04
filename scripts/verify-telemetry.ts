import "./load-env";
import prisma from "../src/lib/prisma";
import { Prisma } from "../src/generated/prisma";

async function main() {
  console.log("=== Starting PIM & Inventory Telemetry Consistency Check ===");

  // 1. Check Warehouse
  const defaultWarehouse = await prisma.warehouse.findUnique({
    where: { code: "WH-MAIN" },
  });
  if (!defaultWarehouse) {
    console.error("❌ ERROR: Default warehouse WH-MAIN not found!");
    process.exit(1);
  }
  console.log(`✅ Default warehouse WH-MAIN resolved successfully: ID = ${defaultWarehouse.id}`);

  // 2. Fetch all product variants
  const variants = await prisma.productVariant.findMany({
    include: {
      product: true,
      stocks: {
        where: { warehouseId: defaultWarehouse.id },
      },
      pricingMatrix: true,
    },
  });

  console.log(`Analyzing ${variants.length} product variants...`);
  let fixedStocks = 0;
  let fixedPricing = 0;
  let stockDiscrepancies = 0;

  for (const variant of variants) {
    // A. Check and heal missing stock record
    if (variant.stocks.length === 0) {
      console.log(`🔧 Self-Healing: Creating missing WH-MAIN Stock record for Variant ID = ${variant.id} (${variant.size}, legacy stock = ${variant.stock})`);
      await prisma.stock.create({
        data: {
          variantId: variant.id,
          warehouseId: defaultWarehouse.id,
          physicalQuantity: variant.stock,
          availableQuantity: variant.stock,
          reservedQuantity: 0,
          version: 0,
        },
      });
      fixedStocks++;
    } else {
      const stockRecord = variant.stocks[0];
      if (variant.stock !== stockRecord.availableQuantity) {
        console.error(
          `❌ Stock Discrepancy: Variant ID = ${variant.id} (${variant.size}) has productVariant.stock = ${variant.stock} but Stock.availableQuantity = ${stockRecord.availableQuantity}`
        );
        stockDiscrepancies++;
      }
    }

    // B. Check and heal missing pricing matrix record
    if (!variant.pricingMatrix) {
      console.log(`🔧 Self-Healing: Creating missing Pricing Matrix for Variant ID = ${variant.id} (${variant.size}, product price = ${variant.product.price})`);
      await prisma.variantPricingMatrix.create({
        data: {
          variantId: variant.id,
          basePrice: new Prisma.Decimal(variant.product.price),
          tierPrices: {},
        },
      });
      fixedPricing++;
    }
  }

  // 3. Re-fetch all data to verify final convergence
  const finalVariants = await prisma.productVariant.findMany({
    include: {
      product: true,
      stocks: {
        where: { warehouseId: defaultWarehouse.id },
      },
      pricingMatrix: true,
    },
  });

  let finalStockDiscrepancies = 0;
  let finalMissingStocks = 0;
  let finalMissingPricing = 0;
  let finalPriceDiscrepancies = 0;

  for (const variant of finalVariants) {
    const stockRecord = variant.stocks[0];
    if (!stockRecord) {
      finalMissingStocks++;
      continue;
    }
    if (variant.stock !== stockRecord.availableQuantity) {
      finalStockDiscrepancies++;
    }
    if (!variant.pricingMatrix) {
      finalMissingPricing++;
    } else {
      const productPrice = variant.product.price;
      const matrixPrice = Number(variant.pricingMatrix.basePrice);
      if (Math.abs(productPrice - matrixPrice) > 0.01) {
        finalPriceDiscrepancies++;
      }
    }
  }

  // 4. Validate Media Assets count
  const mediaCount = await prisma.mediaAsset.count();
  console.log(`✅ Total Media Assets in DB: ${mediaCount}`);

  console.log("=== Summary ===");
  console.log(`Self-Healed Missing Stock Records: ${fixedStocks}`);
  console.log(`Self-Healed Missing Pricing Matrices: ${fixedPricing}`);
  console.log(`Final Missing Stock Records: ${finalMissingStocks}`);
  console.log(`Final Stock Discrepancies: ${finalStockDiscrepancies}`);
  console.log(`Final Missing Pricing Matrices: ${finalMissingPricing}`);
  console.log(`Final Price Discrepancies: ${finalPriceDiscrepancies}`);

  if (
    finalStockDiscrepancies === 0 &&
    finalMissingStocks === 0 &&
    finalMissingPricing === 0 &&
    finalPriceDiscrepancies === 0
  ) {
    console.log("🎉 SUCCESS: Telemetry has converged perfectly! No discrepancies remain.");
  } else {
    console.error("❌ FAILURE: Discrepancies or missing records still remain.");
    process.exit(1);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
