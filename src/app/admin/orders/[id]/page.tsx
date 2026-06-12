import prisma from "@/lib/prisma";
import { getDeliverySettings, getDTFPrintSetting } from "../../actions";
import { getProductsForOrder } from "@/app/admin/products/actions";
import { pathaoClient } from "@/lib/pathao/PathaoClient";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, CalendarDays } from "lucide-react";
import OrderDetailsClient from "./OrderDetailsClient";
import { getStaff } from "@/app/admin/staff/actions";

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
  const dtfSetting = await getDTFPrintSetting();
  const staffRes = await getStaff();
  const staff = staffRes.success ? staffRes.data : [];

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
    <OrderDetailsClient
      order={order}
      deliverySettings={deliverySettings}
      products={products}
      pathaoInfo={pathaoInfo}
      dtfSetting={dtfSetting}
      staff={staff}
    />
  );
}
