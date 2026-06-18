import "./load-env";
import { PrismaClient } from "../src/generated/prisma";
const prisma = new PrismaClient({
  datasources: { db: { url: process.env.DATABASE_URL } },
});
import { Prisma } from "../src/generated/prisma";

// ─── Usage ────────────────────────────────────────────────────────────────────
//   npx tsx scripts/backfill-pim-products.ts            # execute
//   npx tsx scripts/backfill-pim-products.ts --dry-run  # preview only
// ─────────────────────────────────────────────────────────────────────────────

const DRY_RUN = process.argv.includes("--dry-run");

// Legacy columns removed from Prisma schema but still present in the DB.
// Must be accessed via $queryRaw — Prisma client will not include them in
// normal queries after prisma generate.
type LegacyProduct = {
  id: string;
  name: string;
  price: number | null;
  purchasePrice: number | null;
  images: string[] | null;
};

type VariantIdRow = {
  id: string;
};

async function main() {
  console.log("=== PIM PRODUCT BACKFILL ===");
  console.log(`Mode     : ${DRY_RUN ? "DRY RUN (no writes)" : "EXECUTE"}`);
  console.log(`Goal     : Migrate Product.price → VariantPricingMatrix`);
  console.log(`           Migrate Product.images → MediaAsset rows\n`);

  // ─── Fetch legacy data ──────────────────────────────────────────────────────
  const legacyProducts = await prisma.$queryRaw<LegacyProduct[]>`
    SELECT
      id,
      name,
      price,
      "purchasePrice",
      images
    FROM "Product"
    WHERE "deletedAt" IS NULL
    ORDER BY "createdAt" ASC
  `;

  console.log(`Products to process : ${legacyProducts.length}\n`);

  let mediaCreated = 0;
  let mediaSkipped = 0;
  let pricingCreated = 0;
  let pricingSkipped = 0;
  let errorCount = 0;

  for (let i = 0; i < legacyProducts.length; i++) {
    const product = legacyProducts[i];

    try {
      // ── MediaAsset backfill ─────────────────────────────────────────────────
      const images: string[] = Array.isArray(product.images) ? product.images : [];

      for (let idx = 0; idx < images.length; idx++) {
        const url = images[idx];
        if (!url || typeof url !== "string" || url.trim() === "") continue;

        const existing = await prisma.mediaAsset.findFirst({
          where: { productId: product.id, url: url.trim() },
        });

        if (existing) {
          mediaSkipped++;
          continue;
        }

        if (!DRY_RUN) {
          await prisma.mediaAsset.create({
            data: {
              productId: product.id,
              url: url.trim(),
              sortOrder: idx,
              boundAttributes: {},
            },
          });
        }
        mediaCreated++;
      }

      // ── VariantPricingMatrix backfill ───────────────────────────────────────
      // Fetch this product's variants from current schema via raw query so we
      // are not affected by the soft-delete middleware on Product.
      const variants = await prisma.$queryRaw<VariantIdRow[]>`
        SELECT id FROM "ProductVariant"
        WHERE "productId" = ${product.id}
      `;

      for (const variant of variants) {
        const existing = await prisma.variantPricingMatrix.findUnique({
          where: { variantId: variant.id },
        });

        if (existing) {
          pricingSkipped++;
          continue;
        }

        const basePrice = new Prisma.Decimal(product.price ?? 0);
        const costPrice =
          product.purchasePrice != null && product.purchasePrice !== undefined
            ? new Prisma.Decimal(product.purchasePrice)
            : null;

        if (!DRY_RUN) {
          await prisma.variantPricingMatrix.create({
            data: {
              variantId: variant.id,
              basePrice,
              costPrice,
              tierPrices: {},
            },
          });
        }
        pricingCreated++;
      }
    } catch (err: any) {
      console.error(
        `[ERROR] Product ${product.id} ("${product.name}"): ${err.message}`
      );
      errorCount++;
    }

    // Progress log every 25 products
    if ((i + 1) % 25 === 0) {
      console.log(`  ...processed ${i + 1} / ${legacyProducts.length} products`);
    }
  }

  console.log("\n─── Backfill Summary ───────────────────────────────────────");
  console.log(`MediaAsset rows       : +${mediaCreated} created, ${mediaSkipped} already existed`);
  console.log(`VariantPricingMatrix  : +${pricingCreated} created, ${pricingSkipped} already existed`);
  if (errorCount > 0) {
    console.error(`Errors                : ${errorCount} products failed — check logs above`);
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
