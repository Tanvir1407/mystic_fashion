import prisma from "@/lib/prisma";
import { getRecentSalesReturns } from "../../actions";
import ReturnsClient from "./ReturnsClient";

export default async function ReturnsPage() {
  // Fetch recent orders with their items and products
  const orders = await prisma.order.findMany({
    include: {
      items: {
        include: {
          product: {
            select: { name: true, price: true, purchasePrice: true }
          }
        }
      }
    },
    orderBy: { createdAt: "desc" },
    take: 100
  });

  const recentReturns = await getRecentSalesReturns();

  return (
    <ReturnsClient
      orders={orders as any}
      initialReturns={recentReturns as any}
    />
  );
}
