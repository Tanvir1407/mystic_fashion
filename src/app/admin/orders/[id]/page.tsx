import prisma from "@/lib/prisma";
import { getDeliverySettings, getDTFPrintSetting } from "../../actions";
import { notFound } from "next/navigation";
import OrderDetailsClient from "./OrderDetailsClient";
import { getStaff } from "@/app/admin/staff/actions";

export const dynamic = "force-dynamic";

export default async function SingleOrderPage({ params }: { params: { id: string } }) {
  // Fetch all database records in parallel
  const [order, deliverySettings, dtfSetting, staffRes, activityLogs] = await Promise.all([
    prisma.order.findUnique({
      where: { id: params.id },
      include: {
        items: { include: { product: true } },
        createdBy: true,
      }
    }),
    getDeliverySettings(),
    getDTFPrintSetting(),
    getStaff(),
    prisma.activityLog.findMany({
      where: {
        entityType: "Order",
        entityId: params.id,
      },
      orderBy: {
        timestamp: "desc",
      },
    })
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
    />
  );
}
