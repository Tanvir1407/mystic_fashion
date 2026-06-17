import prisma from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import ProductAnalyticsClient from "./ProductAnalyticsClient";
import { Suspense } from "react";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const revalidate = 0;

export default async function ProductAnalyticsPage({ searchParams }: { searchParams: { filter?: string } }) {
  const session = await getSession();
  const canView = hasPermission(session, "VIEW", "PRODUCTS");

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
            You do not have permission to view product analytics. Please contact your administrator to assign permissions for your working area.
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

  // Fetch Inventory and DTF Printing Settings
  const [inventorySetting, dtfSetting] = await Promise.all([
    prisma.inventorySetting.findUnique({ where: { id: "default" } }),
    prisma.dTFPrintSetting.findUnique({ where: { id: "default" } })
  ]);
  const lowStockThreshold = inventorySetting?.lowStockThreshold ?? 5;
  const printCostPerUnit = dtfSetting?.printCost ?? 300;

  // Fetch active products and their variants for stock calculations
  const products = await prisma.product.findMany({
    where: { deletedAt: null },
    include: {
      variants: {
        include: {
          stocks: true,
          pricingMatrix: true
        }
      },
      categoryRel: { select: { name: true } },
      brand: { select: { name: true } }
    }
  });

  // Fetch current period orders
  const orders = await prisma.order.findMany({
    where: {
      createdAt: { gte: startDate },
      deletedAt: null,
    },
    include: {
      items: {
        include: {
          product: {
            select: {
              id: true,
              name: true,
              categoryId: true,
              categoryRel: { select: { name: true } },
              brandId: true,
              brand: { select: { name: true } }
            }
          },
          variant: {
            include: {
              pricingMatrix: {
                select: { costPrice: true }
              }
            }
          }
        }
      },
      salesReturns: {
        include: {
          variant: { include: { product: true } }
        }
      }
    },
    orderBy: { createdAt: "asc" }
  });

  // Fetch previous period orders for comparison
  const prevOrders = filter !== "all" ? await prisma.order.findMany({
    where: {
      createdAt: { gte: prevStartDate, lt: startDate },
      deletedAt: null,
    },
    include: {
      items: {
        include: {
          variant: {
            include: {
              pricingMatrix: {
                select: { costPrice: true }
              }
            }
          }
        }
      }
    }
  }) : [];

  // -------------------------------------------------------------
  // CALCULATING INVENTORY HEALTH (CURRENT ACTIVE STOCK)
  // -------------------------------------------------------------
  let totalStockValuation = 0;
  let totalStockQty = 0;
  let lowStockVariantsCount = 0;
  let outOfStockVariantsCount = 0;

  const inventoryHealthList: {
    id: string;
    name: string;
    category: string;
    brand: string;
    variants: { size: string; color: string; stock: number; sku: string | null }[];
    totalStock: number;
    valuation: number;
    status: "OUT_OF_STOCK" | "LOW_STOCK" | "HEALTHY";
  }[] = [];

  products.forEach(p => {
    let productStock = 0;
    const itemVariants: typeof inventoryHealthList[0]["variants"] = [];
    let productValuation = 0;

    p.variants.forEach(v => {
      const variantStock = v.stocks.reduce((sum, s) => sum + s.physicalQuantity, 0);
      productStock += variantStock;
      totalStockQty += variantStock;

      const variantCostPrice = v.pricingMatrix?.costPrice ? Number(v.pricingMatrix.costPrice) : (v.pricingMatrix?.basePrice ? Number(v.pricingMatrix.basePrice) * 0.6 : 0);
      const variantValuation = variantStock * variantCostPrice;
      totalStockValuation += variantValuation;
      productValuation += variantValuation;

      if (variantStock === 0) {
        outOfStockVariantsCount++;
      } else if (variantStock <= lowStockThreshold) {
        lowStockVariantsCount++;
      }

      itemVariants.push({
        size: v.size,
        color: v.color,
        stock: variantStock,
        sku: v.sku
      });
    });

    let status: "OUT_OF_STOCK" | "LOW_STOCK" | "HEALTHY" = "HEALTHY";
    if (productStock === 0) {
      status = "OUT_OF_STOCK";
    } else if (itemVariants.some(iv => iv.stock <= lowStockThreshold)) {
      status = "LOW_STOCK";
    }

    inventoryHealthList.push({
      id: p.id,
      name: p.name,
      category: p.categoryRel?.name || "Uncategorized",
      brand: p.brand?.name || "Unknown Brand",
      variants: itemVariants,
      totalStock: productStock,
      valuation: productValuation,
      status
    });
  });

  // Sort inventory list to show OOS/Low Stock first
  inventoryHealthList.sort((a, b) => {
    const statusPriority = { OUT_OF_STOCK: 0, LOW_STOCK: 1, HEALTHY: 2 };
    return statusPriority[a.status] - statusPriority[b.status] || a.totalStock - b.totalStock;
  });

  // -------------------------------------------------------------
  // CALCULATING SALES & PRODUCT PERFORMANCE KPIs (CURRENT PERIOD)
  // -------------------------------------------------------------
  let totalSoldQty = 0;
  let netRevenue = 0; // realized items sale price
  let totalCogs = 0;
  let totalProfit = 0;

  // Customization print metrics
  let customItemsCount = 0;
  let customRevenue = 0;
  let customCost = 0;

  // Sizes & Colors demand maps
  const sizeMap = new Map<string, number>();
  const colorMap = new Map<string, number>();

  // Aggregation maps
  const productPerformanceMap = new Map<string, {
    id: string;
    name: string;
    sold: number;
    revenue: number;
    cogs: number;
    profit: number;
    category: string;
    brand: string;
  }>();

  const categoryPerformanceMap = new Map<string, { name: string; sold: number; revenue: number; profit: number }>();
  const brandPerformanceMap = new Map<string, { name: string; sold: number; revenue: number; profit: number }>();

  // Return & Losses maps
  const returnPerformanceMap = new Map<string, {
    id: string;
    name: string;
    returnedQty: number;
    deliveryLoss: number;
    productLoss: number;
    printingLoss: number;
    returnCost: number;
    totalLoss: number;
  }>();

  orders.forEach(order => {
    const isDelivered = order.status === "DELIVERED";
    const isReturned = order.status === "RETURNED";

    // Process delivered orders for sales KPIs
    if (isDelivered) {
      order.items.forEach(item => {
        const itemSales = item.price * item.quantity;
        const purchasePrice = item.variant?.pricingMatrix?.costPrice ? Number(item.variant.pricingMatrix.costPrice) : (item.price * 0.6);
        const itemCost = purchasePrice * item.quantity;
        const itemProfit = itemSales - itemCost;

        totalSoldQty += item.quantity;
        netRevenue += itemSales;
        totalCogs += itemCost;

        // Customize print details
        if (item.requiresPrint || item.printCost > 0) {
          customItemsCount += item.quantity;
          customRevenue += (item.printCost * item.quantity);
          customCost += (printCostPerUnit * item.quantity);
        }

        // Aggregate sizes & colors
        const sz = item.variant?.size || "M";
        sizeMap.set(sz, (sizeMap.get(sz) || 0) + item.quantity);

        const col = item.product ? "Default" : "Default"; // Fallback/Default color identifier
        // Try to identify color from variants if possible, or fallback to Default
        colorMap.set(col, (colorMap.get(col) || 0) + item.quantity);

        // Group by product
        const pId = item.productId;
        const pName = item.product?.name || "Unknown Product";
        const pCategory = item.product?.categoryRel?.name || "Uncategorized";
        const pBrand = item.product?.brand?.name || "Unknown Brand";

        const existingProd = productPerformanceMap.get(pId);
        if (existingProd) {
          existingProd.sold += item.quantity;
          existingProd.revenue += itemSales;
          existingProd.cogs += itemCost;
          existingProd.profit += itemProfit;
        } else {
          productPerformanceMap.set(pId, {
            id: pId,
            name: pName,
            sold: item.quantity,
            revenue: itemSales,
            cogs: itemCost,
            profit: itemProfit,
            category: pCategory,
            brand: pBrand
          });
        }

        // Group by Category
        const existingCat = categoryPerformanceMap.get(pCategory);
        if (existingCat) {
          existingCat.sold += item.quantity;
          existingCat.revenue += itemSales;
          existingCat.profit += itemProfit;
        } else {
          categoryPerformanceMap.set(pCategory, {
            name: pCategory,
            sold: item.quantity,
            revenue: itemSales,
            profit: itemProfit
          });
        }

        // Group by Brand
        const existingBrand = brandPerformanceMap.get(pBrand);
        if (existingBrand) {
          existingBrand.sold += item.quantity;
          existingBrand.revenue += itemSales;
          existingBrand.profit += itemProfit;
        } else {
          brandPerformanceMap.set(pBrand, {
            name: pBrand,
            sold: item.quantity,
            revenue: itemSales,
            profit: itemProfit
          });
        }
      });
    }

    // Process return details & losses per product
    order.salesReturns.forEach(ret => {
      const pId = ret.variant.productId;
      const pName = ret.variant.product.name;
      const retQty = ret.quantity;
      const deliveryLoss = ret.deliveryLoss;
      const productLoss = ret.productLoss;
      const printingLoss = ret.printingLoss;
      const returnCost = ret.returnCost;
      const totalLoss = deliveryLoss + productLoss + printingLoss + returnCost;

      const existingRet = returnPerformanceMap.get(pId);
      if (existingRet) {
        existingRet.returnedQty += retQty;
        existingRet.deliveryLoss += deliveryLoss;
        existingRet.productLoss += productLoss;
        existingRet.printingLoss += printingLoss;
        existingRet.returnCost += returnCost;
        existingRet.totalLoss += totalLoss;
      } else {
        returnPerformanceMap.set(pId, {
          id: pId,
          name: pName,
          returnedQty: retQty,
          deliveryLoss,
          productLoss,
          printingLoss,
          returnCost,
          totalLoss
        });
      }
    });
  });

  totalProfit = netRevenue - totalCogs;
  const marginPercentage = netRevenue > 0 ? (totalProfit / netRevenue) * 100 : 0;

  // -------------------------------------------------------------
  // CALCULATING HISTORICAL TIMELINE DATA FOR CHART
  // -------------------------------------------------------------
  const chartData: { name: string; soldQty: number; revenue: number; profit: number }[] = [];
  const buckets = new Map<string, { soldQty: number; revenue: number; profit: number }>();

  if (filter === "weekly") {
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(now.getDate() - i);
      const key = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
      buckets.set(key, { soldQty: 0, revenue: 0, profit: 0 });
    }
  } else if (filter === "monthly") {
    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setDate(now.getDate() - i);
      const key = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
      buckets.set(key, { soldQty: 0, revenue: 0, profit: 0 });
    }
  } else if (filter === "yearly") {
    for (let i = 11; i >= 0; i--) {
      const d = new Date();
      d.setMonth(now.getMonth() - i);
      const key = d.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
      buckets.set(key, { soldQty: 0, revenue: 0, profit: 0 });
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
      key = order.createdAt.toLocaleDateString("en-US", { month: "short", year: "numeric" });
    }

    let b = buckets.get(key);
    if (!b) {
      b = { soldQty: 0, revenue: 0, profit: 0 };
      if (filter === "all") buckets.set(key, b);
    }

    if (b) {
      order.items.forEach(item => {
        const itemSales = item.price * item.quantity;
        const purchasePrice = item.variant?.pricingMatrix?.costPrice ? Number(item.variant.pricingMatrix.costPrice) : (item.price * 0.6);
        const itemCost = purchasePrice * item.quantity;

        b!.soldQty += item.quantity;
        b!.revenue += itemSales;
        b!.profit += (itemSales - itemCost);
      });
    }
  });

  buckets.forEach((v, k) => {
    chartData.push({
      name: k,
      soldQty: v.soldQty,
      revenue: Math.round(v.revenue),
      profit: Math.round(v.profit)
    });
  });

  if (filter === "all") {
    chartData.sort((a, b) => new Date(a.name).getTime() - new Date(b.name).getTime());
  }

  // -------------------------------------------------------------
  // PREVIOUS PERIOD COMPARISONS
  // -------------------------------------------------------------
  let prevSoldQty = 0;
  let prevRevenue = 0;
  let prevCogs = 0;
  let prevProfit = 0;

  prevOrders.forEach(order => {
    if (order.status === "DELIVERED") {
      order.items.forEach(item => {
        const purchasePrice = item.variant?.pricingMatrix?.costPrice ? Number(item.variant.pricingMatrix.costPrice) : (item.price * 0.6);
        prevSoldQty += item.quantity;
        prevRevenue += (item.price * item.quantity);
        prevCogs += (purchasePrice * item.quantity);
      });
    }
  });
  prevProfit = prevRevenue - prevCogs;

  // Formatting tables and rankings
  const topProducts = Array.from(productPerformanceMap.values())
    .sort((a, b) => b.sold - a.sold)
    .slice(0, 10);

  const categoriesStats = Array.from(categoryPerformanceMap.values())
    .sort((a, b) => b.revenue - a.revenue);

  const brandsStats = Array.from(brandPerformanceMap.values())
    .sort((a, b) => b.revenue - a.revenue);

  // Return metrics: attach sold quantity to calculate return rate
  const returnRateStats = Array.from(returnPerformanceMap.values())
    .map(ret => {
      const soldInfo = productPerformanceMap.get(ret.id);
      const totalSold = soldInfo?.sold || 0;
      const rate = totalSold + ret.returnedQty > 0 ? (ret.returnedQty / (totalSold + ret.returnedQty)) * 100 : 0;
      return {
        ...ret,
        soldQty: totalSold,
        returnRate: rate
      };
    })
    .sort((a, b) => b.returnRate - a.returnRate)
    .slice(0, 10);

  // Sizes & Colors stats formatted for UI list
  const sizesStats = Array.from(sizeMap.entries())
    .map(([size, quantity]) => ({ size, quantity }))
    .sort((a, b) => b.quantity - a.quantity);

  const colorsStats = Array.from(colorMap.entries())
    .map(([color, quantity]) => ({ color, quantity }))
    .sort((a, b) => b.quantity - a.quantity);

  return (
    <Suspense fallback={<div className="p-8 text-sm text-slate-500 font-medium animate-pulse">Loading product analytics dashboard...</div>}>
      <ProductAnalyticsClient
        filter={filter}
        summary={{
          totalSoldQty,
          prevSoldQty,
          netRevenue,
          prevRevenue,
          totalCogs,
          prevCogs,
          totalProfit,
          prevProfit,
          marginPercentage,
          totalStockValuation,
          totalStockQty,
          lowStockVariantsCount,
          outOfStockVariantsCount,
          customItemsCount,
          customRevenue,
          customCost,
          customProfit: customRevenue - customCost
        }}
        chartData={chartData}
        topProducts={topProducts}
        categoriesStats={categoriesStats}
        brandsStats={brandsStats}
        sizesStats={sizesStats}
        colorsStats={colorsStats}
        inventoryHealth={inventoryHealthList.slice(0, 20)} // Show top 20 reorder/problematic items first
        returnRateStats={returnRateStats}
      />
    </Suspense>
  );
}
