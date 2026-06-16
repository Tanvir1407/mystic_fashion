import prisma from "@/lib/prisma";
import { getDeliverySettings, getDTFPrintSetting } from "../../actions";
import { notFound } from "next/navigation";
import OrderDetailsClient from "./OrderDetailsClient";
import { getStaff } from "@/app/admin/staff/actions";

export const dynamic = "force-dynamic";

export default async function SingleOrderPage({ params }: { params: { id: string } }) {
  // Fetch all database records in parallel
  const [order, deliverySettings, dtfSetting, staffRes, activityLogs, cancellationRequest] = await Promise.all([
    prisma.order.findUnique({
      where: { id: params.id },
      include: {
        items: { include: { product: true } },
        createdBy: true,
        salesReturns: true,
      }
    }),
    getDeliverySettings(),
    getDTFPrintSetting(),
    getStaff(),
    prisma.activityLog.findMany({
      where: {
        OR: [
          {
            entityType: "Order",
            entityId: params.id,
          },
          {
            entityType: "SalesReturn",
            description: {
              contains: params.id,
            },
          },
        ],
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

  const staff = staffRes.success ? staffRes.data : [];

  return (
    <OrderDetailsClient
      order={order}
      deliverySettings={deliverySettings}
      products={[]}
      pathaoInfo={null}
      dtfSetting={dtfSetting}
      staff={staff}
      activityLogs={activityLogs}
      cancellationRequest={cancellationRequest}
    />
  );
}
