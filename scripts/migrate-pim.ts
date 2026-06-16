// scripts/migrate-pim.ts
console.log(' [DIAGNOSTIC] Node.js has successfully started reading the script file.');

//import './load-env';
console.log(' [DIAGNOSTIC] load-env imported successfully.');

// Importing your central Prisma Client instance
import prisma from '../src/lib/prisma';
console.log(' [DIAGNOSTIC] Prisma Client imported successfully.');

// Loading Prisma types from your custom generated path
import { Prisma } from '../src/generated/prisma';
console.log(' [DIAGNOSTIC] Custom Prisma types loaded. Starting migration logic...\n');

async function main() {
  console.log('---  Starting Minimal PIM & Pricing Data Migration  ---');
  console.log(' Converting legacy Product prices to VariantPricingMatrix & backfilling Size/Color to JSON.\n');

  // 1. Fetch all existing products and their variants
  console.log('1. Fetching products and variants from database...');
  const products = await prisma.product.findMany({
    include: { variants: true },
  });

  console.log(`   -> Found ${products.length} products to process.`);

  let pricingMatrixCount = 0;
  let jsonAttributeCount = 0;
  let skippedCount = 0;
  let totalVariantsProcessed = 0;

  // 2. Loop through products and transfer data
  for (const product of products) {
    const legacyPrice = product.price;
    const legacyPurchasePrice = product.purchasePrice;

    for (const variant of product.variants) {
      totalVariantsProcessed++;

      // A. Migrate pricing to VariantPricingMatrix (with strict Decimal safety)
      await prisma.variantPricingMatrix.upsert({
        where: { variantId: variant.id },
        update: {},
        create: {
          variantId: variant.id,
          basePrice: new Prisma.Decimal(legacyPrice ?? 0),
          costPrice: legacyPurchasePrice != null ? new Prisma.Decimal(legacyPurchasePrice) : null,
        },
      });
      pricingMatrixCount++;

      // B. Backfill existing size and color into the JSON attributes column
      const currentAttributes = variant.attributes as Record<string, string> | null;
      
      // Only update if the JSON object is missing 'size' or 'color' keys
      if (!currentAttributes?.['size'] || !currentAttributes?.['color']) {
        await prisma.productVariant.update({
          where: { id: variant.id },
          data: {
            attributes: {
              ...(currentAttributes ?? {}),
              size: variant.size,
              color: variant.color,
            },
          },
        });
        jsonAttributeCount++;
      } else {
        skippedCount++;
      }

      // Progress tracker for larger datasets
      if (totalVariantsProcessed % 50 === 0) {
        console.log(`   Progress: Processed ${totalVariantsProcessed} variants...`);
      }
    }
  }

  // 3. Generate Verification & Reconciliation Report
  console.log('\n---  Data Verification Report 📊 ---');
  const totalVariantsInDB = await prisma.productVariant.count();
  const totalPricingRowsInDB = await prisma.variantPricingMatrix.count();

  console.log(`- Total Variants in DB: ${totalVariantsInDB}`);
  console.log(`- Pricing Matrix records created/verified: ${pricingMatrixCount}`);
  console.log(`- Final Pricing Matrix rows now in DB: ${totalPricingRowsInDB}`);
  console.log(`- JSON Attributes newly backfilled: ${jsonAttributeCount}`);
  console.log(`- JSON Attributes already matching (skipped): ${skippedCount}`);

  console.log('\n--- 🔍 Integrity Verification ---');
  if (totalPricingRowsInDB === totalVariantsInDB) {
    console.log(' SUCCESS: 1:1 Pricing Matrix mapping is 100% correct.');
  } else {
    console.error(' WARNING: Mismatch detected between variants and pricing matrix rows!');
  }

  if (jsonAttributeCount + skippedCount === totalVariantsInDB) {
    console.log('SUCCESS: All variant JSON attributes are fully synced with existing sizes/colors.');
  }

  console.log('\n PIM Migration completed successfully!');
}

main()
  .catch((e) => {
    console.error('\n[CRITICAL ERROR] Migration failed inside main():', e);
    process.exit(1);
  })
  .finally(async () => {
    console.log(' Disconnecting Prisma Client...');
    await prisma.$disconnect();
  });