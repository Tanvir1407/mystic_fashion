import './load-env';
import prisma from '../src/lib/prisma';

async function main() {
  console.log('--- Starting Supplier Profile Backfill ---');

  // 1. Fetch all purchases
  const purchases = await prisma.purchase.findMany({
    select: {
      id: true,
      supplierName: true,
      totalAmount: true,
      supplierId: true,
    },
  });

  console.log(`Found ${purchases.length} total purchases to process.`);

  // Group purchases by unique supplier name (case insensitive/trimmed)
  const supplierToPurchases: Record<string, typeof purchases> = {};
  for (const purchase of purchases) {
    const rawName = purchase.supplierName?.trim();
    if (!rawName) {
      console.warn(`Warning: Purchase ${purchase.id} has no supplier name. Skipping.`);
      continue;
    }
    // Normalize key
    const normalizedKey = rawName.toUpperCase();
    if (!supplierToPurchases[normalizedKey]) {
      supplierToPurchases[normalizedKey] = [];
    }
    supplierToPurchases[normalizedKey].push(purchase);
  }

  const uniqueSupplierKeys = Object.keys(supplierToPurchases);
  console.log(`Grouped purchases into ${uniqueSupplierKeys.length} unique suppliers.`);

  let createdCount = 0;
  let updatedCount = 0;
  let linkedPurchasesCount = 0;

  // Process each supplier
  for (const key of uniqueSupplierKeys) {
    const supplierPurchases = supplierToPurchases[key];
    // Find the original casing of the supplier name from the first purchase
    const originalName = supplierPurchases[0].supplierName.trim();

    // Upsert Supplier profile
    const existingSupplier = await prisma.supplier.findUnique({
      where: { name: originalName },
    });

    let supplier;
    if (existingSupplier) {
      supplier = existingSupplier;
      updatedCount++;
    } else {
      supplier = await prisma.supplier.create({
        data: {
          name: originalName,
          active: true,
        },
      });
      createdCount++;
    }

    // Update all matching purchases that don't have the supplierId set yet
    const purchasesToUpdate = supplierPurchases.filter(p => p.supplierId !== supplier.id);
    if (purchasesToUpdate.length > 0) {
      const updateResult = await prisma.purchase.updateMany({
        where: {
          id: {
            in: purchasesToUpdate.map(p => p.id),
          },
        },
        data: {
          supplierId: supplier.id,
        },
      });
      linkedPurchasesCount += updateResult.count;
    }
  }

  console.log(`\nBackfill Results:`);
  console.log(`- Created ${createdCount} new Supplier profiles`);
  console.log(`- Updated ${updatedCount} existing Supplier profiles`);
  console.log(`- Linked ${linkedPurchasesCount} purchases to their Supplier profiles`);

  // --- Verification ---
  console.log('\n--- Verifying Data Integrity ---');

  // Verify total number of purchases
  const postPurchases = await prisma.purchase.findMany({
    select: {
      id: true,
      totalAmount: true,
      supplierId: true,
      supplierName: true,
    },
  });

  const unlinkedPurchases = postPurchases.filter(p => p.supplierName && !p.supplierId);
  if (unlinkedPurchases.length > 0) {
    console.error(`ERROR: ${unlinkedPurchases.length} purchases with supplier names are still unlinked!`);
  } else {
    console.log(`SUCCESS: All purchases with supplier names successfully linked.`);
  }

  const initialTotal = purchases.reduce((sum, p) => sum + p.totalAmount, 0);
  const finalTotal = postPurchases.reduce((sum, p) => sum + p.totalAmount, 0);

  console.log(`- Total purchases count: ${purchases.length} (Before) vs ${postPurchases.length} (After)`);
  console.log(`- Total purchases amount: BDT ${initialTotal.toFixed(2)} (Before) vs BDT ${finalTotal.toFixed(2)} (After)`);

  if (purchases.length === postPurchases.length && Math.abs(initialTotal - finalTotal) < 0.01) {
    console.log('SUCCESS: Data integrity verified. Purchases and Totals are 100% matched!');
  } else {
    console.error('ERROR: Data mismatch detected! Please inspect database state.');
  }
}

main()
  .catch(e => {
    console.error('Error running supplier backfill script:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
