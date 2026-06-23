import prisma from "@/lib/prisma";

export async function getEffectiveCommissionRate(staffId: string): Promise<number> {
  const [staff, globalSetting] = await Promise.all([
    prisma.staff.findUnique({ where: { id: staffId }, select: { commissionRate: true } }),
    prisma.commissionSetting.findUnique({ where: { id: "default" }, select: { commissionRate: true } }),
  ]);

  if (staff?.commissionRate != null) return staff.commissionRate;
  return globalSetting?.commissionRate ?? 10;
}

interface OrderForCommission {
  totalAmount: number;
  deliveryCharge: number;
  discountAmount: number;
  status: string;
  commissionRate?: number | null;
  salesReturns: { returnCost: number; productLoss: number; printingLoss: number; deliveryLoss: number }[];
}

// Uses order.commissionRate if stored (locked at creation), falls back to provided rate
function calcBase(order: OrderForCommission, fallbackRate: number): number {
  if (order.status === "CANCELLED") return 0;
  const netOrderValue = order.totalAmount - order.deliveryCharge - order.discountAmount;
  const returnDeduction = (order.salesReturns ?? []).reduce(
    (sum, r) => sum + r.returnCost + r.productLoss,
    0
  );
  const commissionBase = Math.max(0, netOrderValue - returnDeduction);
  // CRITICAL: always prefer order.commissionRate (locked at creation time)
  const rateToUse = order.commissionRate ?? fallbackRate;
  return parseFloat(((commissionBase * rateToUse) / 100).toFixed(2));
}

// For earned calculation — only DELIVERED counts
export function calcOrderCommission(order: OrderForCommission, rate: number): number {
  if (order.status !== "DELIVERED") return 0;
  return calcBase(order, rate);
}

// For display — shows potential commission for any non-cancelled status
export function calcPotentialCommission(order: OrderForCommission, rate: number): number {
  return calcBase(order, rate);
}

export async function getStaffCommissionSummary(staffId: string, month: number, year: number) {
  // Current rate is used ONLY as fallback for orders that don't have a stored rate.
  // Orders created after the commissionRate field was added will always use their stored rate.
  const currentRate = await getEffectiveCommissionRate(staffId);

  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 1);

  const [orders, payments] = await Promise.all([
    prisma.order.findMany({
      where: {
        createdById: staffId,
        createdAt: { gte: startDate, lt: endDate },
        deletedAt: null,
      },
      include: {
        salesReturns: { select: { returnCost: true, productLoss: true, printingLoss: true, deliveryLoss: true } },
      },
    }),
    prisma.commissionPayment.findMany({
      where: { staffId, month, year },
    }),
  ]);

  // Each order uses its own locked rate. currentRate is fallback only for legacy orders.
  const earned = orders.reduce((sum, o) => sum + calcOrderCommission(o, currentRate), 0);
  const paid   = payments.reduce((sum, p) => sum + p.amount, 0);

  return {
    rate: currentRate,
    earned: parseFloat(earned.toFixed(2)),
    paid: parseFloat(paid.toFixed(2)),
    pending: parseFloat(Math.max(0, earned - paid).toFixed(2)),
    orderCount: orders.length,
    totalSales: orders.reduce((s, o) => s + (o.status !== "CANCELLED" ? o.totalAmount : 0), 0),
  };
}
