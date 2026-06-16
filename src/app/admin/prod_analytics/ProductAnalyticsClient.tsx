"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  TrendingUp,
  DollarSign,
  Boxes,
  Percent,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  ShoppingBag,
  Activity,
  Printer,
  ChevronRight,
  AlertCircle,
  TrendingDown,
  Warehouse,
  Coins
} from "lucide-react";
import { formatBDT } from "@/utils/formatPrice";

interface SummaryMetrics {
  totalSoldQty: number;
  prevSoldQty: number;
  netRevenue: number;
  prevRevenue: number;
  totalCogs: number;
  prevCogs: number;
  totalProfit: number;
  prevProfit: number;
  marginPercentage: number;
  totalStockValuation: number;
  totalStockQty: number;
  lowStockVariantsCount: number;
  outOfStockVariantsCount: number;
  customItemsCount: number;
  customRevenue: number;
  customCost: number;
  customProfit: number;
}

interface ChartPoint {
  name: string;
  soldQty: number;
  revenue: number;
  profit: number;
}

interface ProductRank {
  id: string;
  name: string;
  sold: number;
  revenue: number;
  cogs: number;
  profit: number;
  category: string;
  brand: string;
}

interface CategoryRank {
  name: string;
  sold: number;
  revenue: number;
  profit: number;
}

interface BrandRank {
  name: string;
  sold: number;
  revenue: number;
  profit: number;
}

interface SizeRank {
  size: string;
  quantity: number;
}

interface ColorRank {
  color: string;
  quantity: number;
}

interface ReturnRateRank {
  id: string;
  name: string;
  returnedQty: number;
  soldQty: number;
  returnRate: number;
  deliveryLoss: number;
  productLoss: number;
  printingLoss: number;
  returnCost: number;
  totalLoss: number;
}

interface InventoryHealthItem {
  id: string;
  name: string;
  category: string;
  brand: string;
  variants: { size: string; color: string; stock: number; sku: string | null }[];
  totalStock: number;
  valuation: number;
  status: "OUT_OF_STOCK" | "LOW_STOCK" | "HEALTHY";
}

interface ProductAnalyticsClientProps {
  filter: string;
  summary: SummaryMetrics;
  chartData: ChartPoint[];
  topProducts: ProductRank[];
  categoriesStats: CategoryRank[];
  brandsStats: BrandRank[];
  sizesStats: SizeRank[];
  colorsStats: ColorRank[];
  inventoryHealth: InventoryHealthItem[];
  returnRateStats: ReturnRateRank[];
}

export default function ProductAnalyticsClient({
  filter,
  summary,
  chartData,
  topProducts,
  categoriesStats,
  brandsStats,
  sizesStats,
  colorsStats,
  inventoryHealth,
  returnRateStats
}: ProductAnalyticsClientProps) {
  const router = useRouter();

  const getRoundedTopBarPath = (x: number, y: number, w: number, h: number, r: number) => {
    if (h <= 0) return "";
    const realR = Math.min(r, h, w / 2);
    return `M ${x},${y + h} L ${x},${y + realR} A ${realR},${realR} 0 0 1 ${x + realR},${y} L ${x + w - realR},${y} A ${realR},${realR} 0 0 1 ${x + w},${y + realR} L ${x + w},${y + h} Z`;
  };

  // Chart toggles
  const [showRevenue, setShowRevenue] = useState(true);
  const [showProfit, setShowProfit] = useState(true);
  const [showSoldQty, setShowSoldQty] = useState(false);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  // Tab state for tables
  const [activeTab, setActiveTab] = useState<"top-selling" | "custom-prints" | "returns">("top-selling");

  // Growth calculations
  const getGrowth = (curr: number, prev: number) => {
    if (prev === 0) return curr > 0 ? 100 : 0;
    return ((curr - prev) / prev) * 100;
  };

  const soldQtyGrowth = getGrowth(summary.totalSoldQty, summary.prevSoldQty);
  const revenueGrowth = getGrowth(summary.netRevenue, summary.prevRevenue);
  const profitGrowth = getGrowth(summary.totalProfit, summary.prevProfit);

  // Chart setup
  const chartW = 900;
  const chartH = 300;
  const padX = 55;
  const padY = 25;

  const maxRevenueProfit = useMemo(() => {
    if (chartData.length === 0) return 1;
    const values: number[] = [];
    chartData.forEach(d => {
      if (showRevenue) values.push(d.revenue);
      if (showProfit) values.push(d.profit);
    });
    if (values.length === 0) return 1;
    return Math.max(...values, 1);
  }, [chartData, showRevenue, showProfit]);

  const maxSoldQty = useMemo(() => {
    if (chartData.length === 0) return 1;
    const values = chartData.map(d => d.soldQty);
    return Math.max(...values, 1);
  }, [chartData]);

  const yMax = maxRevenueProfit * 1.15;
  const yQtyMax = Math.max(Math.ceil(maxSoldQty * 1.15), 1);

  const totalCategoryRevenue = useMemo(() => categoriesStats.reduce((sum, c) => sum + c.revenue, 0), [categoriesStats]);
  const totalBrandRevenue = useMemo(() => brandsStats.reduce((sum, b) => sum + b.revenue, 0), [brandsStats]);

  const maxCategoryRevenue = useMemo(() => Math.max(...categoriesStats.map(c => c.revenue), 1), [categoriesStats]);
  const maxBrandRevenue = useMemo(() => Math.max(...brandsStats.map(b => b.revenue), 1), [brandsStats]);

  const formatCompactBDT = (val: number) => {
    const absVal = Math.abs(val);
    if (absVal >= 100000) return `৳${(absVal / 100000).toFixed(1)}L`;
    if (absVal >= 1000) return `৳${(absVal / 1000).toFixed(0)}k`;
    return `৳${Number(absVal.toFixed(2))}`;
  };

  const getBezierPath = (key: "revenue" | "profit") => {
    if (chartData.length === 0) return "";
    if (chartData.length === 1) {
      const y = chartH - padY - ((chartData[0][key] / yMax) * (chartH - padY * 2));
      return `M ${padX} ${y} L ${chartW - padX} ${y}`;
    }
    const step = (chartW - padX * 2) / (chartData.length - 1);
    const points = chartData.map((d, i) => {
      const x = padX + i * step;
      const y = chartH - padY - ((d[key] / yMax) * (chartH - padY * 2));
      return { x, y };
    });

    let d = `M ${points[0].x} ${points[0].y}`;
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[i];
      const p1 = points[i + 1];
      const cpX1 = p0.x + (p1.x - p0.x) / 3;
      const cpY1 = p0.y;
      const cpX2 = p0.x + 2 * (p1.x - p0.x) / 3;
      const cpY2 = p1.y;
      d += ` C ${cpX1} ${cpY1}, ${cpX2} ${cpY2}, ${p1.x} ${p1.y}`;
    }
    return d;
  };

  const getBezierAreaPath = (key: "revenue" | "profit") => {
    if (chartData.length === 0) return "";
    if (chartData.length === 1) {
      const y = chartH - padY - ((chartData[0][key] / yMax) * (chartH - padY * 2));
      return `M ${padX} ${chartH - padY} L ${padX} ${y} L ${chartW - padX} ${y} L ${chartW - padX} ${chartH - padY} Z`;
    }
    const step = (chartW - padX * 2) / (chartData.length - 1);
    const points = chartData.map((d, i) => {
      const x = padX + i * step;
      const y = chartH - padY - ((d[key] / yMax) * (chartH - padY * 2));
      return { x, y };
    });

    let d = `M ${points[0].x} ${chartH - padY} L ${points[0].x} ${points[0].y}`;
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[i];
      const p1 = points[i + 1];
      const cpX1 = p0.x + (p1.x - p0.x) / 3;
      const cpY1 = p0.y;
      const cpX2 = p0.x + 2 * (p1.x - p0.x) / 3;
      const cpY2 = p1.y;
      d += ` C ${cpX1} ${cpY1}, ${cpX2} ${cpY2}, ${p1.x} ${p1.y}`;
    }
    d += ` L ${points[points.length - 1].x} ${chartH - padY} Z`;
    return d;
  };

  const getBezierQtyPath = () => {
    if (chartData.length === 0) return "";
    if (chartData.length === 1) {
      const y = chartH - padY - ((chartData[0].soldQty / yQtyMax) * (chartH - padY * 2));
      return `M ${padX} ${y} L ${chartW - padX} ${y}`;
    }
    const step = (chartW - padX * 2) / (chartData.length - 1);
    const points = chartData.map((d, i) => {
      const x = padX + i * step;
      const y = chartH - padY - ((d.soldQty / yQtyMax) * (chartH - padY * 2));
      return { x, y };
    });

    let d = `M ${points[0].x} ${points[0].y}`;
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[i];
      const p1 = points[i + 1];
      const cpX1 = p0.x + (p1.x - p0.x) / 3;
      const cpY1 = p0.y;
      const cpX2 = p0.x + 2 * (p1.x - p0.x) / 3;
      const cpY2 = p1.y;
      d += ` C ${cpX1} ${cpY1}, ${cpX2} ${cpY2}, ${p1.x} ${p1.y}`;
    }
    return d;
  };

  const getBezierQtyAreaPath = () => {
    if (chartData.length === 0) return "";
    if (chartData.length === 1) {
      const y = chartH - padY - ((chartData[0].soldQty / yQtyMax) * (chartH - padY * 2));
      return `M ${padX} ${chartH - padY} L ${padX} ${y} L ${chartW - padX} ${y} L ${chartW - padX} ${chartH - padY} Z`;
    }
    const step = (chartW - padX * 2) / (chartData.length - 1);
    const points = chartData.map((d, i) => {
      const x = padX + i * step;
      const y = chartH - padY - ((d.soldQty / yQtyMax) * (chartH - padY * 2));
      return { x, y };
    });

    let d = `M ${points[0].x} ${chartH - padY} L ${points[0].x} ${points[0].y}`;
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[i];
      const p1 = points[i + 1];
      const cpX1 = p0.x + (p1.x - p0.x) / 3;
      const cpY1 = p0.y;
      const cpX2 = p0.x + 2 * (p1.x - p0.x) / 3;
      const cpY2 = p1.y;
      d += ` C ${cpX1} ${cpY1}, ${cpX2} ${cpY2}, ${p1.x} ${p1.y}`;
    }
    d += ` L ${points[points.length - 1].x} ${chartH - padY} Z`;
    return d;
  };

  const renderTrendTag = (val: number, label = "%", isInverse = false) => {
    if (filter === "all") return null;
    const isZero = val === 0;
    const isUp = val > 0;
    const isSuccess = isInverse ? !isUp : isUp;

    return (
      <span className={`inline-flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-md ${
        isZero ? "bg-slate-100 text-slate-500" :
        isSuccess ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "bg-rose-500/10 text-rose-600 dark:text-rose-400"
      }`}>
        {isZero ? null : isUp ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
        {isZero ? "0%" : `${Math.abs(val).toFixed(1)}${label}`}
      </span>
    );
  };

  // Find max size sold to scale progress bars
  const maxSizeQty = useMemo(() => {
    if (sizesStats.length === 0) return 1;
    return Math.max(...sizesStats.map(s => s.quantity), 1);
  }, [sizesStats]);

  return (
    <div className="flex flex-col gap-6 pb-12">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <Activity className="w-6 h-6 text-[#800020]" />
            Product Analytics
          </h1>
          <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">Real-time database product sales, inventory values, and return metrics.</p>
        </div>

        {/* Date Filter Pills */}
        <div className="inline-flex bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 p-0.5 rounded-xl shadow-sm">
          {[
            { label: "Weekly", value: "weekly" },
            { label: "Monthly", value: "monthly" },
            { label: "Yearly", value: "yearly" },
            { label: "All Time", value: "all" },
          ].map(f => (
            <button
              key={f.value}
              onClick={() => router.push(`/admin/prod_analytics?filter=${f.value}`)}
              className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${
                filter === f.value
                  ? "bg-slate-900 text-white dark:bg-zinc-800 shadow"
                  : "text-slate-500 hover:text-slate-800 dark:hover:text-zinc-200"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Sold Qty Card */}
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200/80 dark:border-zinc-800/80 p-5 shadow-[0_1px_3px_rgba(0,0,0,0.03)] flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider">Total Sold Quantity</span>
            <div className="w-8 h-8 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <ShoppingBag className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-end justify-between">
            <div className="flex flex-col">
              <span className="text-xl font-extrabold text-slate-900 dark:text-white leading-tight">
                {summary.totalSoldQty.toLocaleString()} units
              </span>
              <span className="text-[10px] text-slate-400 dark:text-zinc-500 mt-1">
                Custom Printed: {summary.customItemsCount} units
              </span>
            </div>
            {renderTrendTag(soldQtyGrowth)}
          </div>
        </div>

        {/* Revenue Card */}
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200/80 dark:border-zinc-800/80 p-5 shadow-[0_1px_3px_rgba(0,0,0,0.03)] flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider">Net Product Revenue</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-end justify-between">
            <div className="flex flex-col">
              <span className="text-xl font-extrabold text-slate-900 dark:text-white leading-tight">
                {formatBDT(summary.netRevenue)}
              </span>
              <span className="text-[10px] text-slate-400 dark:text-zinc-500 mt-1">
                Print Revenue: {formatBDT(summary.customRevenue)}
              </span>
            </div>
            {renderTrendTag(revenueGrowth)}
          </div>
        </div>

        {/* Profit Card */}
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200/80 dark:border-zinc-800/80 p-5 shadow-[0_1px_3px_rgba(0,0,0,0.03)] flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider">Gross Profit (Margin)</span>
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <Percent className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-end justify-between">
            <div className="flex flex-col">
              <span className="text-xl font-extrabold text-slate-900 dark:text-white leading-tight">
                {formatBDT(summary.totalProfit)}
              </span>
              <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 mt-1 flex items-center gap-1">
                Margin: {summary.marginPercentage.toFixed(1)}%
              </span>
            </div>
            {renderTrendTag(profitGrowth)}
          </div>
        </div>

        {/* Stock Valuation Card */}
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200/80 dark:border-zinc-800/80 p-5 shadow-[0_1px_3px_rgba(0,0,0,0.03)] flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider">Total Stock Valuation</span>
            <div className="w-8 h-8 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center">
              <Warehouse className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-end justify-between">
            <div className="flex flex-col">
              <span className="text-xl font-extrabold text-slate-900 dark:text-white leading-tight">
                {formatBDT(summary.totalStockValuation)}
              </span>
              <span className="text-[10px] font-semibold text-slate-500 mt-1">
                Total Stock: {summary.totalStockQty.toLocaleString()} units
              </span>
            </div>
            <div className="flex flex-col items-end gap-1">
              {summary.outOfStockVariantsCount > 0 && (
                <span className="text-[9px] font-bold text-rose-600 bg-rose-100 dark:bg-rose-950/40 px-1 py-0.5 rounded">
                  {summary.outOfStockVariantsCount} OOS
                </span>
              )}
              {summary.lowStockVariantsCount > 0 && (
                <span className="text-[9px] font-bold text-amber-600 bg-amber-100 dark:bg-amber-950/40 px-1 py-0.5 rounded">
                  {summary.lowStockVariantsCount} Low
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Charts & Side Metrics Section */}
      <div className="grid grid-cols-1 lg:grid-cols-7 gap-4">
        {/* Trend Spline Chart */}
        <div className="lg:col-span-5 bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200/80 dark:border-zinc-800/80 p-6 shadow-sm flex flex-col gap-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 dark:border-zinc-800 pb-4">
            <div>
              <h2 className="text-sm font-extrabold text-slate-900 dark:text-white">Product Revenue & Sales Trends</h2>
              <p className="text-[10px] text-slate-400 dark:text-zinc-500 mt-0.5">Visual representation of customer product demand flow.</p>
            </div>

            {/* Series Toggles */}
            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={() => setShowRevenue(!showRevenue)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                  showRevenue
                    ? "bg-indigo-50 text-indigo-600 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-400 dark:border-indigo-800"
                    : "bg-slate-50 text-slate-400 border-slate-200 dark:bg-zinc-800/40 dark:text-zinc-600 dark:border-zinc-800"
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${showRevenue ? "bg-indigo-500" : "bg-slate-300 dark:bg-zinc-600"}`} />
                Net Sales
              </button>
              <button
                onClick={() => setShowProfit(!showProfit)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                  showProfit
                    ? "bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800"
                    : "bg-slate-50 text-slate-400 border-slate-200 dark:bg-zinc-800/40 dark:text-zinc-600 dark:border-zinc-800"
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${showProfit ? "bg-emerald-500" : "bg-slate-300 dark:bg-zinc-600"}`} />
                Net Profit
              </button>
              <button
                onClick={() => setShowSoldQty(!showSoldQty)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                  showSoldQty
                    ? "bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800"
                    : "bg-slate-50 text-slate-400 border-slate-200 dark:bg-zinc-800/40 dark:text-zinc-600 dark:border-zinc-800"
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${showSoldQty ? "bg-amber-500" : "bg-slate-300 dark:bg-zinc-600"}`} />
                Quantity Sold
              </button>
            </div>
          </div>

          {chartData.length === 0 ? (
            <div className="h-64 flex items-center justify-center text-xs text-slate-400 font-semibold">
              No sales records found for this period.
            </div>
          ) : (
            <div className="relative">
              {/* Y Gridlines and Labels */}
              <div className="absolute inset-0 flex flex-col justify-between pointer-events-none" style={{ padding: `${padY}px 0`, bottom: `${padY}px` }}>
                {[1.0, 0.75, 0.5, 0.25, 0].map((ratio, i) => {
                  const val = yMax * ratio;
                  const qtyVal = yQtyMax * ratio;
                  return (
                    <div key={i} className="w-full flex items-center relative">
                      <div className="flex-1 border-t border-dashed border-slate-100 dark:border-zinc-800" style={{ marginLeft: `${padX}px`, marginRight: showSoldQty ? `${padX}px` : "0px" }}></div>
                      <span className="absolute left-0 text-[9px] font-black text-slate-400 dark:text-zinc-600 text-right pr-2" style={{ width: `${padX}px`, transform: "translateY(-50%)" }}>
                        {formatCompactBDT(val)}
                      </span>
                      {showSoldQty && (
                        <span className="absolute right-0 text-[9px] font-black text-amber-500 text-left pl-2" style={{ width: `${padX}px`, transform: "translateY(-50%)" }}>
                          {Math.round(qtyVal)}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* SVG Curve Graphics */}
              <svg viewBox={`0 0 ${chartW} ${chartH}`} className="w-full h-72 relative z-10 overflow-visible" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#6366f1" stopOpacity="0.22" />
                    <stop offset="100%" stopColor="#6366f1" stopOpacity="0.0" />
                  </linearGradient>
                  <linearGradient id="profitGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" stopOpacity="0.22" />
                    <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
                  </linearGradient>
                  <linearGradient id="qtyGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.15" />
                    <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.0" />
                  </linearGradient>
                </defs>

                {/* Vertical Guides on Hover */}
                {chartData.map((_, i) => {
                  if (chartData.length <= 1) return null;
                  const step = (chartW - padX * (showSoldQty ? 2 : 1) - padX) / (chartData.length - 1);
                  const x = padX + i * step;
                  return (
                    <line
                      key={`vline-${i}`}
                      x1={x}
                      y1={padY}
                      x2={x}
                      y2={chartH - padY}
                      stroke="#e2e8f0"
                      strokeWidth="1.5"
                      strokeDasharray="4 4"
                      className="transition-opacity duration-150 dark:stroke-zinc-800"
                      style={{ opacity: hoveredIndex === i ? 1 : 0.2 }}
                    />
                  );
                })}

                {/* Areas */}
                {showRevenue && <path d={getBezierAreaPath("revenue")} fill="url(#salesGrad)" className="transition-all duration-300" />}
                {showProfit && <path d={getBezierAreaPath("profit")} fill="url(#profitGrad)" className="transition-all duration-300" />}
                {showSoldQty && <path d={getBezierQtyAreaPath()} fill="url(#qtyGrad)" className="transition-all duration-300" />}

                {/* Curves */}
                {showRevenue && (
                  <path
                    d={getBezierPath("revenue")}
                    fill="none"
                    stroke="#6366f1"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                )}
                {showProfit && (
                  <path
                    d={getBezierPath("profit")}
                    fill="none"
                    stroke="#10b981"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                )}
                {showSoldQty && (
                  <path
                    d={getBezierQtyPath()}
                    fill="none"
                    stroke="#f59e0b"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                )}

                {/* Circles Markers */}
                {chartData.map((d, i) => {
                  const step = (chartW - padX * (showSoldQty ? 2 : 1) - padX) / (chartData.length - 1);
                  const x = padX + i * step;
                  const yRev = chartH - padY - ((d.revenue / yMax) * (chartH - padY * 2));
                  const yProf = chartH - padY - ((d.profit / yMax) * (chartH - padY * 2));
                  const yQty = chartH - padY - ((d.soldQty / yQtyMax) * (chartH - padY * 2));

                  const isHovered = hoveredIndex === i;

                  return (
                    <g key={i}>
                      {showRevenue && (
                        <circle
                          cx={x}
                          cy={yRev}
                          r={isHovered ? "6" : "3.5"}
                          fill="#ffffff"
                          stroke="#6366f1"
                          strokeWidth={isHovered ? "3" : "1.5"}
                        />
                      )}
                      {showProfit && (
                        <circle
                          cx={x}
                          cy={yProf}
                          r={isHovered ? "6" : "3.5"}
                          fill="#ffffff"
                          stroke="#10b981"
                          strokeWidth={isHovered ? "3" : "1.5"}
                        />
                      )}
                      {showSoldQty && (
                        <circle
                          cx={x}
                          cy={yQty}
                          r={isHovered ? "6" : "3.5"}
                          fill="#ffffff"
                          stroke="#f59e0b"
                          strokeWidth={isHovered ? "3" : "1.5"}
                        />
                      )}
                    </g>
                  );
                })}
              </svg>

              {/* X Axis Labels */}
              <div className="flex justify-between mt-3 px-1" style={{ paddingLeft: `${padX}px`, paddingRight: showSoldQty ? `${padX}px` : `${padX - 10}px` }}>
                {chartData.map((d, i) => {
                  const showLabel = i % Math.ceil(chartData.length / 8) === 0 || chartData.length <= 12;
                  return (
                    <span
                      key={i}
                      className={`text-[9px] font-bold text-slate-400 dark:text-zinc-500 transition-colors duration-200 ${
                        hoveredIndex === i ? "text-slate-900 font-extrabold dark:text-zinc-200" : ""
                      }`}
                      style={{
                        width: "0",
                        whiteSpace: "nowrap",
                        display: "flex",
                        justifyContent: "center",
                        transform: "translateX(-50%)",
                        visibility: showLabel ? "visible" : "hidden",
                      }}
                    >
                      {d.name}
                    </span>
                  );
                })}
              </div>

              {/* Hover listeners */}
              <div className="absolute inset-0 flex z-30" style={{ left: `${padX}px`, right: showSoldQty ? `${padX}px` : "0px", bottom: `${padY}px`, top: `${padY}px` }}>
                {chartData.map((d, i) => (
                  <div
                    key={i}
                    className="flex-1 h-full cursor-crosshair"
                    onMouseEnter={() => setHoveredIndex(i)}
                    onMouseLeave={() => setHoveredIndex(null)}
                  />
                ))}
              </div>

              {/* Tooltip */}
              {hoveredIndex !== null && (
                <div
                  className="absolute z-40 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md rounded-2xl border border-slate-200/90 dark:border-zinc-800/90 p-4 shadow-xl pointer-events-none flex flex-col gap-2 transition-all duration-200"
                  style={{
                    left: `${padX + (hoveredIndex / (chartData.length - 1)) * (chartW - padX * (showSoldQty ? 2 : 1) - padX) * 100 / chartW}%`,
                    transform: `translate(${hoveredIndex < chartData.length / 2 ? "16px" : "-108%"}, -50%)`,
                    top: "45%",
                    minWidth: "220px",
                  }}
                >
                  <div className="flex items-center justify-between border-b border-slate-100 dark:border-zinc-800 pb-1.5">
                    <span className="text-[10px] font-black text-slate-400 dark:text-zinc-500 uppercase tracking-widest">
                      {chartData[hoveredIndex].name}
                    </span>
                  </div>

                  {showRevenue && (
                    <div className="flex items-center justify-between text-xs mt-1">
                      <span className="text-slate-500 font-semibold flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                        Net Revenue:
                      </span>
                      <span className="font-extrabold text-indigo-600 dark:text-indigo-400">
                        {formatBDT(chartData[hoveredIndex].revenue)}
                      </span>
                    </div>
                  )}

                  {showProfit && (
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500 font-semibold flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        Net Profit:
                      </span>
                      <span className="font-extrabold text-emerald-600 dark:text-emerald-400">
                        {formatBDT(chartData[hoveredIndex].profit)}
                      </span>
                    </div>
                  )}

                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500 font-semibold flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                      Sold Units:
                    </span>
                    <span className="font-extrabold text-amber-600 dark:text-amber-400">
                      {chartData[hoveredIndex].soldQty} units
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Size & Color Demand Breakdown */}
        <div className="lg:col-span-2 bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200/80 dark:border-zinc-800/80 p-6 shadow-sm flex flex-col gap-6">
          <div>
            <h2 className="text-sm font-extrabold text-slate-900 dark:text-white">Demand Analysis</h2>
            <p className="text-[10px] text-slate-400 dark:text-zinc-500 mt-0.5">Understanding sizing and color preferences to plan inventory.</p>
          </div>

          <div className="flex flex-col gap-5">
            {/* Size Bars */}
            <div className="flex flex-col gap-3">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Sizes Sold</h3>
              {sizesStats.length === 0 ? (
                <p className="text-xs text-slate-400 font-medium">No sizes records found.</p>
              ) : (
                <div className="flex flex-col gap-2.5">
                  {sizesStats.slice(0, 5).map(s => {
                    const percentage = (s.quantity / maxSizeQty) * 100;
                    return (
                      <div key={s.size} className="flex flex-col gap-1">
                        <div className="flex items-center justify-between text-xs font-bold">
                          <span className="text-slate-700 dark:text-zinc-300">Size {s.size}</span>
                          <span className="text-slate-950 dark:text-white">{s.quantity} units</span>
                        </div>
                        <div className="w-full bg-slate-100 dark:bg-zinc-800 h-2 rounded-full overflow-hidden">
                          <div className="bg-[#800020] h-full rounded-full transition-all duration-500" style={{ width: `${percentage}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Colors distribution */}
            <div className="flex flex-col gap-3 border-t border-slate-100 dark:border-zinc-800 pt-4">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Colors Sold</h3>
              {colorsStats.length === 0 ? (
                <p className="text-xs text-slate-400 font-medium">No color records found.</p>
              ) : (
                <div className="flex flex-col gap-2.5">
                  {colorsStats.slice(0, 5).map(c => (
                    <div key={c.color} className="flex items-center justify-between text-xs border-b border-slate-50 dark:border-zinc-800/40 pb-1.5 last:border-0">
                      <span className="text-slate-600 dark:text-zinc-400 flex items-center gap-2 font-semibold">
                        <span className="w-2.5 h-2.5 rounded-full border border-slate-200" style={{ backgroundColor: c.color === 'Default' ? '#cbd5e1' : c.color }} />
                        {c.color}
                      </span>
                      <span className="font-extrabold text-slate-900 dark:text-white">{c.quantity} units</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Categories & Brands grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Categories Performance */}
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200/80 dark:border-zinc-800/80 p-6 shadow-sm flex flex-col gap-6">
          <div>
            <h2 className="text-sm font-extrabold text-slate-900 dark:text-white">Category Share Chart</h2>
            <p className="text-[10px] text-slate-400 dark:text-zinc-500 mt-0.5">Revenue contribution comparison per product category.</p>
          </div>

          {categoriesStats.length === 0 ? (
            <div className="h-40 flex items-center justify-center text-xs text-slate-400 font-semibold">
              No category sales records found.
            </div>
          ) : (
            <div className="flex flex-col gap-6">
              {/* Vertical SVG Bar Chart */}
              <div className="relative">
                {/* Y Gridlines and Ticks */}
                <div className="absolute inset-0 flex flex-col justify-between pointer-events-none" style={{ padding: "10px 0 25px 0" }}>
                  {[1.0, 0.66, 0.33, 0].map((ratio, idx) => {
                    const gridVal = maxCategoryRevenue * ratio;
                    return (
                      <div key={idx} className="w-full flex items-center relative">
                        <div className="flex-1 border-t border-dashed border-slate-100 dark:border-zinc-850" style={{ marginLeft: "45px" }}></div>
                        <span className="absolute left-0 text-[8px] font-black text-slate-400 dark:text-zinc-650 text-right pr-2" style={{ width: "45px", transform: "translateY(-50%)" }}>
                          {formatCompactBDT(gridVal)}
                        </span>
                      </div>
                    );
                  })}
                </div>

                <svg viewBox="0 0 500 180" className="w-full h-44 relative z-10 overflow-visible">
                  <defs>
                    <linearGradient id="catBarGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#6366f1" />
                      <stop offset="100%" stopColor="#4f46e5" />
                    </linearGradient>
                  </defs>

                  {/* Drawing the Bars */}
                  {categoriesStats.slice(0, 8).map((c, idx) => {
                    const totalBars = Math.min(categoriesStats.length, 8);
                    const step = 440 / totalBars;
                    const barWidth = step * 0.45;
                    const x = 45 + idx * step + (step - barWidth) / 2;
                    const height = (c.revenue / maxCategoryRevenue) * 145;
                    const y = 180 - 25 - height;

                    return (
                      <g key={`cat-bar-${idx}`} className="group/bar">
                        <path
                          d={getRoundedTopBarPath(x, y, barWidth, height, 4)}
                          fill="url(#catBarGrad)"
                          className="opacity-90 hover:opacity-100 transition-opacity duration-200 cursor-pointer"
                        />
                        {/* Label on top of bar on hover */}
                        <text
                          x={x + barWidth / 2}
                          y={y - 4}
                          textAnchor="middle"
                          className="text-[8px] font-black fill-slate-500 opacity-0 group-hover/bar:opacity-100 transition-opacity duration-200"
                        >
                          {formatCompactBDT(c.revenue)}
                        </text>
                      </g>
                    );
                  })}
                </svg>

                {/* X labels */}
                <div className="flex justify-between px-1 animate-fadeIn" style={{ paddingLeft: "45px", paddingRight: "15px", marginTop: "-18px" }}>
                  {categoriesStats.slice(0, 8).map((c, idx) => {
                    const totalBars = Math.min(categoriesStats.length, 8);
                    return (
                      <span
                        key={idx}
                        className="text-[8px] font-black text-slate-400 dark:text-zinc-650 truncate text-center"
                        style={{ width: `${440 / totalBars}px` }}
                        title={c.name}
                      >
                        {c.name.length > 8 ? `${c.name.slice(0, 7)}…` : c.name}
                      </span>
                    );
                  })}
                </div>
              </div>

              {/* Underlying details list */}
              <div className="flex flex-col gap-2.5 pt-4 border-t border-slate-100 dark:border-zinc-800">
                {categoriesStats.map(c => {
                  const pct = totalCategoryRevenue > 0 ? (c.revenue / totalCategoryRevenue) * 100 : 0;
                  return (
                    <div key={c.name} className="flex items-center justify-between text-xs py-1.5 border-b border-slate-50 dark:border-zinc-800/30 last:border-0 last:pb-0">
                      <span className="text-slate-600 dark:text-zinc-400 font-bold flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                        {c.name} <span className="text-[10px] font-normal text-slate-400">({c.sold} sold)</span>
                      </span>
                      <span className="font-extrabold text-slate-900 dark:text-white">
                        {formatBDT(c.revenue)} <span className="text-[10px] text-indigo-500 ml-1">({pct.toFixed(1)}%)</span>
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Brands Performance */}
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200/80 dark:border-zinc-800/80 p-6 shadow-sm flex flex-col gap-6">
          <div>
            <h2 className="text-sm font-extrabold text-slate-900 dark:text-white">Brand Share Chart</h2>
            <p className="text-[10px] text-slate-400 dark:text-zinc-500 mt-0.5">Revenue contribution comparison per product brand.</p>
          </div>

          {brandsStats.length === 0 ? (
            <div className="h-40 flex items-center justify-center text-xs text-slate-400 font-semibold">
              No brand sales records found.
            </div>
          ) : (
            <div className="flex flex-col gap-6">
              {/* Vertical SVG Bar Chart */}
              <div className="relative">
                {/* Y Gridlines and Ticks */}
                <div className="absolute inset-0 flex flex-col justify-between pointer-events-none" style={{ padding: "10px 0 25px 0" }}>
                  {[1.0, 0.66, 0.33, 0].map((ratio, idx) => {
                    const gridVal = maxBrandRevenue * ratio;
                    return (
                      <div key={idx} className="w-full flex items-center relative">
                        <div className="flex-1 border-t border-dashed border-slate-100 dark:border-zinc-855" style={{ marginLeft: "45px" }}></div>
                        <span className="absolute left-0 text-[8px] font-black text-slate-400 dark:text-zinc-650 text-right pr-2" style={{ width: "45px", transform: "translateY(-50%)" }}>
                          {formatCompactBDT(gridVal)}
                        </span>
                      </div>
                    );
                  })}
                </div>

                <svg viewBox="0 0 500 180" className="w-full h-44 relative z-10 overflow-visible">
                  <defs>
                    <linearGradient id="brandBarGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10b981" />
                      <stop offset="100%" stopColor="#059669" />
                    </linearGradient>
                  </defs>

                  {/* Drawing the Bars */}
                  {brandsStats.slice(0, 8).map((b, idx) => {
                    const totalBars = Math.min(brandsStats.length, 8);
                    const step = 440 / totalBars;
                    const barWidth = step * 0.45;
                    const x = 45 + idx * step + (step - barWidth) / 2;
                    const height = (b.revenue / maxBrandRevenue) * 145;
                    const y = 180 - 25 - height;

                    return (
                      <g key={`brand-bar-${idx}`} className="group/bar">
                        <path
                          d={getRoundedTopBarPath(x, y, barWidth, height, 4)}
                          fill="url(#brandBarGrad)"
                          className="opacity-90 hover:opacity-100 transition-opacity duration-200 cursor-pointer"
                        />
                        {/* Label on top of bar on hover */}
                        <text
                          x={x + barWidth / 2}
                          y={y - 4}
                          textAnchor="middle"
                          className="text-[8px] font-black fill-slate-500 opacity-0 group-hover/bar:opacity-100 transition-opacity duration-200"
                        >
                          {formatCompactBDT(b.revenue)}
                        </text>
                      </g>
                    );
                  })}
                </svg>

                {/* X labels */}
                <div className="flex justify-between px-1" style={{ paddingLeft: "45px", paddingRight: "15px", marginTop: "-18px" }}>
                  {brandsStats.slice(0, 8).map((b, idx) => {
                    const totalBars = Math.min(brandsStats.length, 8);
                    return (
                      <span
                        key={idx}
                        className="text-[8px] font-black text-slate-400 dark:text-zinc-650 truncate text-center"
                        style={{ width: `${440 / totalBars}px` }}
                        title={b.name}
                      >
                        {b.name.length > 8 ? `${b.name.slice(0, 7)}…` : b.name}
                      </span>
                    );
                  })}
                </div>
              </div>

              {/* Underlying details list */}
              <div className="flex flex-col gap-2.5 pt-4 border-t border-slate-100 dark:border-zinc-800">
                {brandsStats.map(b => {
                  const pct = totalBrandRevenue > 0 ? (b.revenue / totalBrandRevenue) * 100 : 0;
                  return (
                    <div key={b.name} className="flex items-center justify-between text-xs py-1.5 border-b border-slate-50 dark:border-zinc-800/30 last:border-0 last:pb-0">
                      <span className="text-slate-600 dark:text-zinc-400 font-bold flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        {b.name} <span className="text-[10px] font-normal text-slate-400">({b.sold} sold)</span>
                      </span>
                      <span className="font-extrabold text-slate-900 dark:text-white">
                        {formatBDT(b.revenue)} <span className="text-[10px] text-emerald-500 ml-1">({pct.toFixed(1)}%)</span>
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Tabbed Interactive Section */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200/80 dark:border-zinc-800/80 shadow-sm overflow-hidden">
        {/* Navigation Toggles */}
        <div className="flex border-b border-slate-100 dark:border-zinc-800 bg-slate-50/40 dark:bg-zinc-950/20 px-4 md:px-6">
          {[
            { id: "top-selling", label: "Top Selling Products", icon: <TrendingUp className="w-3.5 h-3.5" /> },
            { id: "custom-prints", label: "Custom Prints", icon: <Printer className="w-3.5 h-3.5" /> },
            { id: "returns", label: "Returns & Loss Analysis", icon: <TrendingDown className="w-3.5 h-3.5" /> }
          ].map(t => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id as any)}
              className={`flex items-center gap-2 px-4 py-4 text-xs font-bold border-b-2 transition-all whitespace-nowrap ${
                activeTab === t.id
                  ? "border-[#800020] text-[#800020] bg-white dark:bg-zinc-900 relative z-10"
                  : "border-transparent text-slate-400 hover:text-slate-700 dark:hover:text-zinc-300"
              }`}
            >
              {t.icon}
              {t.label}
            </button>
          ))}
        </div>

        {/* Tab Contents */}
        <div className="p-6">
          {/* Top Selling Products */}
          {activeTab === "top-selling" && (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs min-w-[700px]">
                <thead>
                  <tr className="text-slate-400 font-bold border-b border-slate-100 dark:border-zinc-800 pb-2">
                    <th className="py-2">Product Name</th>
                    <th className="py-2">Category</th>
                    <th className="py-2">Brand</th>
                    <th className="py-2 text-right">Units Sold</th>
                    <th className="py-2 text-right">Revenue</th>
                    <th className="py-2 text-right">COGS</th>
                    <th className="py-2 text-right">Profit</th>
                    <th className="py-2 text-right">Margin %</th>
                  </tr>
                </thead>
                <tbody>
                  {topProducts.map(p => {
                    const margin = p.revenue > 0 ? (p.profit / p.revenue) * 100 : 0;
                    return (
                      <tr key={p.id} className="border-b border-slate-50 dark:border-zinc-800/30 last:border-0 hover:bg-slate-50/50 dark:hover:bg-zinc-800/20">
                        <td className="py-3 font-bold text-slate-800 dark:text-zinc-200">{p.name}</td>
                        <td className="py-3 text-slate-500 dark:text-zinc-400 font-medium">{p.category}</td>
                        <td className="py-3 text-slate-500 dark:text-zinc-400 font-medium">{p.brand}</td>
                        <td className="py-3 text-right font-extrabold text-slate-900 dark:text-white">{p.sold}</td>
                        <td className="py-3 text-right font-bold text-slate-900 dark:text-white">{formatBDT(p.revenue)}</td>
                        <td className="py-3 text-right font-semibold text-slate-500 dark:text-zinc-500">{formatBDT(p.cogs)}</td>
                        <td className="py-3 text-right font-bold text-emerald-600 dark:text-emerald-400">{formatBDT(p.profit)}</td>
                        <td className="py-3 text-right font-bold text-slate-700 dark:text-zinc-300">{margin.toFixed(1)}%</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Custom Printing Customization */}
          {activeTab === "custom-prints" && (
            <div className="flex flex-col gap-6">
              {/* Custom Prints Overview */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50 dark:bg-zinc-950/30 p-5 rounded-2xl border border-slate-100 dark:border-zinc-800/50">
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] font-black text-slate-400 uppercase">Print Customize Units</span>
                  <span className="text-lg font-black text-slate-900 dark:text-white">{summary.customItemsCount} items</span>
                </div>
                <div className="flex flex-col gap-1 border-slate-150 dark:border-zinc-800 md:border-l md:pl-6">
                  <span className="text-[10px] font-black text-slate-400 uppercase">Provisional Print Revenue</span>
                  <span className="text-lg font-black text-[#800020]">{formatBDT(summary.customRevenue)}</span>
                </div>
                <div className="flex flex-col gap-1 border-slate-150 dark:border-zinc-800 md:border-l md:pl-6">
                  <span className="text-[10px] font-black text-slate-400 uppercase">Estimated Print Net Profit</span>
                  <span className="text-lg font-black text-emerald-600 dark:text-emerald-400">{formatBDT(summary.customProfit)}</span>
                </div>
              </div>

              {/* Informational tip */}
              <div className="flex gap-2 p-4 bg-indigo-500/5 text-indigo-600 dark:text-indigo-400 border border-indigo-500/10 rounded-xl text-xs leading-relaxed font-semibold">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>
                  DTF Printing customization metrics evaluate items requiring customization name or number on products.
                  Print Revenue is calculated from customer customization charge (`printCost` $\times$ quantity).
                  Print Cost is computed from base store printing setting (`printCostSetting` $\times$ quantity).
                </span>
              </div>
            </div>
          )}



          {/* Product Return Analysis */}
          {activeTab === "returns" && (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs min-w-[700px]">
                <thead>
                  <tr className="text-slate-400 font-bold border-b border-slate-100 dark:border-zinc-800 pb-2">
                    <th className="py-2">Product Name</th>
                    <th className="py-2 text-right">Units Sold</th>
                    <th className="py-2 text-right">Units Returned</th>
                    <th className="py-2 text-right">Return Rate</th>
                    <th className="py-2 text-right">Delivery Loss</th>
                    <th className="py-2 text-right">Product Wastage</th>
                    <th className="py-2 text-right">Return Fees</th>
                    <th className="py-2 text-right">Total Realized Loss</th>
                  </tr>
                </thead>
                <tbody>
                  {returnRateStats.map(r => (
                    <tr key={r.id} className="border-b border-slate-50 dark:border-zinc-800/30 last:border-0 hover:bg-slate-50/50 dark:hover:bg-zinc-800/20">
                      <td className="py-3 font-bold text-slate-800 dark:text-zinc-200">{r.name}</td>
                      <td className="py-3 text-right font-semibold text-slate-500 dark:text-zinc-400">{r.soldQty}</td>
                      <td className="py-3 text-right font-semibold text-slate-600 dark:text-zinc-400">{r.returnedQty}</td>
                      <td className="py-3 text-right font-black text-rose-600 dark:text-rose-400">{r.returnRate.toFixed(1)}%</td>
                      <td className="py-3 text-right font-semibold text-slate-500">{formatBDT(r.deliveryLoss)}</td>
                      <td className="py-3 text-right font-semibold text-slate-500">{formatBDT(r.productLoss + r.printingLoss)}</td>
                      <td className="py-3 text-right font-semibold text-slate-500">{formatBDT(r.returnCost)}</td>
                      <td className="py-3 text-right font-bold text-rose-600 dark:text-rose-400">{formatBDT(r.totalLoss)}</td>
                    </tr>
                  ))}
                  {returnRateStats.length === 0 && (
                    <tr>
                      <td colSpan={8} className="py-4 text-center text-slate-400 font-medium">
                        No product return logs registered in this date range.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
