import { getStaffSession } from "@/lib/staff-auth";
import { redirect, notFound } from "next/navigation";
import prisma from "@/lib/prisma";
import { getDeliverySettings } from "@/app/admin/actions";
import { calcPotentialCommission, getEffectiveCommissionRate } from "@/lib/commission";
import OrderDetailsClient from "@/app/admin/orders/[id]/OrderDetailsClient";

export const dynamic = "force-dynamic";

export default async function StaffOrderDetailPage({ params }: { params: { id: string } }) {
  const session = await getStaffSession();
  if (!session) redirect("/staff/login");

  // Fetch all necessary database records in parallel
  const [order, deliverySettings, rate, activityLogs, cancellationRequest] = await Promise.all([
    prisma.order.findFirst({
      where: { id: params.id, deletedAt: null },
      include: {
        items: { include: { product: true } },
        createdBy: true,
      },
    }),
    getDeliverySettings(),
    getEffectiveCommissionRate(session.staffId),
    prisma.activityLog.findMany({
      where: {
        entityType: "Order",
        entityId: params.id,
      },
      orderBy: {
        timestamp: "desc",
      },
    }),
    prisma.cancellationRequest.findUnique({
      where: { orderId: params.id },
    }),
  ]);

  if (!order) notFound();

  const isOwnOrder = order.createdById === session.staffId;
  const commission = isOwnOrder ? calcPotentialCommission(order as any, rate) : 0;
  const commissionInfo = isOwnOrder ? {
    rate,
    amount: commission,
    orderStatus: order.status,
  } : null;

  return (
    <OrderDetailsClient
      order={order}
      deliverySettings={deliverySettings}
      products={[]}
      pathaoInfo={null}
      backUrl="/staff/orders"
      commissionInfo={commissionInfo}
      activityLogs={activityLogs}
      cancellationRequest={cancellationRequest}
      staffSession={session}
    />
  );
}
