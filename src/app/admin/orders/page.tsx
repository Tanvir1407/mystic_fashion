import { prisma } from "@/lib/prisma";
import OrderListClient from "./OrderListClient";

export const dynamic = "force-dynamic";

export default async function AdminOrdersPage() {
  const orders = await prisma.order.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      items: {
        include: {
          product: true,
        },
      },
    },
  });

  return <OrderListClient initialOrders={orders} />;
}
