import prisma from "@/lib/prisma";
import ReturnsClient from "./ReturnsClient";
import { Suspense } from "react";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const revalidate = 0;

export default async function ReturnsPage({
  searchParams,
}: {
  searchParams: { page?: string; limit?: string; search?: string; tab?: string; status?: string };
}) {
  const page = Number(searchParams?.page) || 1;
  const limit = Number(searchParams?.limit) || 10;
  const search = searchParams?.search || "";
  const status = searchParams?.status || "ALL";
  const PER_PAGE = [10, 20, 50, 100].includes(limit) ? limit : 10;

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  // Fetch current month orders with their items and products for the creation flow
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
          },
          variant: { select: { size: true, color: true } },
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

  // Build the search where clause for Return Logs
  const returnWhereClause: any = {};
  if (status !== "ALL") {
    returnWhereClause.status = status;
  }
  if (search.trim()) {
    const query = search.trim();
    returnWhereClause.OR = [
      { orderId: { contains: query, mode: "insensitive" } },
      { order: { customerName: { contains: query, mode: "insensitive" } } },
      { orderItem: { product: { name: { contains: query, mode: "insensitive" } } } },
    ];
  }

  // Fetch paginated returns and aggregate summaries matching the filters
  const [returnsData, returnsCount, deliveryAndReturnSum, wastageSum, restockedSum] = await Promise.all([
    prisma.salesReturn.findMany({
      where: returnWhereClause,
      include: {
        order: { select: { id: true, customerName: true } },
        orderItem: { include: { product: { select: { name: true } } } },
        variant: { select: { size: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PER_PAGE,
      take: PER_PAGE,
    }),
    prisma.salesReturn.count({ where: returnWhereClause }),
    prisma.salesReturn.aggregate({
      where: returnWhereClause,
      _sum: {
        deliveryLoss: true,
        returnCost: true,
      }
    }),
    prisma.salesReturn.aggregate({
      where: {
        ...returnWhereClause,
        status: "WASTAGE",
      },
      _sum: {
        productLoss: true,
        printingLoss: true,
      }
    }),
    prisma.salesReturn.aggregate({
      where: {
        ...returnWhereClause,
        status: "RESTOCKED",
      },
      _sum: {
        quantity: true,
      }
    })
  ]);

  const totalPages = Math.ceil(returnsCount / PER_PAGE);

  const summaries = {
    deliveryLoss: deliveryAndReturnSum._sum.deliveryLoss ?? 0,
    returnCost: deliveryAndReturnSum._sum.returnCost ?? 0,
    wastageLoss: (wastageSum._sum.productLoss ?? 0) + (wastageSum._sum.printingLoss ?? 0),
    restockedCount: restockedSum._sum.quantity ?? 0,
  };

  return (
    <Suspense fallback={<div className="p-8 text-sm text-slate-500">Loading returns module...</div>}>
      <ReturnsClient
        orders={orders as any}
        initialReturns={returnsData as any}
        totalCount={returnsCount}
        totalPages={totalPages}
        currentPage={page}
        initialSummaries={summaries}
        currentStatusFilter={status}
      />
    </Suspense>
  );
}
