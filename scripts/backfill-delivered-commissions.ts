import "dotenv/config";
import prisma from "../src/lib/prisma";
import { updateDailyCommission } from "../src/lib/commission";

async function main() {
  // 1. For all DELIVERED orders with deliveredAt = null, set deliveredAt = updatedAt
  const unsetOrders = await prisma.order.findMany({
    where: {
      status: "DELIVERED",
      deliveredAt: null,
      deletedAt: null,
    },
    select: { id: true, updatedAt: true, createdById: true },
  });

  console.log(`Found ${unsetOrders.length} DELIVERED orders with no deliveredAt.`);

  for (const o of unsetOrders) {
    await prisma.order.update({
      where: { id: o.id },
      data: { deliveredAt: o.updatedAt },
    });
  }

  // 2. Get all distinct staffId + deliveredAt dates for DELIVERED orders
  const staffDates = await prisma.order.findMany({
    where: {
      status: "DELIVERED",
      deliveredAt: { not: null },
      createdById: { not: null },
      deletedAt: null,
    },
    select: { createdById: true, deliveredAt: true },
    distinct: ["createdById", "deliveredAt"],
  });

  console.log(`Found ${staffDates.length} distinct staff+date combinations.`);

  // 3. For each, call updateDailyCommission
  let processed = 0;
  for (const sd of staffDates) {
    if (!sd.createdById || !sd.deliveredAt) continue;
    await updateDailyCommission(sd.createdById, sd.deliveredAt);
    processed++;
  }

  console.log(`Backfilled commission for ${processed} staff+date combinations.`);
}

main()
  .catch((e) => {
    console.error("Error backfilling commissions:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
