import prisma from "@/lib/prisma";
import { updateDailyCommission } from "@/lib/commission";

export async function processDailyCommissions(): Promise<{ processed: number }> {
  const staffWithOrders = await prisma.order.findMany({
    where: {
      status: { notIn: ["CANCELLED", "RETURNED"] },
      deletedAt: null,
    },
    select: { createdById: true, createdAt: true },
  });

  let processed = 0;
  const processedKeys = new Set<string>();

  for (const order of staffWithOrders) {
    if (!order.createdById) continue;

    const dayStart = new Date(order.createdAt);
    dayStart.setHours(0, 0, 0, 0);

    const key = `${order.createdById}-${dayStart.toISOString()}`;
    if (processedKeys.has(key)) continue;
    processedKeys.add(key);

    await updateDailyCommission(order.createdById, dayStart);
    processed++;
  }

  return { processed };
}
