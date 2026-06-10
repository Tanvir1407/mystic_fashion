import { getStaffSession } from "@/lib/staff-auth";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import { formatBDT } from "@/utils/formatPrice";
import { TrendingUp, Wallet, CheckCircle } from "lucide-react";
import MonthSelector from "./MonthSelector";
import DailyCommissionTable from "./DailyCommissionTable";

export const dynamic = "force-dynamic";

export default async function StaffCommissionPage({
  searchParams,
}: {
  searchParams: { month?: string; year?: string };
}) {
  const session = await getStaffSession();
  if (!session) redirect("/staff/login");

  const now = new Date();
  const month = parseInt(searchParams.month || String(now.getMonth() + 1));
  const year = parseInt(searchParams.year || String(now.getFullYear()));

  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 1);

  const [dailyRecords, orders, payments] = await Promise.all([
    prisma.dailyStaffCommission.findMany({
      where: {
        staffId: session.staffId,
        date: { gte: startDate, lt: endDate },
      },
      orderBy: { date: "desc" },
    }),
    prisma.order.findMany({
      where: {
        createdById: session.staffId,
        status: "DELIVERED",
        deliveredAt: { gte: startDate, lt: endDate },
        deletedAt: null,
      },
      orderBy: { deliveredAt: "desc" },
      include: {
        salesReturns: {
          select: { returnCost: true, productLoss: true, printingLoss: true, deliveryLoss: true },
        },
      },
    }),
    prisma.commissionPayment.findMany({
      where: { staffId: session.staffId, month, year },
      orderBy: { paidAt: "desc" },
    }),
  ]);

  const totalEstimated = dailyRecords.reduce((s, r) => s + r.potentialCommission, 0);
  const totalEarned = dailyRecords.reduce((s, r) => s + r.earnedCommission, 0);
  const paid = payments.reduce((s, p) => s + p.amount, 0);
  const pending = Math.max(0, totalEarned - paid);

  const monthName = new Date(year, month - 1).toLocaleString("en-US", { month: "long" });

  const monthOptions = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    return { month: d.getMonth() + 1, year: d.getFullYear(), label: d.toLocaleString("en-US", { month: "long", year: "numeric" }) };
  });

  return (
    <div className="space-y-6 max-w-8xl">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Commission</h1>
          <p className="text-sm text-slate-500 mt-0.5">Daily slab-based commission for {monthName}</p>
        </div>
        <MonthSelector current={`${month}-${year}`} options={monthOptions} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center mb-3">
            <TrendingUp className="w-4 h-4 text-amber-600" />
          </div>
          <p className="text-xs text-slate-500">Estimated</p>
          <p className="text-xl font-bold text-slate-900 mt-0.5">{formatBDT(totalEstimated)}</p>
          <p className="text-xs text-slate-400 mt-0.5">based on all orders</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center mb-3">
            <TrendingUp className="w-4 h-4 text-green-600" />
          </div>
          <p className="text-xs text-slate-500">Confirmed Earned</p>
          <p className="text-xl font-bold text-slate-900 mt-0.5">{formatBDT(totalEarned)}</p>
          <p className="text-xs text-slate-400 mt-0.5">{dailyRecords.length} days in {monthName}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center mb-3">
            <CheckCircle className="w-4 h-4 text-blue-600" />
          </div>
          <p className="text-xs text-slate-500">Paid Out</p>
          <p className="text-xl font-bold text-slate-900 mt-0.5">{formatBDT(paid)}</p>
          <p className="text-xs text-slate-400 mt-0.5">{payments.length} payment(s)</p>
        </div>
        <div className={`rounded-xl border p-4 ${pending > 0 ? "bg-amber-50 border-amber-200" : "bg-white border-slate-200"}`}>
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-3 ${pending > 0 ? "bg-amber-100" : "bg-slate-100"}`}>
            <Wallet className={`w-4 h-4 ${pending > 0 ? "text-amber-600" : "text-slate-400"}`} />
          </div>
          <p className={`text-xs ${pending > 0 ? "text-amber-700" : "text-slate-500"}`}>Pending</p>
          <p className={`text-xl font-bold mt-0.5 ${pending > 0 ? "text-amber-900" : "text-slate-900"}`}>{formatBDT(pending)}</p>
        </div>
      </div>

      {payments.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100">
            <h2 className="text-sm font-semibold text-slate-900">Payment History</h2>
          </div>
          <div className="divide-y divide-slate-100">
            {payments.map((p) => (
              <div key={p.id} className="flex items-center justify-between px-5 py-3">
                <div>
                  <p className="text-sm font-medium text-slate-900">{formatBDT(p.amount)}</p>
                  {p.note && <p className="text-xs text-slate-400">{p.note}</p>}
                </div>
                <p className="text-xs text-slate-500">{p.paidAt.toLocaleDateString("en-GB")}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <DailyCommissionTable
        dailyRecords={dailyRecords.map((r) => ({
          date: r.date,
          totalSales: r.totalSales,
          potentialCommission: r.potentialCommission,
          earnedCommission: r.earnedCommission,
        }))}
        orders={orders.map((o) => ({
          id: o.id,
          customerName: o.customerName,
          totalAmount: o.totalAmount,
          deliveredAt: o.deliveredAt,
        }))}
      />
    </div>
  );
}
