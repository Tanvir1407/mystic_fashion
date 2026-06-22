import { getStaffSession } from "@/lib/staff-auth";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import { getEffectiveCommissionRate, calcOrderCommission, calcPotentialCommission } from "@/lib/commission";
import { formatBDT } from "@/utils/formatPrice";
import Link from "next/link";
import SalesCard from "./SalesCard";
import OrdersCard from "./OrdersCard";
import CommissionCard from "./CommissionCard";
import LeaderboardCard from "./LeaderboardCard";

export const dynamic = "force-dynamic";

export default async function StaffDashboardPage() {
  const session = await getStaffSession();
  if (!session) redirect("/staff/login");

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const month = now.getMonth() + 1;
  const year = now.getFullYear();
  const monthName = now.toLocaleString("en-US", { month: "long" });

  const rate = await getEffectiveCommissionRate(session.staffId);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const baseWhere = { createdById: session.staffId, deletedAt: null as any };

  const [
    todayAgg, monthAgg, totalAgg,
    monthOrders, allDelivered,
    totalPaidAgg, monthPayments,
    allStaff,
    // last 7 days for sparkline
    last7Days,
  ] = await Promise.all([
    prisma.order.aggregate({ where: { ...baseWhere, createdAt: { gte: todayStart } }, _sum: { totalAmount: true }, _count: { id: true } }),
    prisma.order.aggregate({ where: { ...baseWhere, createdAt: { gte: monthStart, lt: monthEnd } }, _sum: { totalAmount: true }, _count: { id: true } }),
    prisma.order.aggregate({ where: baseWhere, _sum: { totalAmount: true }, _count: { id: true } }),
    prisma.order.findMany({
      where: { ...baseWhere, createdAt: { gte: monthStart, lt: monthEnd } },
      include: { salesReturns: { select: { returnCost: true, productLoss: true, printingLoss: true, deliveryLoss: true } } },
    }),
    prisma.order.findMany({
      where: { ...baseWhere, status: "DELIVERED" },
      include: { salesReturns: { select: { returnCost: true, productLoss: true, printingLoss: true, deliveryLoss: true } } },
    }),
    prisma.commissionPayment.aggregate({ where: { staffId: session.staffId }, _sum: { amount: true } }),
    prisma.commissionPayment.findMany({ where: { staffId: session.staffId, month, year } }),
    prisma.staff.findMany({ where: { hasPortalAccess: true }, select: { id: true, username: true } }),
    // last 7 days daily sales
    (async () => {
      const days: { date: string; amount: number; count: number }[] = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
        const next = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1);
        const agg = await prisma.order.aggregate({
          where: { ...baseWhere, createdAt: { gte: d, lt: next }, status: { not: "CANCELLED" } },
          _sum: { totalAmount: true }, _count: { id: true },
        });
        days.push({ date: d.toLocaleDateString("en-US", { weekday: "short" }), amount: agg._sum.totalAmount ?? 0, count: agg._count.id });
      }
      return days;
    })(),
  ]);

  // Commission
  const monthCommission = monthOrders.reduce((s, o) => s + calcPotentialCommission(o, rate), 0);
  const monthEarned = allDelivered.filter(o => {
    const oDate = new Date(o.createdAt);
    return oDate >= monthStart && oDate < monthEnd;
  }).reduce((s, o) => s + calcOrderCommission(o, rate), 0);
  const totalCommission = allDelivered.reduce((s, o) => s + calcOrderCommission(o, rate), 0);
  const totalPaid = totalPaidAgg._sum.amount ?? 0;
  const monthPaid = monthPayments.reduce((s, p) => s + p.amount, 0);
  const monthPending = Math.max(0, monthEarned - monthPaid);

  // Leaderboard
  const leaderboard = await Promise.all(
    allStaff.map(async (s) => {
      const agg = await prisma.order.aggregate({
        where: { createdById: s.id, createdAt: { gte: monthStart, lt: monthEnd }, deletedAt: null, status: { not: "CANCELLED" } },
        _sum: { totalAmount: true }, _count: { id: true },
      });
      return { id: s.id, username: s.username, totalSales: agg._sum.totalAmount ?? 0, orderCount: agg._count.id };
    })
  );
  leaderboard.sort((a, b) => b.totalSales - a.totalSales);
  const myRank = leaderboard.findIndex((s) => s.id === session.staffId) + 1;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-slate-900">Welcome back, {session.username} 👋</h1>
        <p className="text-sm text-slate-400 mt-0.5">{monthName} {year} · Your performance at a glance</p>
      </div>

      {/* 4 cards grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <SalesCard
          today={todayAgg._sum.totalAmount ?? 0}
          todayCount={todayAgg._count.id}
          month={monthAgg._sum.totalAmount ?? 0}
          monthCount={monthAgg._count.id}
          total={totalAgg._sum.totalAmount ?? 0}
          totalCount={totalAgg._count.id}
          sparkline={last7Days}
          monthName={monthName}
        />
        <LeaderboardCard
          leaderboard={leaderboard}
          myId={session.staffId}
          myRank={myRank}
          monthName={monthName}
        />
        <OrdersCard
          today={todayAgg._count.id}
          todaySales={todayAgg._sum.totalAmount ?? 0}
          month={monthAgg._count.id}
          monthSales={monthAgg._sum.totalAmount ?? 0}
          total={totalAgg._count.id}
          monthName={monthName}
          sparkline={last7Days}
        />
        <CommissionCard
          monthCommission={monthEarned}
          monthPending={Math.max(0, monthCommission - monthEarned)}
          totalCommission={totalCommission}
          totalPaid={totalPaid}
          rate={rate}
          monthName={monthName}
        />

      </div>

      {/* Pending banner */}
      {monthPending > 0 && (
        <div className="bg-amber-50 border border-amber-100 rounded-2xl px-5 py-4 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold text-amber-500 uppercase tracking-wider">Pending Commission — {monthName}</p>
            <p className="text-2xl font-black text-amber-700 mt-0.5">{formatBDT(monthPending)}</p>
          </div>
          <Link href="/staff/payments" className="text-xs font-semibold text-amber-600 bg-white hover:bg-amber-50 px-4 py-2 rounded-xl transition-colors border border-amber-100 shadow-sm">
            View History →
          </Link>
        </div>
      )}
    </div>
  );
}
