import { getStaffSession } from "@/lib/staff-auth";
import { redirect, notFound } from "next/navigation";
import prisma from "@/lib/prisma";
import { getDeliverySettings } from "@/app/admin/actions";
import { getProductsForOrder } from "@/app/admin/products/actions";
import { calcPotentialCommission, getEffectiveCommissionRate } from "@/lib/commission";
import OrderDetailsClient from "@/app/admin/orders/[id]/OrderDetailsClient";

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
  HOLD: "bg-pink-100 text-pink-700 border-pink-200",
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
  HOLD: "Order On Hold",
};

export default async function StaffOrderDetailPage({ params }: { params: { id: string } }) {
  const session = await getStaffSession();
  if (!session) redirect("/staff/login");

  const [order, deliverySettings, products, rate] = await Promise.all([
    prisma.order.findFirst({
      where: { id: params.id, createdById: session.staffId, deletedAt: null },
      include: {
        items: { include: { product: true } },
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
    <OrderDetailsClient
      order={order}
      deliverySettings={deliverySettings}
      products={products}
      pathaoInfo={null}
      backUrl="/staff/orders"
      commissionInfo={{
        rate,
        amount: commission,
        orderStatus: order.status,
      }}
    />
  );
}
