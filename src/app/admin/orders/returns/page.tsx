import prisma from "@/lib/prisma";
import { getRecentSalesReturns } from "../actions";
import ReturnsClient from "./ReturnsClient";
import { Suspense } from "react";

export default async function ReturnsPage() {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  // Fetch current month orders with their items and products
  const ordersRes = await prisma.order.findMany({
    where: {
      createdAt: {
        gte: startOfMonth
      }
    },
    include: {
      items: {
        include: {
          variant: {
            select: {
              pricingMatrix: {
                select: {
                  costPrice: true
                }
              }
            }
          },
          product: {
            select: {
              name: true,
              mediaAssets: { orderBy: { sortOrder: "asc" } }
            }
          }
        }
      },
      salesReturns: { select: { orderItemId: true, quantity: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const orders = ordersRes.map((order: any) => ({
    ...order,
    items: order.items.map((item: any) => ({
      ...item,
      product: {
        name: item.product?.name || "Unknown Product",
        price: item.price,
        purchasePrice: item.variant?.pricingMatrix?.costPrice
          ? Number(item.variant.pricingMatrix.costPrice)
          : 0,
        images: item.product?.mediaAssets && item.product.mediaAssets.length > 0
          ? item.product.mediaAssets.map((asset: any) => asset.url)
          : []
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
