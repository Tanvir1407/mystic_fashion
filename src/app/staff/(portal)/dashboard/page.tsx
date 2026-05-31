import { getStaffSession } from "@/lib/staff-auth";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import { getStaffCommissionSummary } from "@/lib/commission";
import { formatBDT } from "@/utils/formatPrice";
import { ShoppingBag, TrendingUp, Wallet, Clock, Trophy, Plus } from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function StaffDashboardPage() {
  const session = await getStaffSession();
  if (!session) redirect("/staff/login");

  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();

  // Personal summary for this month
  const summary = await getStaffCommissionSummary(session.staffId, month, year);

  // Today's orders count
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayOrders = await prisma.order.count({
    where: { createdById: session.staffId, createdAt: { gte: todayStart }, deletedAt: null },
  });

  // Leaderboard: all staff with portal access, this month
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 1);

  const allStaff = await prisma.staff.findMany({
    where: { hasPortalAccess: true },
    select: { id: true, username: true },
  });

  const leaderboard = await Promise.all(
    allStaff.map(async (s) => {
      const orders = await prisma.order.aggregate({
        where: {
          createdById: s.id,
          createdAt: { gte: startDate, lt: endDate },
          deletedAt: null,
          status: { not: "CANCELLED" },
        },
        _sum: { totalAmount: true },
        _count: { id: true },
      });
      return {
        id: s.id,
        username: s.username,
        totalSales: orders._sum.totalAmount ?? 0,
        orderCount: orders._count.id,
      };
    })
  );

  leaderboard.sort((a, b) => b.totalSales - a.totalSales);
  const myRank = leaderboard.findIndex((s) => s.id === session.staffId) + 1;

  const monthName = now.toLocaleString("en-US", { month: "long" });

  return (
    <div className="space-y-6 max-w-8xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Welcome back, {session.username}</h1>
          <p className="text-sm text-slate-500 mt-0.5">{monthName} {year} performance</p>
        </div>
        <Link
          href="/staff/orders/create"
          className="flex items-center gap-1.5 px-4 py-2 bg-[#1a3a5c] text-white text-sm font-medium rounded-lg hover:bg-[#15304f] transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Order
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={ShoppingBag} label="Today's Orders" value={String(todayOrders)} color="blue" />
        <StatCard icon={Clock} label="This Month Orders" value={String(summary.orderCount)} color="purple" />
        <StatCard icon={TrendingUp} label="Month Sales" value={formatBDT(summary.totalSales)} color="green" />
        <StatCard icon={Wallet} label="Commission Earned" value={formatBDT(summary.earned)} sub={`${summary.rate}% rate`} color="amber" />
      </div>

      {/* Commission pending */}
      {summary.pending > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-amber-800">Pending Commission</p>
            <p className="text-2xl font-bold text-amber-900 mt-0.5">{formatBDT(summary.pending)}</p>
          </div>
          <Link href="/staff/commission" className="text-sm text-amber-700 font-medium hover:underline">
            View details →
          </Link>
        </div>
      )}

      {/* Leaderboard */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
          <Trophy className="w-4 h-4 text-amber-500" />
          <h2 className="text-sm font-semibold text-slate-900">
            Sales Leaderboard — {monthName}
          </h2>
          {myRank > 0 && (
            <span className="ml-auto text-xs text-slate-500">Your rank: <strong className="text-slate-800">#{myRank}</strong></span>
          )}
        </div>
        <div className="divide-y divide-slate-100">
          {leaderboard.length === 0 && (
            <p className="px-5 py-8 text-center text-sm text-slate-400">No sales this month yet.</p>
          )}
          {leaderboard.map((s, idx) => {
            const isMe = s.id === session.staffId;
            return (
              <div
                key={s.id}
                className={`flex items-center gap-4 px-5 py-3.5 ${isMe ? "bg-blue-50" : ""}`}
              >
                <span className={`w-6 text-sm font-bold text-center flex-shrink-0 ${idx === 0 ? "text-amber-500" : idx === 1 ? "text-slate-400" : idx === 2 ? "text-orange-400" : "text-slate-400"}`}>
                  {idx + 1}
                </span>
                <div className="w-7 h-7 rounded-full bg-slate-200 flex items-center justify-center flex-shrink-0">
                  <span className="text-xs font-bold text-slate-600 uppercase">{s.username.charAt(0)}</span>
                </div>
                <span className={`flex-1 text-sm font-medium ${isMe ? "text-blue-700" : "text-slate-800"}`}>
                  {s.username} {isMe && <span className="text-xs font-normal">(you)</span>}
                </span>
                <span className="text-xs text-slate-500">{s.orderCount} orders</span>
                <span className={`text-sm font-semibold ${isMe ? "text-blue-700" : "text-slate-900"}`}>
                  {formatBDT(s.totalSales)}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  color,
}: {
  icon: any;
  label: string;
  value: string;
  sub?: string;
  color: "blue" | "purple" | "green" | "amber";
}) {
  const colors = {
    blue: "bg-blue-50 text-blue-600",
    purple: "bg-purple-50 text-purple-600",
    green: "bg-green-50 text-green-600",
    amber: "bg-amber-50 text-amber-600",
  };
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4">
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${colors[color]} mb-3`}>
        <Icon className="w-4 h-4" />
      </div>
      <p className="text-xs text-slate-500">{label}</p>
      <p className="text-lg font-bold text-slate-900 mt-0.5">{value}</p>
      {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
    </div>
  );
}
