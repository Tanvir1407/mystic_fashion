import "./load-env";
import { PrismaClient } from "../src/generated/prisma";
const prisma = new PrismaClient({
  datasources: { db: { url: process.env.DATABASE_URL } },
});

// ─── Usage ────────────────────────────────────────────────────────────────────
//   npx tsx scripts/backfill-inventory.ts            # execute
//   npx tsx scripts/backfill-inventory.ts --dry-run  # preview only
// ─────────────────────────────────────────────────────────────────────────────

const DRY_RUN = process.argv.includes("--dry-run");
const WAREHOUSE_CODE = "WH-MAIN";

// Legacy `stock` column removed from Prisma schema but still in the DB.
type LegacyVariant = {
  id: string;
  sku: string;
  productId: string;
  size: string;
  color: string;
  stock: number | null;
};

async function main() {
  console.log("=== INVENTORY BACKFILL ===");
  console.log(`Mode     : ${DRY_RUN ? "DRY RUN (no writes)" : "EXECUTE"}`);
  console.log(`Goal     : Migrate ProductVariant.stock → Stock + StockLedgerEntry\n`);

  // ─── Step 1: Ensure default warehouse ──────────────────────────────────────
  let warehouse = await prisma.warehouse.findUnique({
    where: { code: WAREHOUSE_CODE },
  });

  if (!warehouse) {
    console.log(`Warehouse "${WAREHOUSE_CODE}" not found — creating...`);
    if (!DRY_RUN) {
      warehouse = await prisma.warehouse.create({
        data: {
          code: WAREHOUSE_CODE,
          name: "Main Warehouse",
          address: "Central Fulfillment Center, Dhaka, Bangladesh",
          isActive: true,
        },
      });
      console.log(`Warehouse created: id = ${warehouse.id}`);
    } else {
      // Mock for dry-run downstream logic
      warehouse = {
        id: "dry-run-wh-id",
        code: WAREHOUSE_CODE,
        name: "Main Warehouse",
        address: "Central Fulfillment Center, Dhaka, Bangladesh",
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      console.log(`[DRY RUN] Would create warehouse "${WAREHOUSE_CODE}"`);
    }
  } else {
    console.log(`Warehouse found: "${warehouse.name}" (id: ${warehouse.id})`);
  }

  const warehouseId = warehouse.id;

  // ─── Step 2: Fetch variants with legacy stock column ───────────────────────
  const variants = await prisma.$queryRaw<LegacyVariant[]>`
    SELECT id, sku, "productId", size, color, stock
    FROM "ProductVariant"
    ORDER BY "productId" ASC
  `;

  console.log(`\nVariants to process : ${variants.length}\n`);

  let stockCreated = 0;
  let stockSkipped = 0;
  let errorCount = 0;

  for (const variant of variants) {
    try {
      // Idempotency check
      const existing = await prisma.stock.findUnique({
        where: {
          variantId_warehouseId: {
            variantId: variant.id,
            warehouseId,
          },
        },
      });

      if (existing) {
        stockSkipped++;
        continue;
      }

      const qty = typeof variant.stock === "number" && variant.stock > 0
        ? variant.stock
        : 0;

      if (!DRY_RUN) {
        await prisma.$transaction(async (tx) => {
          const stock = await tx.stock.create({
            data: {
              variantId: variant.id,
              warehouseId,
              physicalQuantity: qty,
              availableQuantity: qty,
              reservedQuantity: 0,
              version: 0,
            },
          });

          // Only create a ledger entry if there was actual opening stock to record
          if (qty > 0) {
            await tx.stockLedgerEntry.create({
              data: {
                stockId: stock.id,
                movementType: "RECEIPT",
                quantity: qty,
                previousPhysicalQuantity: 0,
                previousAvailableQuantity: 0,
                newPhysicalQuantity: qty,
                newAvailableQuantity: qty,
                referenceId: "INITIAL_MIGRATION",
                referenceType: "MIGRATION",
              },
            });
          }
        });
      }

      stockCreated++;

      if (stockCreated % 50 === 0) {
        console.log(`  ...created ${stockCreated} stock records so far`);
      }
    } catch (err: any) {
      console.error(
        `[ERROR] Variant ${variant.id} (SKU: ${variant.sku}): ${err.message}`
      );
      errorCount++;
    }
  }

  console.log("\n─── Backfill Summary ───────────────────────────────────────");
  console.log(`Stock records     : +${stockCreated} created, ${stockSkipped} already existed`);
  if (errorCount > 0) {
    console.error(`Errors            : ${errorCount} variants failed — check logs above`);
  }
  console.log(
    DRY_RUN
      ? "\n[DRY RUN] No data was written to the database."
      : "\n✅ Completed successfully."
  );
}

main()
  .catch((e) => {
    console.error("\n[FATAL]", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
