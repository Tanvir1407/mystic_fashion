import prisma from "@/lib/prisma";
import { getRecentSalesReturns } from "../orders/actions";
import ReturnsClient from "./ReturnsClient";
import { Suspense } from "react";

export default async function ReturnsPage() {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  // Fetch current month orders with their items and products
  const ordersData = await prisma.order.findMany({
    where: {
      createdAt: {
        gte: startOfMonth
      }
    },
    include: {
      items: {
        include: {
          product: {
            select: { 
              name: true,
              mediaAssets: {
                select: { url: true },
                orderBy: { sortOrder: "asc" }
              }
            }
          }
        }
      },
      salesReturns: { select: { orderItemId: true, quantity: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const orders = ordersData.map(order => ({
    ...order,
    items: order.items.map(item => ({
      ...item,
      product: {
        name: item.product.name,
        price: item.price,
        purchasePrice: null,
        images: item.product.mediaAssets.map(ma => ma.url)
      }
    }))
  }));

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
