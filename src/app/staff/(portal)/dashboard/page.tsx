import { getStaffSession } from "@/lib/staff-auth";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import { formatBDT } from "@/utils/formatPrice";
import { Plus } from "lucide-react";
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

  const baseWhere = { createdById: session.staffId, deletedAt: null };

  const [
    todayAgg, monthAgg, totalAgg,
    totalPaidAgg, monthPayments,
    allStaff,
    monthCommissionAgg, totalCommissionAgg,
    last7Days,
  ] = await Promise.all([
    prisma.order.aggregate({ where: { ...baseWhere, createdAt: { gte: todayStart } }, _sum: { totalAmount: true }, _count: { id: true } }),
    prisma.order.aggregate({ where: { ...baseWhere, createdAt: { gte: monthStart, lt: monthEnd } }, _sum: { totalAmount: true }, _count: { id: true } }),
    prisma.order.aggregate({ where: baseWhere, _sum: { totalAmount: true }, _count: { id: true } }),
    prisma.commissionPayment.aggregate({ where: { staffId: session.staffId }, _sum: { amount: true } }),
    prisma.commissionPayment.findMany({ where: { staffId: session.staffId, month, year } }),
    prisma.staff.findMany({ where: { hasPortalAccess: true }, select: { id: true, username: true } }),
    prisma.dailyStaffCommission.aggregate({
      where: { staffId: session.staffId, date: { gte: monthStart, lt: monthEnd } },
      _sum: { potentialCommission: true, earnedCommission: true },
    }),
    prisma.dailyStaffCommission.aggregate({
      where: { staffId: session.staffId },
      _sum: { earnedCommission: true },
    }),
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

  const monthEstimated = monthCommissionAgg._sum.potentialCommission ?? 0;
  const monthEarned = monthCommissionAgg._sum.earnedCommission ?? 0;
  const totalEarned = totalCommissionAgg._sum.earnedCommission ?? 0;
  const totalPaid = totalPaidAgg._sum.amount ?? 0;
  const monthPaid = monthPayments.reduce((s, p) => s + p.amount, 0);
  const pendingPayment = Math.max(0, monthEarned - monthPaid);

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
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Welcome back, {session.username}</h1>
          <p className="text-sm text-slate-500 mt-0.5">{monthName} {year}</p>
        </div>
        <Link
          href="/staff/orders/create"
          className="flex items-center gap-1.5 px-4 py-2 bg-[#800020] text-white text-sm font-semibold rounded-lg hover:bg-[#600018] transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" /> New Order
        </Link>
      </div>

      {/* 4 cards grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
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
          monthEstimated={monthEstimated}
          monthEarned={monthEarned}
          totalEarned={totalEarned}
          totalPaid={totalPaid}
          monthName={monthName}
        />
      </div>

      {/* Pending banner */}
      {pendingPayment > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-amber-600 uppercase tracking-wide">Pending Commission — {monthName}</p>
            <p className="text-2xl font-black text-amber-800 mt-0.5">{formatBDT(pendingPayment)}</p>
          </div>
          <Link href="/staff/payments" className="text-xs font-semibold text-amber-700 bg-amber-100 hover:bg-amber-200 px-3 py-2 rounded-lg transition-colors border border-amber-300">
            View History →
          </Link>
        </div>
      )}
    </div>
  );
}
