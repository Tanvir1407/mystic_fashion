import prisma from "@/lib/prisma";
import { getDeliverySettings } from "../../actions";
import { getProductsForOrder } from "@/app/admin/products/actions";
import { pathaoClient } from "@/lib/pathao/PathaoClient";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, CalendarDays } from "lucide-react";
import OrderDetailsClient from "./OrderDetailsClient";

export const dynamic = "force-dynamic";

export default async function SingleOrderPage({ params }: { params: { id: string } }) {
  const order = await prisma.order.findUnique({
    where: { id: params.id },
    include: {
      items: { include: { product: true } },
      createdBy: true,
    }
  });
  const deliverySettings = await getDeliverySettings();

  if (!order) notFound();

  let pathaoInfo: any = null;
  if (order.status === "SHIPPED" && order.pathaoConsignmentId) {
    try {
      pathaoInfo = await pathaoClient.getOrderInfo(order.pathaoConsignmentId);
    } catch (e) {
      console.error("[AdminOrderPage] Failed to fetch Pathao order info:", e);
    }
  }

  const products = await getProductsForOrder();

  const statusColor: Record<string, string> = {
    DELIVERED: "bg-emerald-100 text-emerald-700 border-emerald-200",
    PENDING: "bg-amber-100 text-amber-700 border-amber-200",
    CONFIRMED: "bg-blue-100 text-blue-700 border-blue-200",
    PACKAGING: "bg-purple-100 text-purple-700 border-purple-200",
    PRINTING: "bg-violet-100 text-violet-700 border-violet-200",
    SHIPPED: "bg-indigo-100 text-indigo-700 border-indigo-200",
    CANCELLED: "bg-red-100 text-red-700 border-red-200",
    RETURNED: "bg-slate-100 text-slate-600 border-slate-200",
  };
  const modifyStatus = (status: string) => {
    switch (status) {
      case "PENDING":
        return "Order Placed";
      case "CONFIRMED":
        return "Order Confirmed";
      case "PRINTING":
        return "Order Printing";
      case "PACKAGING":
        return "Order Packaged";
      case "SHIPPED":
        return "Order Shipped";
      case "DELIVERED":
        return "Order Delivered";
      case "CANCELLED":
        return "Order Cancelled";
      case "RETURNED":
        return "Order Returned";
      default:
        return status;
    }
  }
  return (
    <div className="flex flex-col gap-5 max-w-7xl mx-auto pb-10 px-4 sm:px-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 pb-5 border-b border-slate-200">
        <div className="flex items-start gap-3">
          <Link
            href="/admin/orders"
            className="mt-0.5 p-2 bg-white border border-slate-200 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-50 shadow-sm transition-colors shrink-0"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                Order ID: <span className="font-mono">{order.id}</span>
              </h1>
              <span className={`text-[10px] px-2.5 py-1 rounded-full border font-bold uppercase tracking-wider ${statusColor[order.status] ?? "bg-slate-100 text-slate-600 border-slate-200"}`}>
                {modifyStatus(order.status)}
              </span>
              {order.isStorePickup && (
                <span className="text-[10px] px-2.5 py-1 rounded-full border font-bold uppercase tracking-wider bg-teal-50 text-teal-700 border-teal-200">
                  Store Pickup
                </span>
              )}
              {order.orderSource === "eCommerce" && (
                <span className="text-[10px] px-2.5 py-1 rounded-full border font-bold uppercase tracking-wider bg-sky-50 text-sky-700 border-sky-200">
                  eCommerce
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 flex items-center gap-1.5 mt-1.5">
              <CalendarDays className="w-3.5 h-3.5" />
              Created {new Date(order.createdAt).toLocaleString("en-GB", {
                day: "numeric", month: "short", year: "numeric",
                hour: "2-digit", minute: "2-digit"
              })}
            </p>
          </div>
        </div>
      </div>

      <OrderDetailsClient
        order={order}
        deliverySettings={deliverySettings}
        products={products}
        pathaoInfo={pathaoInfo}
      />
    </div>
  );
}
