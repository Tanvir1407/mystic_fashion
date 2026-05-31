import './load-env';
import prisma from '../src/lib/prisma';
import { getEffectiveCommissionRate } from '../src/lib/commission';

async function main() {
  console.log('--- Starting Commission Rate Backfill ---');

  // 1. Fetch the default global commission rate
  const globalSetting = await prisma.commissionSetting.findUnique({
    where: { id: 'default' },
  });
  const defaultRate = globalSetting?.commissionRate ?? 5;
  console.log(`Global default commission rate: ${defaultRate}%`);

  // 2. Fetch all staff members
  const staffMembers = await prisma.staff.findMany({
    select: {
      id: true,
      username: true,
      commissionRate: true,
    },
  });

  const staffRateMap = new Map<string, number>();
  for (const s of staffMembers) {
    const rate = s.commissionRate ?? defaultRate;
    staffRateMap.set(s.id, rate);
    console.log(`Staff "${s.username}" (${s.id}) rate: ${rate}%`);
  }

  // 3. Fetch all existing salesman orders in the database
  const ordersToBackfill = await prisma.order.findMany({
    where: {
      createdById: { not: null },
    },
    select: {
      id: true,
    },
  });

  console.log(`Found ${ordersToBackfill.length} existing orders to reset to 0% commission rate.`);

  let updatedCount = 0;

  // 4. Update each order to 0% commission rate for a fresh start tomorrow
  for (const order of ordersToBackfill) {
    await prisma.order.update({
      where: { id: order.id },
      data: {
        commissionRate: 0,
      },
    });

    updatedCount++;
  }

  console.log(`\nBackfill Completed:`);
  console.log(`- Successfully snapshotted commission rates on ${updatedCount} existing orders.`);
}

main()
  .catch((e) => {
    console.error('Error running commission rate backfill script:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
