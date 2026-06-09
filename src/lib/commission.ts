import prisma from "@/lib/prisma";

interface Slab {
  id: string;
  minAmount: number;
  maxAmount: number | null;
  rate: number;
  priority: number;
}

let slabsCache: Slab[] | null = null;
let slabsCacheTime = 0;
const CACHE_TTL = 60_000;

export async function getCommissionSlabs(): Promise<Slab[]> {
  const now = Date
  .now();
  if (slabsCache && now - slabsCacheTime < CACHE_TTL) {
    return slabsCache;
  }
  const slabs = await prisma.commissionSlab.findMany({
    orderBy: { priority: "asc" },
  });
  slabsCache = slabs;
  slabsCacheTime = now;
  return slabs;
}

export function calculateSlabCommission(dailyTotal: number, slabs: Slab[]): number {
  let totalCommission = 0;
  let remaining = dailyTotal;

  for (const slab of slabs) {
    if (remaining <= 0) break;
    const slabRange = slab.maxAmount != null
      ? slab.maxAmount - slab.minAmount
      : Infinity;
    const taxable = Math.min(remaining, slabRange);
    totalCommission += taxable * (slab.rate / 100);
    remaining -= taxable;
  }

  return parseFloat(totalCommission.toFixed(2));
}

export async function updateDailyCommission(staffId: string, date: Date): Promise<void> {
  const dayStart = new Date(date);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(dayStart);
  dayEnd.setDate(dayEnd.getDate() + 1);

  const orders = await prisma.order.findMany({
    where: {
      createdById: staffId,
      status: "DELIVERED",
      deliveredAt: { gte: dayStart, lt: dayEnd },
      deletedAt: null,
    },
    include: {
      salesReturns: {
        select: { returnCost: true, productLoss: true, printingLoss: true, deliveryLoss: true },
      },
    },
  });

  const dailyTotal = orders.reduce((sum, o) => {
    const net = o.totalAmount - o.deliveryCharge - o.discountAmount;
    const returnDeduction = o.salesReturns.reduce(
      (rSum, r) => rSum + r.returnCost + r.productLoss + r.printingLoss + r.deliveryLoss,
      0
    );
    return sum + Math.max(0, net - returnDeduction);
  }, 0);

  const slabs = await getCommissionSlabs();
  const commission = calculateSlabCommission(dailyTotal, slabs);

  await prisma.dailyStaffCommission.upsert({
    where: { staffId_date: { staffId, date: dayStart } },
    update: { totalSales: dailyTotal, commission },
    create: { staffId, date: dayStart, totalSales: dailyTotal, commission },
  });
}

interface DailyCommissionRow {
  date: Date;
  totalSales: number;
  commission: number;
  orderCount: number;
}

interface MonthlySummary {
  dailyRows: DailyCommissionRow[];
  totalSales: number;
  totalCommission: number;
  paid: number;
  pending: number;
  orderCount: number;
}

export async function getStaffCommissionSummary(
  staffId: string,
  month: number,
  year: number
): Promise<MonthlySummary> {
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 1);

  const [dailyRows, payments, orders] = await Promise.all([
    prisma.dailyStaffCommission.findMany({
      where: {
        staffId,
        date: { gte: startDate, lt: endDate },
      },
      orderBy: { date: "desc" },
    }),
    prisma.commissionPayment.findMany({
      where: { staffId, month, year },
    }),
    prisma.order.findMany({
      where: {
        createdById: staffId,
        status: "DELIVERED",
        deliveredAt: { gte: startDate, lt: endDate },
        deletedAt: null,
      },
      select: { deliveredAt: true },
    }),
  ]);

  const orderCountByDate = new Map<string, number>();
  for (const o of orders) {
    if (o.deliveredAt) {
      const key = new Date(o.deliveredAt).toDateString();
      orderCountByDate.set(key, (orderCountByDate.get(key) || 0) + 1);
    }
  }

  const enrichedDailyRows = dailyRows.map((r) => ({
    ...r,
    orderCount: orderCountByDate.get(new Date(r.date).toDateString()) || 0,
  }));

  const paid = payments.reduce((sum, p) => sum + p.amount, 0);
  const totalCommission = enrichedDailyRows.reduce((sum, r) => sum + r.commission, 0);

  return {
    dailyRows: enrichedDailyRows,
    totalSales: enrichedDailyRows.reduce((sum, r) => sum + r.totalSales, 0),
    totalCommission,
    paid,
    pending: parseFloat(Math.max(0, totalCommission - paid).toFixed(2)),
    orderCount: orders.length,
  };
}
