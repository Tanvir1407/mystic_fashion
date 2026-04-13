import { prisma } from "@/lib/prisma";
import DashboardClient from "./DashboardClient";

export const dynamic = "force-dynamic";

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

  // Fetch all data concurrently
  const [ordersInRange, allProducts, allPurchases] = await Promise.all([
    prisma.order.findMany({
      where: { createdAt: { gte: startDate } },
      include: { items: { include: { product: true } } }
    }),
    prisma.product.findMany({ include: { variants: true } }),
    prisma.purchase.findMany({ where: { createdAt: { gte: startDate } } })
  ]);

  // ── Row 1: Quantity-based metrics ──
  // Current stock count (absolute state, not time-filtered)
  let currentStockCount = 0;
  allProducts.forEach(p => p.variants.forEach(v => { currentStockCount += v.stock; }));

  // Pending order product qty (PENDING, CONFIRMED, PACKAGING — everything before SHIPPED)
  const pendingStatuses = ["PENDING", "CONFIRMED", "PACKAGING"];
  const pendingOrders = ordersInRange.filter(o => pendingStatuses.includes(o.status));
  const pendingOrderQty = pendingOrders.reduce((acc, o) => acc + o.items.reduce((s, i) => s + i.quantity, 0), 0);

  // Delivered product qty
  const deliveredOrders = ordersInRange.filter(o => o.status === "DELIVERED");
  const deliveredProductQty = deliveredOrders.reduce((acc, o) => acc + o.items.reduce((s, i) => s + i.quantity, 0), 0);

  // Cancelled order product qty
  const cancelledOrders = ordersInRange.filter(o => o.status === "CANCELLED");
  const cancelProductQty = cancelledOrders.reduce((acc, o) => acc + o.items.reduce((s, i) => s + i.quantity, 0), 0);

  // ── Row 2: Financial metrics ──
  const validOrders = ordersInRange.filter(o => o.status !== "CANCELLED");
  const totalRevenue = validOrders.reduce((acc, o) => acc + o.totalAmount, 0);
  const totalSaleAmount = deliveredOrders.reduce((acc, o) => acc + o.totalAmount, 0);
  const totalPurchaseAmount = allPurchases.reduce((acc, p) => acc + p.totalAmount, 0);
  const totalCancelAmount = cancelledOrders.reduce((acc, o) => acc + o.totalAmount, 0);

  // ── Top 5 Best Selling Products ──
  const productSalesMap = new Map<string, {name: string, sold: number, revenue: number, image: string}>();
  validOrders.forEach(order => {
    order.items.forEach(item => {
      const existing = productSalesMap.get(item.productId);
      if (existing) {
        existing.sold += item.quantity;
        existing.revenue += (item.price * item.quantity);
      } else {
        productSalesMap.set(item.productId, {
          name: item.product.name,
          sold: item.quantity,
          revenue: (item.price * item.quantity),
          image: item.product.images[0] || ""
        });
      }
    });
  });
  const topProducts = Array.from(productSalesMap.values()).sort((a, b) => b.sold - a.sold).slice(0, 5);

  // ── Recent Orders ──
  const recentOrders = ordersInRange
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .slice(0, 5);

  // ── Chart Data ──
  const chartData: { name: string, revenue: number, sales: number }[] = [];

  if (filter === "weekly" || filter === "monthly") {
    const buckets = new Map<string, { revenue: number, sales: number }>();
    let curr = new Date(startDate);
    while (curr <= now) {
      buckets.set(curr.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), { revenue: 0, sales: 0 });
      curr.setDate(curr.getDate() + 1);
    }
    ordersInRange.forEach(o => {
      const key = o.createdAt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      const b = buckets.get(key) || { revenue: 0, sales: 0 };
      if (o.status !== "CANCELLED") b.revenue += o.totalAmount;
      if (o.status === "DELIVERED") b.sales += o.totalAmount;
      buckets.set(key, b);
    });
    buckets.forEach((v, k) => chartData.push({ name: k, ...v }));
  } else {
    const buckets = new Map<string, { revenue: number, sales: number }>();
    if (filter === "yearly") {
      for (let i = 11; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        buckets.set(d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }), { revenue: 0, sales: 0 });
      }
    }
    ordersInRange.forEach(o => {
      const key = o.createdAt.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
      const b = buckets.get(key) || { revenue: 0, sales: 0 };
      if (o.status !== "CANCELLED") b.revenue += o.totalAmount;
      if (o.status === "DELIVERED") b.sales += o.totalAmount;
      buckets.set(key, b);
    });
    buckets.forEach((v, k) => chartData.push({ name: k, ...v }));
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
        totalRevenue,
        totalSaleAmount,
        totalPurchaseAmount,
        totalCancelAmount,
      }}
      topProducts={topProducts}
      recentOrders={recentOrders}
      chartData={chartData}
    />
  );
}
