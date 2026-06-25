import prisma from "@/lib/prisma";
import { getRecentSalesReturns } from "../actions";
import ReturnsClient from "./ReturnsClient";
import { Suspense } from "react";

export default async function ReturnsPage() {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  // Fetch current month orders with their items and products
  const orders = await prisma.order.findMany({
    where: {
      createdAt: {
        gte: startOfMonth
      }
    },
    include: {
      items: {
        include: {
          product: {
            select: { name: true, price: true, purchasePrice: true, mediaAssets: { orderBy: { sortOrder: "asc" }, select: { url: true } } }
          }
        }
      },
      salesReturns: { select: { orderItemId: true, quantity: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const recentReturns = await getRecentSalesReturns();

  return (
    <Suspense fallback={<div className="p-8 text-sm text-slate-500">Loading returns module...</div>}>
      <ReturnsClient
        orders={orders as any}
        initialReturns={recentReturns as any}
      />
    </Suspense>
  );
}
