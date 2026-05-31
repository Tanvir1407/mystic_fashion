import prisma from "@/lib/prisma";

export async function getEffectiveCommissionRate(staffId: string): Promise<number> {
  const [staff, globalSetting] = await Promise.all([
    prisma.staff.findUnique({ where: { id: staffId }, select: { commissionRate: true } }),
    prisma.commissionSetting.findUnique({ where: { id: "default" } }),
  ]);

  if (staff?.commissionRate != null) return staff.commissionRate;
  return globalSetting?.commissionRate ?? 10;
}

interface OrderForCommission {
  totalAmount: number;
  deliveryCharge: number;
  discountAmount: number;
  status: string;
  salesReturns: { returnCost: number; productLoss: number; printingLoss: number; deliveryLoss: number }[];
}

function calcBase(order: OrderForCommission, rate: number): number {
  if (order.status === "CANCELLED") return 0;
  const netOrderValue = order.totalAmount - order.deliveryCharge - order.discountAmount;
  const returnDeduction = (order.salesReturns ?? []).reduce(
    (sum, r) => sum + r.returnCost + r.productLoss,
    0
  );
  const commissionBase = Math.max(0, netOrderValue - returnDeduction);
  return parseFloat(((commissionBase * rate) / 100).toFixed(2));
}

// For summary/earned calculation — only DELIVERED counts
export function calcOrderCommission(order: OrderForCommission, rate: number): number {
  if (order.status !== "DELIVERED") return 0;
  return calcBase(order, rate);
}

// For display — shows potential commission for any non-cancelled status
export function calcPotentialCommission(order: OrderForCommission, rate: number): number {
  return calcBase(order, rate);
}

export async function getStaffCommissionSummary(staffId: string, month: number, year: number) {
  const rate = await getEffectiveCommissionRate(staffId);

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

  const earned = orders.reduce((sum, o) => sum + calcOrderCommission(o, rate), 0);
  const paid = payments.reduce((sum, p) => sum + p.amount, 0);

  return {
    rate,
    earned: parseFloat(earned.toFixed(2)),
    paid: parseFloat(paid.toFixed(2)),
    pending: parseFloat(Math.max(0, earned - paid).toFixed(2)),
    orderCount: orders.length,
    totalSales: orders.reduce((s, o) => s + (o.status !== "CANCELLED" ? o.totalAmount : 0), 0),
  };
}
