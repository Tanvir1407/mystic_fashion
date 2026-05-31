import { getStaffSession } from "@/lib/staff-auth";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import { getEffectiveCommissionRate, calcOrderCommission } from "@/lib/commission";
import { formatBDT } from "@/utils/formatPrice";
import { formatDate } from "@/utils/formatDate";
import { TrendingUp, Wallet, CheckCircle, Clock } from "lucide-react";
import MonthSelector from "./MonthSelector";

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

  const rate = await getEffectiveCommissionRate(session.staffId);

  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 1);

  const [orders, payments] = await Promise.all([
    prisma.order.findMany({
      where: {
        createdById: session.staffId,
        createdAt: { gte: startDate, lt: endDate },
        deletedAt: null,
      },
      orderBy: { createdAt: "desc" },
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

  const orderRows = orders.map((o) => ({
    id: o.id,
    customerName: o.customerName,
    createdAt: o.createdAt,
    totalAmount: o.totalAmount,
    deliveryCharge: o.deliveryCharge,
    status: o.status,
    commission: calcOrderCommission(o, rate),
  }));

  const earned = orderRows.reduce((s, r) => s + r.commission, 0);
  const paid = payments.reduce((s, p) => s + p.amount, 0);
  const pending = Math.max(0, earned - paid);

  const monthName = new Date(year, month - 1).toLocaleString("en-US", { month: "long" });

  // Month navigation options (last 6 months)
  const monthOptions = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    return { month: d.getMonth() + 1, year: d.getFullYear(), label: d.toLocaleString("en-US", { month: "long", year: "numeric" }) };
  });

  return (
    <div className="space-y-6 max-w-8xl">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Commission</h1>
          <p className="text-sm text-slate-500 mt-0.5">Rate: {rate}%</p>
        </div>
        {/* Month selector */}
        <MonthSelector current={`${month}-${year}`} options={monthOptions} />
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center mb-3">
            <TrendingUp className="w-4 h-4 text-green-600" />
          </div>
          <p className="text-xs text-slate-500">Total Earned</p>
          <p className="text-xl font-bold text-slate-900 mt-0.5">{formatBDT(earned)}</p>
          <p className="text-xs text-slate-400 mt-0.5">{orders.length} orders in {monthName}</p>
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

      {/* Payment history */}
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
                <p className="text-xs text-slate-500">{formatDate(p.paidAt)}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Per-order breakdown */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100">
          <h2 className="text-sm font-semibold text-slate-900">Order Breakdown — {monthName}</h2>
        </div>
        {orderRows.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-slate-400">No orders this month.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500">Order</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500">Customer</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500">Sale</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500">Status</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500">Commission</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {orderRows.map((o) => (
                  <tr key={o.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-900 text-xs">{o.id}</p>
                      <p className="text-xs text-slate-400">{formatDate(o.createdAt)}</p>
                    </td>
                    <td className="px-4 py-3 text-slate-700">{o.customerName}</td>
                    <td className="px-4 py-3 text-right text-slate-900 font-medium">{formatBDT(o.totalAmount)}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium border ${
                        o.status === "DELIVERED" ? "bg-green-50 text-green-700 border-green-200" :
                        o.status === "CANCELLED" ? "bg-red-50 text-red-700 border-red-200" :
                        "bg-slate-50 text-slate-600 border-slate-200"
                      }`}>{o.status}</span>
                    </td>
                    <td className="px-4 py-3 text-right font-semibold">
                      <span className={o.status === "CANCELLED" ? "text-slate-400" : "text-green-700"}>
                        {o.status === "CANCELLED" ? "—" : formatBDT(o.commission)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
