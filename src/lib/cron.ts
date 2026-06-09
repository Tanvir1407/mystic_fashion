import prisma from "@/lib/prisma";
import { updateDailyCommission } from "@/lib/commission";

export async function processDailyCommissions(): Promise<{ processed: number }> {
  const staffWithOrders = await prisma.order.findMany({
    where: {
      status: "DELIVERED",
      deliveredAt: { not: null },
      deletedAt: null,
    },
    select: { createdById: true, deliveredAt: true },
    distinct: ["createdById", "deliveredAt"],
  });

  let processed = 0;

  for (const order of staffWithOrders) {
    if (!order.createdById || !order.deliveredAt) continue;

    const dayStart = new Date(order.deliveredAt);
    dayStart.setHours(0, 0, 0, 0);

    const existing = await prisma.dailyStaffCommission.findUnique({
      where: {
        staffId_date: {
          staffId: order.createdById,
          date: dayStart,
        },
      },
    });

    if (existing) continue;

    await updateDailyCommission(order.createdById, dayStart);
    processed++;
  }

  return { processed };
}
