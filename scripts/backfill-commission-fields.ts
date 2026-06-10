import './load-env';
import prisma from '../src/lib/prisma';
import { updateDailyCommission, getCommissionSlabs, calculateSlabCommission } from '../src/lib/commission';

async function main() {
  console.log('--- Starting Commission Fields Backfill ---');

  const records = await prisma.dailyStaffCommission.findMany({
    select: { id: true, staffId: true, date: true, totalSales: true, potentialCommission: true, earnedCommission: true },
    orderBy: { date: 'asc' },
  });

  console.log(`Found ${records.length} DailyStaffCommission records to process.`);

  let updated = 0;
  let skipped = 0;

  for (const rec of records) {
    if (rec.potentialCommission > 0 || rec.earnedCommission > 0) {
      skipped++;
      continue;
    }

    await updateDailyCommission(rec.staffId, rec.date);
    updated++;

    if (updated % 50 === 0) {
      console.log(`  Progress: ${updated} records updated...`);
    }
  }

  console.log(`\nBackfill Completed:`);
  console.log(`- ${updated} records updated with calculated commission fields`);
  console.log(`- ${skipped} records skipped (already populated)`);
}

main()
  .catch((e) => {
    console.error('Error running commission fields backfill script:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
