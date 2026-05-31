import { getStaffSession } from "@/lib/staff-auth";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import { formatBDT } from "@/utils/formatPrice";
import { formatDate } from "@/utils/formatDate";
import { getEffectiveCommissionRate, calcOrderCommission } from "@/lib/commission";
import Link from "next/link";
import { Plus, ShoppingBag } from "lucide-react";

export const dynamic = "force-dynamic";

const STATUS_STYLES: Record<string, string> = {
  PENDING: "bg-yellow-50 text-yellow-700 border-yellow-200",
  CONFIRMED: "bg-blue-50 text-blue-700 border-blue-200",
  PACKAGING: "bg-purple-50 text-purple-700 border-purple-200",
  SHIPPED: "bg-indigo-50 text-indigo-700 border-indigo-200",
  DELIVERED: "bg-green-50 text-green-700 border-green-200",
  CANCELLED: "bg-red-50 text-red-700 border-red-200",
  RETURNED: "bg-orange-50 text-orange-700 border-orange-200",
  PRINTING: "bg-slate-50 text-slate-700 border-slate-200",
};

export default async function StaffOrdersPage() {
  const session = await getStaffSession();
  if (!session) redirect("/staff/login");

  const [orders, rate] = await Promise.all([
    prisma.order.findMany({
      where: { createdById: session.staffId, deletedAt: null },
      orderBy: { createdAt: "desc" },
      include: {
        salesReturns: { select: { returnCost: true, productLoss: true, printingLoss: true, deliveryLoss: true } },
      },
    }),
    getEffectiveCommissionRate(session.staffId),
  ]);

  return (
    <div className="space-y-5 max-w-8xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">My Orders</h1>
          <p className="text-sm text-slate-500 mt-0.5">{orders.length} total orders</p>
        </div>
        <Link
          href="/staff/orders/create"
          className="flex items-center gap-1.5 px-4 py-2 bg-[#1a3a5c] text-white text-sm font-medium rounded-lg hover:bg-[#15304f] transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Order
        </Link>
      </div>

      {orders.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <ShoppingBag className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="text-sm font-medium text-slate-600">No orders yet</p>
          <p className="text-xs text-slate-400 mt-1">Create your first order to get started.</p>
          <Link
            href="/staff/orders/create"
            className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 bg-[#1a3a5c] text-white text-sm font-medium rounded-lg hover:bg-[#15304f] transition-colors"
          >
            <Plus className="w-4 h-4" />
            Create Order
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Customer</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Date</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Amount</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Commission</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {orders.map((order) => {
                  const commission = calcOrderCommission(order, rate);
                  return (
                    <tr key={order.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3">
                        <p className="font-medium text-slate-900">{order.customerName}</p>
                        <p className="text-xs text-slate-400">{order.phone}</p>
                      </td>
                      <td className="px-4 py-3 text-slate-500 text-xs">{formatDate(order.createdAt)}</td>
                      <td className="px-4 py-3 text-right font-medium text-slate-900">{formatBDT(order.totalAmount)}</td>
                      <td className="px-4 py-3 text-right">
                        <span className={`font-medium ${order.status === "CANCELLED" ? "text-slate-400" : "text-green-700"}`}>
                          {order.status === "CANCELLED" ? "—" : formatBDT(commission)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium border ${STATUS_STYLES[order.status] ?? "bg-slate-50 text-slate-600 border-slate-200"}`}>
                          {order.status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
