import { getStaffSession } from "@/lib/staff-auth";
import { redirect, notFound } from "next/navigation";
import prisma from "@/lib/prisma";
import { getDeliverySettings } from "@/app/admin/actions";
import { getProductsForOrder } from "@/app/admin/products/actions";
import { calcPotentialCommission, getEffectiveCommissionRate } from "@/lib/commission";
import OrderDetailsClient from "@/app/admin/orders/[id]/OrderDetailsClient";
import Link from "next/link";
import { ArrowLeft, CalendarDays } from "lucide-react";

export const dynamic = "force-dynamic";

const STATUS_COLOR: Record<string, string> = {
  DELIVERED: "bg-emerald-100 text-emerald-700 border-emerald-200",
  PENDING: "bg-amber-100 text-amber-700 border-amber-200",
  CONFIRMED: "bg-blue-100 text-blue-700 border-blue-200",
  PACKAGING: "bg-purple-100 text-purple-700 border-purple-200",
  PRINTING: "bg-violet-100 text-violet-700 border-violet-200",
  SHIPPED: "bg-indigo-100 text-indigo-700 border-indigo-200",
  CANCELLED: "bg-red-100 text-red-700 border-red-200",
  RETURNED: "bg-slate-100 text-slate-600 border-slate-200",
};

const STATUS_LABEL: Record<string, string> = {
  PENDING: "Order Placed",
  CONFIRMED: "Order Confirmed",
  PRINTING: "Order Printing",
  PACKAGING: "Order Packaged",
  SHIPPED: "Order Shipped",
  DELIVERED: "Order Delivered",
  CANCELLED: "Order Cancelled",
  RETURNED: "Order Returned",
};

export default async function StaffOrderDetailPage({ params }: { params: { id: string } }) {
  const session = await getStaffSession();
  if (!session) redirect("/staff/login");

  const [order, deliverySettings, products, rate] = await Promise.all([
    prisma.order.findFirst({
      where: { id: params.id, createdById: session.staffId, deletedAt: null },
      include: {
        items: { include: { product: true, variant: true } },
        createdBy: true,
      },
    }),
    getDeliverySettings(),
    getProductsForOrder(),
    getEffectiveCommissionRate(session.staffId),
  ]);

  if (!order) notFound();

  const commission = calcPotentialCommission(order as any, rate);

  return (
    <div className="flex flex-col gap-5 max-w-8xl mx-auto pb-10 px-2">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 pb-5 border-b border-slate-200">
        <div className="flex items-start gap-3">
          <Link
            href="/staff/orders"
            className="mt-0.5 p-2 bg-white border border-slate-200 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-50 shadow-sm transition-colors shrink-0"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                Order ID: <span className="font-mono">{order.id}</span>
              </h1>
              <span className={`text-[10px] px-2.5 py-1 rounded-full border font-bold uppercase tracking-wider ${STATUS_COLOR[order.status] ?? "bg-slate-100 text-slate-600 border-slate-200"}`}>
                {STATUS_LABEL[order.status] ?? order.status}
              </span>
            </div>
            <p className="text-xs text-slate-500 flex items-center gap-1.5 mt-1.5">
              <CalendarDays className="w-3.5 h-3.5" />
              Created {new Date(order.createdAt).toLocaleString("en-GB", {
                day: "numeric", month: "short", year: "numeric",
                hour: "2-digit", minute: "2-digit",
              })}
            </p>
          </div>
        </div>

        {/* Commission badge */}
        <div className="text-right">
          <p className="text-xs text-slate-500">Commission ({rate}%)</p>
          <p className={`text-lg font-bold ${order.status === "DELIVERED" ? "text-green-700" : order.status === "CANCELLED" ? "text-slate-400" : "text-amber-600"}`}>
            {order.status === "CANCELLED" ? "—" : `৳${commission.toLocaleString()}`}
          </p>
          {order.status !== "DELIVERED" && order.status !== "CANCELLED" && (
            <p className="text-xs text-amber-500">Earns when Delivered</p>
          )}
        </div>
      </div>

      <OrderDetailsClient
        order={order}
        deliverySettings={deliverySettings}
        products={products}
        pathaoInfo={null}
      />
    </div>
  );
}
