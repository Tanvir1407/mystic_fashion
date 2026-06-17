import prisma from "@/lib/prisma";
import DashboardClient from "./DashboardClient";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const revalidate = 0;

export default async function AdminDashboardPage({ searchParams }: { searchParams: { filter?: string } }) {
  const filter = searchParams?.filter || "all";
  
  const now = new Date();
  let startDate = new Date(0);

  if (filter === "weekly") {
    startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7);
  } else if (filter === "monthly") {
    startDate = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
  } else if (filter === "yearly") {
    startDate = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
  }

  // Fetch all data concurrently using native Prisma aggregates and selective fields
  const [
    stockSum,
    pendingQtySum,
    deliveredQtySum,
    cancelledQtySum,
    purchasesAggregate,
    deliveredOrders,
    cancelledOrders,
    chartPurchases,
    staffPerformance,
    recentOrders
  ] = await Promise.all([
    prisma.stock.aggregate({
      where: { warehouse: { code: "WH-MAIN" } },
      _sum: { availableQuantity: true }
    }),
    prisma.orderItem.aggregate({
      where: {
        order: {
          status: "PENDING",
          createdAt: { gte: startDate }
        }
      },
      _sum: { quantity: true }
    }),
    prisma.orderItem.aggregate({
      where: {
        order: {
          status: "DELIVERED",
          createdAt: { gte: startDate }
        }
      },
      _sum: { quantity: true }
    }),
    prisma.orderItem.aggregate({
      where: {
        order: {
          status: "CANCELLED",
          createdAt: { gte: startDate }
        }
      },
      _sum: { quantity: true }
    }),
    prisma.purchase.aggregate({
      where: { createdAt: { gte: startDate } },
      _sum: { totalAmount: true }
    }),
    prisma.order.findMany({
      where: {
        status: "DELIVERED",
        createdAt: { gte: startDate }
      },
      select: {
        createdAt: true,
        items: {
          select: {
            productId: true,
            price: true,
            quantity: true,
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
                mediaAssets: {
                  orderBy: { sortOrder: "asc" },
                  take: 1
                }
              }
            }
          }
        }
      }
    }),
    prisma.order.findMany({
      where: {
        status: "CANCELLED",
        createdAt: { gte: startDate }
      },
      select: {
        items: {
          select: {
            price: true,
            quantity: true
          }
        }
      }
    }),
    prisma.purchase.findMany({
      where: { createdAt: { gte: startDate } },
      select: {
        createdAt: true,
        totalAmount: true
      }
    }),
    prisma.order.groupBy({
      by: ["createdById"],
      where: {
        createdById: { not: null },
        createdAt: { gte: startDate }
      },
      _count: {
        id: true
      },
      orderBy: {
        _count: {
          id: "desc"
        }
      },
      take: 3
    }),
    prisma.order.findMany({
      where: { createdAt: { gte: startDate } },
      orderBy: { createdAt: "desc" },
      take: 5,
      include: {
        items: { include: { product: true, variant: true } },
        createdBy: true
      }
    })
  ]);

  // Extract Quantity-based metrics
  const currentStockCount = stockSum._sum.availableQuantity || 0;
  const pendingOrderQty = pendingQtySum._sum.quantity || 0;
  const deliveredProductQty = deliveredQtySum._sum.quantity || 0;
  const cancelProductQty = cancelledQtySum._sum.quantity || 0;

  // Financial and best-seller calculations from selective datasets
  let totalSaleAmount = 0;
  let totalProfit = 0;
  const productSalesMap = new Map<string, {name: string, sold: number, revenue: number, image: string}>();

  deliveredOrders.forEach((order) => {
    order.items.forEach((item: any) => {
      const sale = item.price * item.quantity;
      const costPrice = item.variant?.pricingMatrix?.costPrice
        ? Number(item.variant.pricingMatrix.costPrice)
        : 0;
      const cost = costPrice * item.quantity;
      totalSaleAmount += sale;
      totalProfit += (sale - cost);

      const existing = productSalesMap.get(item.productId);
      if (existing) {
        existing.sold += item.quantity;
        existing.revenue += sale;
      } else {
        const imageUrl = item.product?.mediaAssets?.[0]?.url || "";
        productSalesMap.set(item.productId, {
          name: item.product?.name || "Unknown Product",
          sold: item.quantity,
          revenue: sale,
          image: imageUrl
        });
      }
    });
  });

  const topProducts = Array.from(productSalesMap.values())
    .sort((a, b) => b.sold - a.sold)
    .slice(0, 5);

  const totalPurchaseAmount = purchasesAggregate._sum.totalAmount || 0;

  const totalCancelAmount = cancelledOrders.reduce(
    (acc, o) => acc + o.items.reduce((sum, item) => sum + item.price * item.quantity, 0),
    0
  );

  // Fetch top performing staff profiles concurrently
  const topStaffIds = staffPerformance.map(sp => sp.createdById).filter(Boolean) as string[];
  const staffMembers = await prisma.staff.findMany({
    where: { id: { in: topStaffIds } },
    select: { id: true, username: true, email: true }
  });

  const topStaff = staffPerformance.map(sp => {
    const member = staffMembers.find(m => m.id === sp.createdById);
    return {
      username: member?.username || "Unknown Staff",
      email: member?.email || "",
      orderCount: sp._count.id
    };
  });

  // ── Chart Data Buckets ──
  const chartData: { name: string, revenue: number, sales: number }[] = [];

  if (filter === "weekly" || filter === "monthly") {
    const buckets = new Map<string, { revenue: number, purchases: number }>();
    let curr = new Date(startDate);
    while (curr <= now) {
      buckets.set(curr.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), { revenue: 0, purchases: 0 });
      curr.setDate(curr.getDate() + 1);
    }
    
    deliveredOrders.forEach(o => {
      const key = o.createdAt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      const b = buckets.get(key) || { revenue: 0, purchases: 0 };
      const itemsTotal = o.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      const itemsCost = o.items.reduce((sum, item: any) => {
        const costPrice = item.variant?.pricingMatrix?.costPrice
          ? Number(item.variant.pricingMatrix.costPrice)
          : 0;
        return sum + (costPrice * item.quantity);
      }, 0);
      b.revenue += (itemsTotal - itemsCost);
      buckets.set(key, b);
    });

    chartPurchases.forEach(p => {
      const key = p.createdAt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      const b = buckets.get(key) || { revenue: 0, purchases: 0 };
      b.purchases += p.totalAmount;
      buckets.set(key, b);
    });

    buckets.forEach((v, k) => chartData.push({ name: k, revenue: v.revenue, sales: v.purchases }));
  } else {
    const buckets = new Map<string, { revenue: number, purchases: number }>();
    if (filter === "yearly") {
      for (let i = 11; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        buckets.set(d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }), { revenue: 0, purchases: 0 });
      }
    }
    
    deliveredOrders.forEach(o => {
      const key = o.createdAt.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
      const b = buckets.get(key) || { revenue: 0, purchases: 0 };
      const itemsTotal = o.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      const itemsCost = o.items.reduce((sum, item: any) => {
        const costPrice = item.variant?.pricingMatrix?.costPrice
          ? Number(item.variant.pricingMatrix.costPrice)
          : 0;
        return sum + (costPrice * item.quantity);
      }, 0);
      b.revenue += (itemsTotal - itemsCost);
      buckets.set(key, b);
    });

    chartPurchases.forEach(p => {
      const key = p.createdAt.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
      const b = buckets.get(key) || { revenue: 0, purchases: 0 };
      b.purchases += p.totalAmount;
      buckets.set(key, b);
    });

    buckets.forEach((v, k) => chartData.push({ name: k, revenue: v.revenue, sales: v.purchases }));
    if (filter === "all") {
      chartData.sort((a, b) => new Date("01 " + a.name).getTime() - new Date("01 " + b.name).getTime());
    }
  }

  return (
    <DashboardClient 
      filter={filter}
      metrics={{
        currentStockCount,
        pendingOrderQty,
        deliveredProductQty,
        cancelProductQty,
        totalProfit,
        totalSaleAmount,
        totalPurchaseAmount,
        totalCancelAmount,
      }}
      topProducts={topProducts}
      recentOrders={recentOrders}
      chartData={chartData}
      topStaff={topStaff}
    />
  );
}
