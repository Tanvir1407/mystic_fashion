import prisma from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import OrderAnalyticsClient from "./OrderAnalyticsClient";
import { Suspense } from "react";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const revalidate = 0;

const DISTRICT_TO_DIVISION: Record<string, string> = {
  // Rangpur Division
  "dinajpur": "Rangpur",
  "gaibandha": "Rangpur",
  "kurigram": "Rangpur",
  "lalmonirhat": "Rangpur",
  "nilphamari": "Rangpur",
  "panchagarh": "Rangpur",
  "rangpur": "Rangpur",
  "thakurgaon": "Rangpur",

  // Rajshahi Division
  "bogra": "Rajshahi",
  "bogura": "Rajshahi",
  "joypurhat": "Rajshahi",
  "naogaon": "Rajshahi",
  "natore": "Rajshahi",
  "nawabganj": "Rajshahi",
  "chapainawabganj": "Rajshahi",
  "chapai nawabganj": "Rajshahi",
  "pabna": "Rajshahi",
  "rajshahi": "Rajshahi",
  "sirajganj": "Rajshahi",
  "sirajgong": "Rajshahi",

  // Mymensingh Division
  "jamalpur": "Mymensingh",
  "mymensingh": "Mymensingh",
  "netrokona": "Mymensingh",
  "sherpur": "Mymensingh",

  // Sylhet Division
  "habiganj": "Sylhet",
  "moulvibazar": "Sylhet",
  "sunamganj": "Sylhet",
  "sylhet": "Sylhet",

  // Dhaka Division
  "dhaka": "Dhaka",
  "faridpur": "Dhaka",
  "gazipur": "Dhaka",
  "gopalganj": "Dhaka",
  "kishoreganj": "Dhaka",
  "madaripur": "Dhaka",
  "manikganj": "Dhaka",
  "munshiganj": "Dhaka",
  "narayanganj": "Dhaka",
  "narsingdi": "Dhaka",
  "rajbari": "Dhaka",
  "shariatpur": "Dhaka",
  "tangail": "Dhaka",

  // Barishal Division
  "barguna": "Barishal",
  "barishal": "Barishal",
  "barisal": "Barishal",
  "bhola": "Barishal",
  "jhalokati": "Barishal",
  "jhalokathi": "Barishal",
  "patuakhali": "Barishal",
  "pirojpur": "Barishal",

  // Khulna Division
  "bagerhat": "Khulna",
  "chuadanga": "Khulna",
  "jessore": "Khulna",
  "jashore": "Khulna",
  "jhenaidah": "Khulna",
  "khulna": "Khulna",
  "kushtia": "Khulna",
  "magura": "Khulna",
  "meherpur": "Khulna",
  "narail": "Khulna",
  "satkhira": "Khulna",

  // Chittagong Division
  "bandarban": "Chittagong",
  "brahmanbaria": "Chittagong",
  "chandpur": "Chittagong",
  "chittagong": "Chittagong",
  "chattogram": "Chittagong",
  "comilla": "Chittagong",
  "cumilla": "Chittagong",
  "cox's bazar": "Chittagong",
  "coxs bazar": "Chittagong",
  "feni": "Chittagong",
  "khagrachhari": "Chittagong",
  "lakshmipur": "Chittagong",
  "laxmipur": "Chittagong",
  "noakhali": "Chittagong",
  "rangamati": "Chittagong"
};

export default async function OrderAnalyticsPage({ searchParams }: { searchParams: { filter?: string } }) {
  const session = await getSession();
  const canView = hasPermission(session, "VIEW", "ORDERS");

  if (!canView) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
        <div className="w-full max-w-md bg-white dark:bg-zinc-900 shadow-[0_4px_20px_rgba(0,0,0,0.05)] border border-slate-100 dark:border-zinc-800 rounded-xl p-8 md:p-10 text-center flex flex-col items-center">
          <div className="w-12 h-12 bg-[#800020]/5 rounded-full flex items-center justify-center mb-6">
            <svg className="w-5 h-5 text-[#800020]" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m0 0v2m0-2h2m-2 0H10m3-9a3 3 0 11-6 0 3 3 0 016 0zM21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight mb-3">Access Restricted</h2>
          <p className="text-sm text-slate-500 dark:text-zinc-400 mb-2 leading-relaxed max-w-xs font-normal">
            You do not have permission to view order analytics. Please contact your administrator to assign permissions for your working area.
          </p>
        </div>
      </div>
    );
  }

  const filter = searchParams?.filter || "weekly";
  const now = new Date();
  let startDate = new Date();
  let prevStartDate = new Date();
  let prevEndDate = new Date();

  if (filter === "weekly") {
    startDate.setDate(now.getDate() - 7);
    prevStartDate.setDate(now.getDate() - 14);
    prevEndDate.setDate(now.getDate() - 7);
  } else if (filter === "monthly") {
    startDate.setMonth(now.getMonth() - 1);
    prevStartDate.setMonth(now.getMonth() - 2);
    prevEndDate.setMonth(now.getMonth() - 1);
  } else if (filter === "yearly") {
    startDate.setFullYear(now.getFullYear() - 1);
    prevStartDate.setFullYear(now.getFullYear() - 2);
    prevEndDate.setFullYear(now.getFullYear() - 1);
  } else {
    // "all"
    startDate = new Date(0);
    prevStartDate = new Date(0);
    prevEndDate = new Date(0);
  }

  // Fetch current period orders
  const orders = await prisma.order.findMany({
    where: {
      createdAt: { gte: startDate },
      deletedAt: null,
    },
    include: {
      createdBy: {
        select: { username: true, email: true }
      },
      items: {
        include: {
          product: {
            select: { id: true, name: true, purchasePrice: true, categoryId: true, categoryRel: { select: { name: true } } }
          }
        }
      },
      salesReturns: true,
    },
    orderBy: { createdAt: "asc" }
  });

  // Fetch previous period orders for comparison (if not "all")
  const prevOrders = filter !== "all" ? await prisma.order.findMany({
    where: {
      createdAt: { gte: prevStartDate, lt: startDate },
      deletedAt: null,
    },
    include: {
      items: {
        include: {
          product: { select: { purchasePrice: true } }
        }
      },
      salesReturns: true,
    }
  }) : [];

  // Fetch recent return logs detailed list
  const recentReturns = await prisma.salesReturn.findMany({
    where: {
      createdAt: { gte: startDate },
    },
    include: {
      order: { select: { customerName: true, phone: true } },
      variant: { include: { product: true } }
    },
    orderBy: { createdAt: "desc" },
    take: 10,
  });

  // -------------------------------------------------------------
  // CALCULATING CORE KPIS (CURRENT PERIOD)
  // -------------------------------------------------------------
  let netSales = 0; // DELIVERED orders totalAmount
  let grossSales = 0; // Total sales of non-cancelled/non-returned orders
  let activeOrdersCount = 0;

  let totalCogs = 0;
  let totalProfit = 0;
  let totalDiscounts = 0;

  // Status counters
  const statusCounts: Record<string, number> = {};
  let returnedOrdersCount = 0;
  let cancelledOrdersCount = 0;

  // Return losses
  let totalReturnLoss = 0;
  let deliveryLossSum = 0;
  let productLossSum = 0;
  let printingLossSum = 0;
  let returnCostSum = 0;

  // eCommerce vs Salesman
  let ecommerceSales = 0;
  let ecommerceCount = 0;
  let salesmanSales = 0;
  let salesmanCount = 0;

  // Geographics
  const districtMap = new Map<string, { count: number; revenue: number }>();
  const divisionMetrics: Record<string, { count: number; revenue: number }> = {
    "Rangpur": { count: 0, revenue: 0 },
    "Rajshahi": { count: 0, revenue: 0 },
    "Khulna": { count: 0, revenue: 0 },
    "Barishal": { count: 0, revenue: 0 },
    "Chittagong": { count: 0, revenue: 0 },
    "Sylhet": { count: 0, revenue: 0 },
    "Mymensingh": { count: 0, revenue: 0 },
    "Dhaka": { count: 0, revenue: 0 }
  };
  // Products
  const productSalesMap = new Map<string, { id: string; name: string; sold: number; revenue: number; profit: number; cogs: number; category: string }>();
  // Staff
  const staffSalesMap = new Map<string, { username: string; email: string; orderCount: number; sales: number; commission: number }>();

  orders.forEach(order => {
    // Status counts
    statusCounts[order.status] = (statusCounts[order.status] || 0) + 1;
    if (order.status === "RETURNED") returnedOrdersCount++;
    if (order.status === "CANCELLED") cancelledOrdersCount++;

    // Channel contribution
    if (order.orderSource === "eCommerce") {
      ecommerceCount++;
      if (order.status !== "CANCELLED" && order.status !== "RETURNED") {
        ecommerceSales += order.totalAmount;
      }
    } else {
      salesmanCount++;
      if (order.status !== "CANCELLED" && order.status !== "RETURNED") {
        salesmanSales += order.totalAmount;
      }
    }

    // Process delivered orders for actual realized revenue and profit
    const isDelivered = order.status === "DELIVERED";
    const isActive = order.status !== "CANCELLED" && order.status !== "RETURNED";

    if (isActive) {
      grossSales += order.totalAmount;
      activeOrdersCount++;
    }

    if (isDelivered) {
      netSales += order.totalAmount;
      totalDiscounts += order.discountAmount;

      // Calculate COGS
      order.items.forEach(item => {
        const itemSales = item.price * item.quantity;
        const purchasePrice = item.product?.purchasePrice ?? (item.price * 0.6); // Smart business fallback
        const itemCost = purchasePrice * item.quantity;
        totalCogs += itemCost;

        // Group by product
        const pId = item.productId;
        const categoryName = item.product?.categoryRel?.name || "Uncategorized";
        const existingProd = productSalesMap.get(pId);
        if (existingProd) {
          existingProd.sold += item.quantity;
          existingProd.revenue += itemSales;
          existingProd.cogs += itemCost;
          existingProd.profit += (itemSales - itemCost);
        } else {
          productSalesMap.set(pId, {
            id: pId,
            name: item.product?.name || "Unknown Product",
            sold: item.quantity,
            revenue: itemSales,
            cogs: itemCost,
            profit: itemSales - itemCost,
            category: categoryName
          });
        }
      });

      // Group by district
      const dist = order.district || "Dhaka";
      const existingDist = districtMap.get(dist);
      if (existingDist) {
        existingDist.count++;
        existingDist.revenue += order.totalAmount;
      } else {
        districtMap.set(dist, { count: 1, revenue: order.totalAmount });
      }

      // Group by division
      const normalizedDist = dist.trim().toLowerCase();
      const divisionName = DISTRICT_TO_DIVISION[normalizedDist] || "Dhaka";
      divisionMetrics[divisionName].count++;
      divisionMetrics[divisionName].revenue += order.totalAmount;

      // Group by staff (Salesman)
      if (order.createdById && order.createdBy) {
        const staffId = order.createdById;
        const commRate = order.commissionRate || 0;
        const earnedComm = (order.totalAmount * commRate) / 100;

        const existingStaff = staffSalesMap.get(staffId);
        if (existingStaff) {
          existingStaff.orderCount++;
          existingStaff.sales += order.totalAmount;
          existingStaff.commission += earnedComm;
        } else {
          staffSalesMap.set(staffId, {
            username: order.createdBy.username,
            email: order.createdBy.email || "",
            orderCount: 1,
            sales: order.totalAmount,
            commission: earnedComm
          });
        }
      }
    }

    // Process return losses
    order.salesReturns.forEach(ret => {
      deliveryLossSum += ret.deliveryLoss;
      productLossSum += ret.productLoss;
      printingLossSum += ret.printingLoss;
      returnCostSum += ret.returnCost;
      totalReturnLoss += (ret.deliveryLoss + ret.productLoss + ret.printingLoss + ret.returnCost);
    });
  });

  // Calculate net profit
  totalProfit = netSales - totalCogs - totalDiscounts; // realized net margin
  const marginPercentage = netSales > 0 ? (totalProfit / netSales) * 100 : 0;
  const aov = activeOrdersCount > 0 ? (grossSales / activeOrdersCount) : 0;
  const returnRate = orders.length > 0 ? (returnedOrdersCount / orders.length) * 100 : 0;

  // -------------------------------------------------------------
  // CALCULATING CORE KPIS (PREVIOUS PERIOD)
  // -------------------------------------------------------------
  let prevNetSales = 0;
  let prevGrossSales = 0;
  let prevActiveCount = 0;
  let prevCogs = 0;
  let prevProfit = 0;
  let prevReturnLoss = 0;
  let prevReturnedCount = 0;

  prevOrders.forEach(order => {
    const isDelivered = order.status === "DELIVERED";
    const isActive = order.status !== "CANCELLED" && order.status !== "RETURNED";
    if (order.status === "RETURNED") prevReturnedCount++;

    if (isActive) {
      prevGrossSales += order.totalAmount;
      prevActiveCount++;
    }

    if (isDelivered) {
      prevNetSales += order.totalAmount;
      order.items.forEach(item => {
        const purchasePrice = item.product?.purchasePrice ?? (item.price * 0.6);
        prevCogs += (purchasePrice * item.quantity);
      });
    }

    order.salesReturns.forEach(ret => {
      prevReturnLoss += (ret.deliveryLoss + ret.productLoss + ret.printingLoss + ret.returnCost);
    });
  });

  prevProfit = prevNetSales - prevCogs;
  const prevAov = prevActiveCount > 0 ? (prevGrossSales / prevActiveCount) : 0;
  const prevReturnRate = prevOrders.length > 0 ? (prevReturnedCount / prevOrders.length) * 100 : 0;

  // -------------------------------------------------------------
  // CHART TIMELINE DATA GENERATION (TEMPORAL)
  // -------------------------------------------------------------
  const chartData: { name: string; revenue: number; cogs: number; profit: number; count: number }[] = [];
  const buckets = new Map<string, { revenue: number; cogs: number; profit: number; count: number }>();

  if (filter === "weekly") {
    // Generate last 7 days buckets
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(now.getDate() - i);
      const key = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
      buckets.set(key, { revenue: 0, cogs: 0, profit: 0, count: 0 });
    }
  } else if (filter === "monthly") {
    // Generate last 30 days buckets in steps
    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setDate(now.getDate() - i);
      const key = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
      buckets.set(key, { revenue: 0, cogs: 0, profit: 0, count: 0 });
    }
  } else if (filter === "yearly") {
    // Generate 12 months buckets
    for (let i = 11; i >= 0; i--) {
      const d = new Date();
      d.setMonth(now.getMonth() - i);
      const key = d.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
      buckets.set(key, { revenue: 0, cogs: 0, profit: 0, count: 0 });
    }
  }

  orders.forEach(order => {
    if (order.status !== "DELIVERED") return;

    let key = "";
    if (filter === "weekly" || filter === "monthly") {
      key = order.createdAt.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    } else if (filter === "yearly") {
      key = order.createdAt.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
    } else {
      // For "all time", bucket by year-month
      key = order.createdAt.toLocaleDateString("en-US", { month: "short", year: "numeric" });
    }

    let b = buckets.get(key);
    if (!b) {
      b = { revenue: 0, cogs: 0, profit: 0, count: 0 };
      if (filter === "all") buckets.set(key, b);
    }

    if (b) {
      b.revenue += order.totalAmount;
      b.count++;

      let orderCogs = 0;
      order.items.forEach(item => {
        const purchasePrice = item.product?.purchasePrice ?? (item.price * 0.6);
        orderCogs += (purchasePrice * item.quantity);
      });
      b.cogs += orderCogs;
      b.profit += (order.totalAmount - orderCogs);
    }
  });

  buckets.forEach((v, k) => {
    chartData.push({
      name: k,
      revenue: Math.round(v.revenue),
      cogs: Math.round(v.cogs),
      profit: Math.round(v.profit),
      count: v.count
    });
  });

  // Sort "all time" chronologically
  if (filter === "all") {
    chartData.sort((a, b) => {
      return new Date(a.name).getTime() - new Date(b.name).getTime();
    });
  }

  // Formatting Top Data
  const topProducts = Array.from(productSalesMap.values())
    .sort((a, b) => b.sold - a.sold)
    .slice(0, 5);

  const topDistricts = Array.from(districtMap.entries())
    .map(([name, val]) => ({ name, count: val.count, revenue: val.revenue }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5);

  const staffPerformance = Array.from(staffSalesMap.values())
    .sort((a, b) => b.sales - a.sales)
    .slice(0, 5);

  // -------------------------------------------------------------
  // CUSTOMER BEHAVIOR & RETENTION ANALYSIS
  // -------------------------------------------------------------
  const customerGroup = await prisma.order.groupBy({
    by: ['phone', 'customerName'],
    where: {
      deletedAt: null,
      status: 'DELIVERED',
    },
    _count: { id: true },
    _sum: { totalAmount: true }
  });

  const totalCustomers = customerGroup.length;
  const repeatCustomersCount = customerGroup.filter(c => (c._count?.id || 0) > 1).length;
  const repeatRate = totalCustomers > 0 ? (repeatCustomersCount / totalCustomers) * 100 : 0;

  // Average orders per customer
  const totalDeliveredOrders = customerGroup.reduce((sum, c) => sum + (c._count?.id || 0), 0);
  const avgOrdersPerCustomer = totalCustomers > 0 ? totalDeliveredOrders / totalCustomers : 0;

  // Customer Lifetime Value (Average Spend per customer)
  const totalDeliveredRevenue = customerGroup.reduce((sum, c) => sum + (c._sum?.totalAmount || 0), 0);
  const averageLTV = totalCustomers > 0 ? totalDeliveredRevenue / totalCustomers : 0;

  // Top 5 loyal customers (by orders)
  const topLoyalCustomers = [...customerGroup]
    .sort((a, b) => (b._count?.id || 0) - (a._count?.id || 0))
    .slice(0, 5)
    .map(c => ({
      name: c.customerName || "Anonymous",
      phone: c.phone,
      orders: c._count?.id || 0,
      spend: c._sum?.totalAmount || 0
    }));

  // Top 5 high-spenders (by revenue)
  const topSpenders = [...customerGroup]
    .sort((a, b) => (b._sum?.totalAmount || 0) - (a._sum?.totalAmount || 0))
    .slice(0, 5)
    .map(c => ({
      name: c.customerName || "Anonymous",
      phone: c.phone,
      orders: c._count?.id || 0,
      spend: c._sum?.totalAmount || 0
    }));

  // -------------------------------------------------------------
  // DISCOUNT & COUPON IMPACT ANALYSIS (CURRENT PERIOD)
  // -------------------------------------------------------------
  let couponOrdersCount = 0;
  let couponRevenue = 0;
  let couponDiscountTotal = 0;
  const couponStatsMap = new Map<string, { code: string; count: number; discount: number; revenue: number }>();

  orders.forEach(order => {
    const isDelivered = order.status === "DELIVERED";
    if (isDelivered && order.couponCode) {
      couponOrdersCount++;
      couponRevenue += order.totalAmount;
      couponDiscountTotal += order.discountAmount;

      const existing = couponStatsMap.get(order.couponCode);
      if (existing) {
        existing.count++;
        existing.discount += order.discountAmount;
        existing.revenue += order.totalAmount;
      } else {
        couponStatsMap.set(order.couponCode, {
          code: order.couponCode,
          count: 1,
          discount: order.discountAmount,
          revenue: order.totalAmount
        });
      }
    }
  });

  const manualDiscountTotal = Math.max(0, totalDiscounts - couponDiscountTotal);

  const couponSummary = Array.from(couponStatsMap.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  // -------------------------------------------------------------
  // HOURLY ORDER DISTRIBUTION (eCommerce vs Salesman)
  // -------------------------------------------------------------
  const hourlyData = Array.from({ length: 24 }, (_, hour) => {
    const ampm = hour >= 12 ? "PM" : "AM";
    const displayHour = hour % 12 === 0 ? 12 : hour % 12;
    const label = `${displayHour} ${ampm}`;
    return {
      hour,
      label,
      ecommerce: 0,
      salesman: 0,
    };
  });

  orders.forEach(order => {
    const hour = order.createdAt.getHours();
    if (order.orderSource === "eCommerce") {
      hourlyData[hour].ecommerce++;
    } else {
      hourlyData[hour].salesman++;
    }
  });

  return (
    <Suspense fallback={<div className="p-8 text-sm text-slate-500 font-medium animate-pulse">Loading analytics dashboard...</div>}>
      <OrderAnalyticsClient
        filter={filter}
        summary={{
          netSales,
          prevNetSales,
          grossSales,
          prevGrossSales,
          totalCogs,
          prevCogs,
          totalProfit,
          prevProfit,
          marginPercentage,
          aov,
          prevAov,
          returnRate,
          prevReturnRate,
          totalReturnLoss,
          prevReturnLoss,
          deliveryLoss: deliveryLossSum,
          productLoss: productLossSum,
          printingLoss: printingLossSum,
          returnCost: returnCostSum,
          ordersCount: orders.length,
          deliveredCount: orders.filter(o => o.status === 'DELIVERED').length,
          returnedCount: returnedOrdersCount,
          cancelledCount: cancelledOrdersCount
        }}
        chartData={chartData}
        statusCounts={statusCounts}
        topProducts={topProducts}
        topDistricts={topDistricts}
        divisionMetrics={divisionMetrics}
        staffPerformance={staffPerformance}
        channels={{
          ecommerceCount,
          ecommerceSales,
          salesmanCount,
          salesmanSales
        }}
        recentReturns={recentReturns as any}
        customerRetention={{
          totalCustomers,
          repeatCustomersCount,
          repeatRate,
          avgOrdersPerCustomer,
          averageLTV,
          topLoyalCustomers,
          topSpenders
        }}
        discountCouponImpact={{
          totalDiscounts,
          couponOrdersCount,
          couponRevenue,
          couponDiscountTotal,
          manualDiscountTotal,
          couponSummary
        }}
        hourlyData={hourlyData}
      />
    </Suspense>
  );
}
