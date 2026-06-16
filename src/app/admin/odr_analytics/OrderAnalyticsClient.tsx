"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  TrendingUp,
  DollarSign,
  ArrowDownCircle,
  XCircle,
  Users,
  MapPin,
  Percent,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  Info,
  ShoppingBag,
  TrendingDown,
  Activity,
  UserCheck
} from "lucide-react";
import { formatBDT } from "@/utils/formatPrice";
import mapData from "./mapData.json";

const DIVISION_CENTROIDS: Record<string, { x: number; y: number }> = {
  "Rangpur": { x: 355, y: 296 },
  "Rajshahi": { x: 341, y: 727 },
  "Khulna": { x: 407, y: 1277 },
  "Barishal": { x: 767, y: 1509 },
  "Chittagong": { x: 1176, y: 1388 },
  "Sylhet": { x: 1217, y: 719 },
  "Mymensingh": { x: 778, y: 638 },
  "Dhaka": { x: 738, y: 1031 }
};

interface SummaryMetrics {
  netSales: number;
  prevNetSales: number;
  grossSales: number;
  prevGrossSales: number;
  totalCogs: number;
  prevCogs: number;
  totalProfit: number;
  prevProfit: number;
  marginPercentage: number;
  aov: number;
  prevAov: number;
  returnRate: number;
  prevReturnRate: number;
  totalReturnLoss: number;
  prevReturnLoss: number;
  deliveryLoss: number;
  productLoss: number;
  printingLoss: number;
  returnCost: number;
  ordersCount: number;
  deliveredCount: number;
  returnedCount: number;
  cancelledCount: number;
}

interface ChartPoint {
  name: string;
  revenue: number;
  cogs: number;
  profit: number;
  count: number;
}

interface ProductRank {
  id: string;
  name: string;
  sold: number;
  revenue: number;
  profit: number;
  cogs: number;
  category: string;
}

interface DistrictRank {
  name: string;
  count: number;
  revenue: number;
}

interface StaffRank {
  username: string;
  email: string;
  orderCount: number;
  sales: number;
  commission: number;
}

interface CustomerRetentionMetrics {
  totalCustomers: number;
  repeatCustomersCount: number;
  repeatRate: number;
  avgOrdersPerCustomer: number;
  averageLTV: number;
  topLoyalCustomers: { name: string; phone: string; orders: number; spend: number }[];
  topSpenders: { name: string; phone: string; orders: number; spend: number }[];
}

interface DiscountCouponMetrics {
  totalDiscounts: number;
  couponOrdersCount: number;
  couponRevenue: number;
  couponDiscountTotal: number;
  manualDiscountTotal: number;
  couponSummary: { code: string; count: number; discount: number; revenue: number }[];
}

interface OrderAnalyticsClientProps {
  filter: string;
  summary: SummaryMetrics;
  chartData: ChartPoint[];
  statusCounts: Record<string, number>;
  topProducts: ProductRank[];
  topDistricts: DistrictRank[];
  divisionMetrics: Record<string, { count: number; revenue: number }>;
  staffPerformance: StaffRank[];
  channels: {
    ecommerceCount: number;
    ecommerceSales: number;
    salesmanCount: number;
    salesmanSales: number;
  };
  recentReturns: any[];
  customerRetention?: CustomerRetentionMetrics;
  discountCouponImpact?: DiscountCouponMetrics;
}

const STATUS_COLORS: Record<string, string> = {
  PENDING: "#f59e0b",     // Amber
  CONFIRMED: "#3b82f6",   // Blue
  PACKAGING: "#06b6d4",   // Cyan
  PRINTING: "#8b5cf6",    // Purple
  SHIPPED: "#6366f1",     // Indigo
  DELIVERED: "#10b981",   // Emerald
  CANCELLED: "#ef4444",   // Red
  RETURNED: "#ec4899",    // Pink
  HOLD: "#f43f5e",        // Rose
};

const STATUS_BG_COLORS: Record<string, string> = {
  PENDING: "bg-amber-500/10 text-amber-500 border-amber-500/20",
  CONFIRMED: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  PACKAGING: "bg-cyan-500/10 text-cyan-500 border-cyan-500/20",
  PRINTING: "bg-purple-500/10 text-purple-500 border-purple-500/20",
  SHIPPED: "bg-indigo-500/10 text-indigo-500 border-indigo-500/20",
  DELIVERED: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
  CANCELLED: "bg-red-500/10 text-red-500 border-red-500/20",
  RETURNED: "bg-pink-500/10 text-pink-500 border-pink-500/20",
  HOLD: "bg-rose-500/10 text-rose-500 border-rose-500/20",
};

export default function OrderAnalyticsClient({
  filter,
  summary,
  chartData,
  statusCounts,
  topProducts,
  topDistricts,
  divisionMetrics,
  staffPerformance,
  channels,
  recentReturns,
  customerRetention = {
    totalCustomers: 0,
    repeatCustomersCount: 0,
    repeatRate: 0,
    avgOrdersPerCustomer: 0,
    averageLTV: 0,
    topLoyalCustomers: [],
    topSpenders: []
  },
  discountCouponImpact = {
    totalDiscounts: 0,
    couponOrdersCount: 0,
    couponRevenue: 0,
    couponDiscountTotal: 0,
    manualDiscountTotal: 0,
    couponSummary: []
  }
}: OrderAnalyticsClientProps) {
  const router = useRouter();

  const [showRevenue, setShowRevenue] = useState(true);
  const [showCogs, setShowCogs] = useState(true);
  const [showProfit, setShowProfit] = useState(true);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [hoveredDivision, setHoveredDivision] = useState<{ name: string; count: number; revenue: number; x: number; y: number } | null>(null);

  const maxDivisionRevenue = useMemo(() => {
    const values = Object.values(divisionMetrics || {}).map(d => d.revenue);
    return Math.max(...values, 1);
  }, [divisionMetrics]);

  // -------------------------------------------------------------
  // Growth Calculations Helper
  // -------------------------------------------------------------
  const getGrowth = (curr: number, prev: number) => {
    if (prev === 0) return curr > 0 ? 100 : 0;
    return ((curr - prev) / prev) * 100;
  };

  const salesGrowth = getGrowth(summary.netSales, summary.prevNetSales);
  const profitGrowth = getGrowth(summary.totalProfit, summary.prevProfit);
  const cogsGrowth = getGrowth(summary.totalCogs, summary.prevCogs);
  const aovGrowth = getGrowth(summary.aov, summary.prevAov);
  const returnRateDiff = summary.returnRate - summary.prevReturnRate;
  const returnLossGrowth = getGrowth(summary.totalReturnLoss, summary.prevReturnLoss);

  // -------------------------------------------------------------
  // SVG Line Chart Builders
  // -------------------------------------------------------------
  const chartW = 900;
  const chartH = 300;
  const padX = 55;
  const padY = 25;

  const activeMaxVal = useMemo(() => {
    if (chartData.length === 0) return 1;
    const values: number[] = [];
    chartData.forEach(d => {
      if (showRevenue) values.push(d.revenue);
      if (showCogs) values.push(d.cogs);
      if (showProfit) values.push(d.profit);
    });
    if (values.length === 0) return 1;
    return Math.max(...values, 1);
  }, [chartData, showRevenue, showCogs, showProfit]);

  const yMax = activeMaxVal * 1.15; // Safe top headroom

  const formatCompactBDT = (val: number) => {
    const isNegative = val < 0;
    const absVal = Math.abs(val);
    let formatted = "";
    if (absVal >= 10000000) {
      formatted = `৳${(absVal / 10000000).toFixed(1)}Cr`;
    } else if (absVal >= 100000) {
      formatted = `৳${(absVal / 100000).toFixed(1)}L`;
    } else if (absVal >= 1000) {
      formatted = `৳${(absVal / 1000).toFixed(0)}k`;
    } else {
      formatted = `৳${Number(absVal.toFixed(2))}`;
    }
    return isNegative ? `-${formatted}` : formatted;
  };

  const getBezierLinePath = (key: "revenue" | "cogs" | "profit") => {
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

  const getBezierAreaPath = (key: "revenue" | "cogs" | "profit") => {
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

  // -------------------------------------------------------------
  // Donut Chart Setup
  // -------------------------------------------------------------
  const totalOrders = Object.values(statusCounts).reduce((a, b) => a + b, 0);

  const donutSegments = useMemo(() => {
    let cumulativePercent = 0;
    return Object.entries(statusCounts)
      .filter(([_, count]) => count > 0)
      .map(([status, count]) => {
        const percent = (count / (totalOrders || 1)) * 100;
        const strokeDasharray = `${(percent / 100) * 251.2} 251.2`;
        const strokeDashoffset = `${- (cumulativePercent / 100) * 251.2}`;
        cumulativePercent += percent;
        return {
          status,
          count,
          percent,
          strokeDasharray,
          strokeDashoffset,
          color: STATUS_COLORS[status] || "#cbd5e1"
        };
      });
  }, [statusCounts, totalOrders]);

  // -------------------------------------------------------------
  // Dynamic UI Elements
  // -------------------------------------------------------------
  const renderTrendTag = (val: number, label = "%", isInverse = false) => {
    if (filter === "all") return null;
    const isZero = val === 0;
    const isUp = val > 0;
    const isSuccess = isInverse ? !isUp : isUp;

    return (
      <span className={`inline-flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-md ${isZero ? "bg-slate-100 text-slate-500" :
        isSuccess ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "bg-rose-500/10 text-rose-600 dark:text-rose-400"
        }`}>
        {isZero ? null : isUp ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
        {isZero ? "0%" : `${Math.abs(val).toFixed(1)}${label}`}
      </span>
    );
  };

  return (
    <div className="flex flex-col gap-6 pb-12">

      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <Activity className="w-6 h-6 text-indigo-500" />
            Order Analytics
          </h1>
          <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">Real-time database financial and operational analysis.</p>
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
              onClick={() => router.push(`/admin/odr_analytics?filter=${f.value}`)}
              className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${filter === f.value
                ? "bg-slate-900 text-white dark:bg-zinc-800 shadow"
                : "text-slate-500 hover:text-slate-800 dark:hover:text-zinc-200"
                }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── KPI Grid ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">

        {/* Sales Card */}
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200/80 dark:border-zinc-800/80 p-5 shadow-[0_1px_3px_rgba(0,0,0,0.03)] flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider">Realized Net Sales</span>
            <div className="w-8 h-8 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-end justify-between">
            <div className="flex flex-col">
              <span className="text-xl font-extrabold text-slate-900 dark:text-white leading-tight">
                {formatBDT(summary.netSales)}
              </span>
              <span className="text-[10px] text-slate-400 dark:text-zinc-500 mt-1">
                Gross Pipeline: {formatCompactBDT(summary.grossSales)}
              </span>
            </div>
            {renderTrendTag(salesGrowth)}
          </div>
        </div>

        {/* Profit Card */}
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200/80 dark:border-zinc-800/80 p-5 shadow-[0_1px_3px_rgba(0,0,0,0.03)] flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider">Gross Profit (Margin)</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-end justify-between">
            <div className="flex flex-col">
              <span className="text-xl font-extrabold text-slate-900 dark:text-white leading-tight">
                {formatBDT(summary.totalProfit)}
              </span>
              <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 mt-1 flex items-center gap-1">
                <Percent className="w-3 h-3" /> Margin: {summary.marginPercentage.toFixed(1)}%
              </span>
            </div>
            {renderTrendTag(profitGrowth)}
          </div>
        </div>

        {/* COGS Card */}
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200/80 dark:border-zinc-800/80 p-5 shadow-[0_1px_3px_rgba(0,0,0,0.03)] flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider">Cost of Goods Sold (COGS)</span>
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <ArrowDownCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-end justify-between">
            <div className="flex flex-col">
              <span className="text-xl font-extrabold text-slate-900 dark:text-white leading-tight">
                {formatBDT(summary.totalCogs)}
              </span>
              <span className="text-[10px] text-slate-400 dark:text-zinc-500 mt-1">
                Average order value: {formatCompactBDT(summary.aov)}
              </span>
            </div>
            {renderTrendTag(cogsGrowth, "%", true)}
          </div>
        </div>

        {/* Returns Card */}
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200/80 dark:border-zinc-800/80 p-5 shadow-[0_1px_3px_rgba(0,0,0,0.03)] flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider">Total Return Loss</span>
            <div className="w-8 h-8 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center">
              <XCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-end justify-between">
            <div className="flex flex-col">
              <span className="text-xl font-extrabold text-rose-600 dark:text-rose-400 leading-tight">
                {formatBDT(summary.totalReturnLoss)}
              </span>
              <span className="text-[10px] font-semibold text-rose-600 dark:text-rose-400 mt-1">
                Return Rate: {summary.returnRate.toFixed(1)}%
              </span>
            </div>
            {renderTrendTag(-returnRateDiff, "%", false)}
          </div>
        </div>

      </div>

      {/* ── Line Chart & Stats Section ── */}
      <div className="grid grid-cols-1 lg:grid-cols-7 gap-4">

        {/* Line Chart Workspace */}
        <div className="lg:col-span-5 bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200/80 dark:border-zinc-800/80 p-6 shadow-sm flex flex-col gap-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 dark:border-zinc-800 pb-4">
            <div>
              <h2 className="text-sm font-extrabold text-slate-900 dark:text-white">Revenue, Cost & Profit Trend</h2>
              <p className="text-[10px] text-slate-400 dark:text-zinc-500 mt-0.5">Visual representation of realized income flow.</p>
            </div>

            {/* Series Toggles */}
            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={() => setShowRevenue(!showRevenue)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${showRevenue
                  ? "bg-indigo-50 text-indigo-600 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-400 dark:border-indigo-800"
                  : "bg-slate-50 text-slate-400 border-slate-200 dark:bg-zinc-800/40 dark:text-zinc-600 dark:border-zinc-800"
                  }`}
              >
                <span className={`w-2 h-2 rounded-full ${showRevenue ? "bg-indigo-500" : "bg-slate-300 dark:bg-zinc-600"}`} />
                Net Sales
              </button>
              <button
                onClick={() => setShowCogs(!showCogs)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${showCogs
                  ? "bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800"
                  : "bg-slate-50 text-slate-400 border-slate-200 dark:bg-zinc-800/40 dark:text-zinc-600 dark:border-zinc-800"
                  }`}
              >
                <span className={`w-2 h-2 rounded-full ${showCogs ? "bg-amber-500" : "bg-slate-300 dark:bg-zinc-600"}`} />
                COGS
              </button>
              <button
                onClick={() => setShowProfit(!showProfit)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${showProfit
                  ? "bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800"
                  : "bg-slate-50 text-slate-400 border-slate-200 dark:bg-zinc-800/40 dark:text-zinc-600 dark:border-zinc-800"
                  }`}
              >
                <span className={`w-2 h-2 rounded-full ${showProfit ? "bg-emerald-500" : "bg-slate-300 dark:bg-zinc-600"}`} />
                Net Profit
              </button>
            </div>
          </div>

          {chartData.length === 0 ? (
            <div className="h-64 flex items-center justify-center text-xs text-slate-400 font-semibold">
              No delivered orders for this period.
            </div>
          ) : (
            <div className="relative">
              {/* Y Gridlines and Labels */}
              <div className="absolute inset-0 flex flex-col justify-between pointer-events-none" style={{ padding: `${padY}px 0`, bottom: `${padY}px` }}>
                {[1.0, 0.75, 0.5, 0.25, 0].map((ratio, i) => {
                  const val = yMax * ratio;
                  return (
                    <div key={i} className="w-full flex items-center relative">
                      <div className="flex-1 border-t border-dashed border-slate-100 dark:border-zinc-800" style={{ marginLeft: `${padX}px` }}></div>
                      <span className="absolute left-0 text-[9px] font-black text-slate-400 dark:text-zinc-600 text-right pr-2" style={{ width: `${padX}px`, transform: "translateY(-50%)" }}>
                        {formatCompactBDT(val)}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* The SVG Artwork */}
              <svg viewBox={`0 0 ${chartW} ${chartH}`} className="w-full h-72 relative z-10 overflow-visible" preserveAspectRatio="none">
                <defs>
                  {/* Gradients */}
                  <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#6366f1" stopOpacity="0.22" />
                    <stop offset="100%" stopColor="#6366f1" stopOpacity="0.0" />
                  </linearGradient>
                  <linearGradient id="cogsGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.15" />
                    <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.0" />
                  </linearGradient>
                  <linearGradient id="profitGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" stopOpacity="0.22" />
                    <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
                  </linearGradient>

                  {/* Glow Filters */}
                  <filter id="glow-indigo" x="-10%" y="-10%" width="120%" height="120%">
                    <feDropShadow dx="0" dy="4" stdDeviation="4" floodColor="#6366f1" floodOpacity="0.15" />
                  </filter>
                  <filter id="glow-amber" x="-10%" y="-10%" width="120%" height="120%">
                    <feDropShadow dx="0" dy="4" stdDeviation="4" floodColor="#f59e0b" floodOpacity="0.15" />
                  </filter>
                  <filter id="glow-emerald" x="-10%" y="-10%" width="120%" height="120%">
                    <feDropShadow dx="0" dy="4" stdDeviation="4" floodColor="#10b981" floodOpacity="0.15" />
                  </filter>
                </defs>

                {/* Vertical Guides on Hover */}
                {chartData.map((_, i) => {
                  if (chartData.length <= 1) return null;
                  const step = (chartW - padX * 2) / (chartData.length - 1);
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
                {showCogs && <path d={getBezierAreaPath("cogs")} fill="url(#cogsGrad)" className="transition-all duration-300" />}
                {showProfit && <path d={getBezierAreaPath("profit")} fill="url(#profitGrad)" className="transition-all duration-300" />}

                {/* Splines */}
                {showRevenue && (
                  <path
                    d={getBezierLinePath("revenue")}
                    fill="none"
                    stroke="#6366f1"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    filter="url(#glow-indigo)"
                    vectorEffect="non-scaling-stroke"
                  />
                )}
                {showCogs && (
                  <path
                    d={getBezierLinePath("cogs")}
                    fill="none"
                    stroke="#f59e0b"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    filter="url(#glow-amber)"
                    vectorEffect="non-scaling-stroke"
                  />
                )}
                {showProfit && (
                  <path
                    d={getBezierLinePath("profit")}
                    fill="none"
                    stroke="#10b981"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    filter="url(#glow-emerald)"
                    vectorEffect="non-scaling-stroke"
                  />
                )}

                {/* Markers */}
                {chartData.map((d, i) => {
                  const step = chartData.length === 1 ? (chartW - padX * 2) : (chartW - padX * 2) / (chartData.length - 1);
                  const x = chartData.length === 1 ? chartW / 2 : padX + i * step;
                  const yRev = chartH - padY - ((d.revenue / yMax) * (chartH - padY * 2));
                  const yCogs = chartH - padY - ((d.cogs / yMax) * (chartH - padY * 2));
                  const yProf = chartH - padY - ((d.profit / yMax) * (chartH - padY * 2));

                  const isHovered = hoveredIndex === i;

                  return (
                    <g key={i} className="transition-transform duration-200">
                      {showRevenue && (
                        <circle
                          cx={x}
                          cy={yRev}
                          r={isHovered ? "6" : "3.5"}
                          fill="#ffffff"
                          stroke="#6366f1"
                          strokeWidth={isHovered ? "3" : "1.5"}
                          className="transition-all duration-150"
                        />
                      )}
                      {showCogs && (
                        <circle
                          cx={x}
                          cy={yCogs}
                          r={isHovered ? "6" : "3.5"}
                          fill="#ffffff"
                          stroke="#f59e0b"
                          strokeWidth={isHovered ? "3" : "1.5"}
                          className="transition-all duration-150"
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
                          className="transition-all duration-150"
                        />
                      )}
                    </g>
                  );
                })}
              </svg>

              {/* X Timeline Labels */}
              <div className="flex justify-between mt-3 px-1" style={{ paddingLeft: `${padX}px`, paddingRight: `${padX - 10}px` }}>
                {chartData.map((d, i) => {
                  const showLabel = i % Math.ceil(chartData.length / 8) === 0 || chartData.length <= 12;
                  return (
                    <span
                      key={i}
                      className={`text-[9px] font-bold text-slate-400 dark:text-zinc-500 transition-colors duration-200 ${hoveredIndex === i ? "text-slate-900 font-extrabold dark:text-zinc-200" : ""
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

              {/* Hover detection logic */}
              <div className="absolute inset-0 flex z-30" style={{ left: `${padX}px`, right: `${padX}px`, bottom: `${padY}px`, top: `${padY}px` }}>
                {chartData.map((d, i) => (
                  <div
                    key={i}
                    className="flex-1 h-full cursor-crosshair"
                    onMouseEnter={() => setHoveredIndex(i)}
                    onMouseLeave={() => setHoveredIndex(null)}
                  />
                ))}
              </div>

              {/* High Fidelity Tooltip Card */}
              {hoveredIndex !== null && (
                <div
                  className="absolute z-40 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md rounded-2xl border border-slate-200/90 dark:border-zinc-800/90 p-4 shadow-xl pointer-events-none flex flex-col gap-2 transition-all duration-200"
                  style={{
                    left: `${padX + (hoveredIndex / (chartData.length - 1)) * (chartW - padX * 2) * 100 / chartW}%`,
                    transform: `translate(${hoveredIndex < chartData.length / 2 ? "16px" : "-108%"}, -50%)`,
                    top: "45%",
                    minWidth: "220px",
                  }}
                >
                  <div className="flex items-center justify-between border-b border-slate-100 dark:border-zinc-800 pb-1.5">
                    <span className="text-[10px] font-black text-slate-400 dark:text-zinc-500 uppercase tracking-widest">
                      {chartData[hoveredIndex].name}
                    </span>
                    <span className="text-[9px] font-black text-indigo-500 bg-indigo-500/10 px-1.5 py-0.5 rounded">
                      {chartData[hoveredIndex].count} {chartData[hoveredIndex].count === 1 ? "Order" : "Orders"}
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

                  {showCogs && (
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500 font-semibold flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                        Product COGS:
                      </span>
                      <span className="font-extrabold text-amber-600 dark:text-amber-400">
                        {formatBDT(chartData[hoveredIndex].cogs)}
                      </span>
                    </div>
                  )}

                  {showProfit && (
                    <div className="flex items-center justify-between text-xs border-t border-slate-50 dark:border-zinc-800 pt-1.5 mt-1">
                      <span className="text-slate-800 dark:text-zinc-200 font-extrabold flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        Realized Profit:
                      </span>
                      <span className="font-black text-emerald-600 dark:text-emerald-400">
                        {formatBDT(chartData[hoveredIndex].profit)}
                      </span>
                    </div>
                  )}

                  {showRevenue && showProfit && chartData[hoveredIndex].revenue > 0 && (
                    <div className="text-[9px] font-extrabold text-slate-400 dark:text-zinc-500 text-right mt-1">
                      Margin: {((chartData[hoveredIndex].profit / chartData[hoveredIndex].revenue) * 100).toFixed(1)}%
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Donut Chart: Status distribution */}
        <div className="lg:col-span-2 bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200/80 dark:border-zinc-800/80 p-6 shadow-sm flex flex-col gap-6">
          <div>
            <h2 className="text-sm font-extrabold text-slate-900 dark:text-white">Order Status Shares</h2>
            <p className="text-[10px] text-slate-400 dark:text-zinc-500 mt-0.5">Summary of all pipeline states.</p>
          </div>

          {totalOrders === 0 ? (
            <div className="flex-1 flex items-center justify-center text-xs text-slate-400 font-medium py-8">
              No orders registered for this period.
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center gap-6">

              {/* Circular SVG Donut */}
              <div className="relative w-40 h-40">
                <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90">
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    fill="transparent"
                    stroke="#f1f5f9"
                    strokeWidth="11"
                    className="dark:stroke-zinc-800"
                  />
                  {donutSegments.map((seg, idx) => (
                    <circle
                      key={idx}
                      cx="50"
                      cy="50"
                      r="40"
                      fill="transparent"
                      stroke={seg.color}
                      strokeWidth="12"
                      strokeDasharray={seg.strokeDasharray}
                      strokeDashoffset={seg.strokeDashoffset}
                      strokeLinecap="round"
                      className="transition-all duration-300"
                    />
                  ))}
                </svg>

                {/* Center Content */}
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-xs font-semibold text-slate-400">Total Pipeline</span>
                  <span className="text-xl font-extrabold text-slate-900 dark:text-white">{totalOrders}</span>
                  <span className="text-[9px] font-bold text-indigo-500">Orders</span>
                </div>
              </div>

              {/* Grid Legend */}
              <div className="w-full grid grid-cols-2 gap-2 text-xs">
                {donutSegments.map((seg, idx) => (
                  <div key={idx} className="flex items-center gap-1.5 justify-start">
                    <span className="w-2.5 h-2.5 rounded-md flex-shrink-0" style={{ backgroundColor: seg.color }} />
                    <span className="text-slate-500 dark:text-zinc-400 truncate flex-1 font-semibold">{seg.status}</span>
                    <span className="font-extrabold text-slate-800 dark:text-zinc-200">{seg.count} ({seg.percent.toFixed(0)}%)</span>
                  </div>
                ))}
              </div>

            </div>
          )}
        </div>

      </div>

      {/* ── Regional Demand Index (Bangladesh map + Top Districts/Divisions) ── */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200/80 dark:border-zinc-800/80 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 dark:border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-slate-400" />
            <h2 className="text-sm font-extrabold text-slate-900 dark:text-white">Regional Demand Index</h2>
          </div>
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Geographic Metrics</span>
        </div>

        <div className="p-6 grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">

          {/* Bangladesh SVG Map (Left) */}
          <div className="lg:col-span-5 flex flex-col items-center justify-center relative bg-slate-50 dark:bg-zinc-950/20 p-4 rounded-xl border border-slate-100 dark:border-zinc-800/40 min-h-[400px]">
            <span className="text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest mb-4">Interactive Division Map</span>

            <svg
              viewBox="0 0 1550.242 2149.604"
              className="w-full max-h-[460px] select-none overflow-visible"
              onMouseMove={(e) => {
                if (hoveredDivision) {
                  const rect = e.currentTarget.getBoundingClientRect();
                  setHoveredDivision(prev => prev ? {
                    ...prev,
                    x: e.clientX - rect.left,
                    y: e.clientY - rect.top
                  } : null);
                }
              }}
            >
              {mapData.map((div: any) => {
                const name = div.title;
                const stats = divisionMetrics?.[name] || { count: 0, revenue: 0 };
                const ratio = stats.revenue / (maxDivisionRevenue || 1);

                // Active status check
                const isHovered = hoveredDivision?.name === name;

                return (
                  <path
                    key={div.id}
                    d={div.d}
                    className="transition-all duration-200 cursor-pointer stroke-white dark:stroke-zinc-900 stroke-[1.5]"
                    fill="#4f46e5" // Indigo base
                    fillOpacity={stats.revenue === 0 ? 0.05 : 0.15 + ratio * 0.85}
                    style={{
                      stroke: isHovered ? "#6366f1" : undefined,
                      strokeWidth: isHovered ? 2.5 : undefined,
                      filter: isHovered ? "drop-shadow(0px 0px 8px rgba(99, 102, 241, 0.5))" : undefined
                    }}
                    onMouseEnter={(e) => {
                      const rect = e.currentTarget.getBoundingClientRect();
                      const svgRect = e.currentTarget.ownerSVGElement?.getBoundingClientRect();
                      setHoveredDivision({
                        name,
                        count: stats.count,
                        revenue: stats.revenue,
                        x: rect.left - (svgRect?.left || 0) + rect.width / 2,
                        y: rect.top - (svgRect?.top || 0) + rect.height / 2
                      });
                    }}
                    onMouseLeave={() => setHoveredDivision(null)}
                  />
                );
              })}

              {/* Centroid Labels representing Division name, order count, and sales amount */}
              {Object.entries(DIVISION_CENTROIDS).map(([name, pos]) => {
                const stats = divisionMetrics?.[name] || { count: 0, revenue: 0 };
                // Only render labels for active divisions to keep the map clean and focused
                if (stats.count === 0) return null;

                return (
                  <g key={name} className="pointer-events-none select-none">
                    {/* Pill Background Card */}
                    <rect
                      x={pos.x - 120}
                      y={pos.y - 35}
                      width={240}
                      height={70}
                      rx={16}
                      className="fill-white/90 dark:fill-zinc-900/90 stroke-slate-200 dark:stroke-zinc-800 stroke-2"
                      style={{ filter: "drop-shadow(0px 2px 4px rgba(0, 0, 0, 0.04))" }}
                    />
                    {/* Division Name */}
                    <text
                      x={pos.x}
                      y={pos.y - 8}
                      textAnchor="middle"
                      className="fill-slate-800 dark:fill-zinc-200 font-extrabold text-[20px]"
                    >
                      {name}
                    </text>
                    {/* Sales Amount (Revenue) & Order Count */}
                    <text
                      x={pos.x}
                      y={pos.y + 18}
                      textAnchor="middle"
                      className="fill-indigo-600 dark:fill-indigo-400 font-black text-[18px]"
                    >
                      {formatBDT(stats.revenue)} ({stats.count})
                    </text>
                  </g>
                );
              })}
            </svg>

            {/* Custom Tooltip Card */}
            {hoveredDivision && (
              <div
                className="absolute z-50 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md rounded-2xl border border-slate-200/90 dark:border-zinc-800/90 p-3.5 shadow-xl pointer-events-none flex flex-col gap-1.5 transition-all duration-75 text-xs"
                style={{
                  left: `${hoveredDivision.x}px`,
                  top: `${hoveredDivision.y}px`,
                  transform: "translate(-50%, -115%)",
                  minWidth: "170px",
                }}
              >
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-zinc-800 pb-1">
                  <span className="font-extrabold text-slate-800 dark:text-zinc-200">
                    {hoveredDivision.name} Division
                  </span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-slate-400 font-semibold">Orders:</span>
                  <span className="font-bold text-slate-800 dark:text-zinc-200">{hoveredDivision.count}</span>
                </div>
                <div className="flex justify-between gap-4 border-t border-slate-100 dark:border-zinc-800/50 pt-1.5 mt-0.5">
                  <span className="text-slate-400 font-semibold">Revenue:</span>
                  <span className="font-black text-indigo-600 dark:text-indigo-400">{formatBDT(hoveredDivision.revenue)}</span>
                </div>
              </div>
            )}
          </div>


          {/* Sub-metrics Column (Right) */}
          <div className="lg:col-span-7 flex flex-col gap-6 justify-between">

            {/* Sales Channels Distribution */}
            <div className="bg-slate-50/30 dark:bg-zinc-950/10 rounded-xl border border-slate-100/80 dark:border-zinc-800/40 p-5 flex-1 flex flex-col justify-center">
              <div className="pb-3 border-b border-slate-100 dark:border-zinc-800/50 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShoppingBag className="w-4 h-4 text-slate-400" />
                  <h3 className="text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider">Sales Channels Distribution</h3>
                </div>
                <span className="text-[10px] text-slate-400 font-bold">eCommerce vs Salesman</span>
              </div>

              <div className="py-4 flex-1 flex flex-col justify-center gap-4">
                {/* eCommerce stats */}
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-indigo-500 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded bg-indigo-500" />
                      eCommerce Website
                    </span>
                    <span className="font-extrabold text-slate-800 dark:text-zinc-200">
                      {formatBDT(channels.ecommerceSales)}
                      <span className="text-[10px] font-semibold text-slate-400 ml-1.5">
                        ({channels.ecommerceCount} orders)
                      </span>
                    </span>
                  </div>
                  <div className="w-full h-3 bg-slate-100/80 dark:bg-zinc-800/50 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-indigo-500 transition-all duration-300"
                      style={{ width: `${(channels.ecommerceSales / ((channels.ecommerceSales + channels.salesmanSales) || 1)) * 100}%` }}
                    />
                  </div>
                </div>

                {/* Salesman stats */}
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-amber-500 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded bg-amber-500" />
                      Salesman Portal
                    </span>
                    <span className="font-extrabold text-slate-800 dark:text-zinc-200">
                      {formatBDT(channels.salesmanSales)}
                      <span className="text-[10px] font-semibold text-slate-400 ml-1.5">
                        ({channels.salesmanCount} orders)
                      </span>
                    </span>
                  </div>
                  <div className="w-full h-3 bg-slate-100/80 dark:bg-zinc-800/50 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-amber-500 transition-all duration-300"
                      style={{ width: `${(channels.salesmanSales / ((channels.ecommerceSales + channels.salesmanSales) || 1)) * 100}%` }}
                    />
                  </div>
                </div>

                <div className="border-t border-slate-100 dark:border-zinc-800/50 pt-3 flex justify-between text-[10px] text-slate-400">
                  <span>* Sales calculated excluding returned & cancelled orders</span>
                  <span>Total Volume: {formatCompactBDT(channels.ecommerceSales + channels.salesmanSales)}</span>
                </div>
              </div>
            </div>

            {/* Sales Return Loss Index */}
            <div className="bg-slate-50/30 dark:bg-zinc-950/10 rounded-xl border border-slate-100/80 dark:border-zinc-800/40 p-5 flex-1 flex flex-col justify-center">
              <div className="pb-3 border-b border-slate-100 dark:border-zinc-800/50">
                <h3 className="text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider">Sales Return Loss Index</h3>
                <p className="text-[9px] text-slate-400 dark:text-zinc-500 mt-0.5">Detailed view of returns expenses.</p>
              </div>

              <div className="py-4 flex-1 flex flex-col justify-center gap-3">
                {/* Delivery charge losses */}
                <div className="flex items-center justify-between text-xs border-b border-slate-100/50 dark:border-zinc-800/30 pb-2">
                  <span className="text-slate-500 font-semibold flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
                    Delivery Costs Loss:
                  </span>
                  <span className="font-extrabold text-slate-900 dark:text-white">{formatBDT(summary.deliveryLoss)}</span>
                </div>

                {/* Custom print losses */}
                <div className="flex items-center justify-between text-xs border-b border-slate-100/50 dark:border-zinc-800/30 pb-2">
                  <span className="text-slate-500 font-semibold flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                    Custom Printing wastage:
                  </span>
                  <span className="font-extrabold text-rose-500">{formatBDT(summary.printingLoss)}</span>
                </div>

                {/* Product damages */}
                <div className="flex items-center justify-between text-xs border-b border-slate-100/50 dark:border-zinc-800/30 pb-2">
                  <span className="text-slate-500 font-semibold flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                    Damaged/Lost Products:
                  </span>
                  <span className="font-extrabold text-slate-900 dark:text-white">{formatBDT(summary.productLoss)}</span>
                </div>

                {/* Return processing fee */}
                <div className="flex items-center justify-between text-xs border-b border-slate-100/50 dark:border-zinc-800/30 pb-2">
                  <span className="text-slate-500 font-semibold flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                    Return shipping cost:
                  </span>
                  <span className="font-extrabold text-slate-900 dark:text-white">{formatBDT(summary.returnCost)}</span>
                </div>

                {/* Total balance row */}
                <div className="flex items-center justify-between text-xs pt-2 font-black border-t border-slate-100 dark:border-zinc-800">
                  <span className="text-slate-900 dark:text-white font-extrabold">Net Return Wastage:</span>
                  <span className="text-rose-600 text-sm font-black">{formatBDT(summary.totalReturnLoss)}</span>
                </div>
              </div>
            </div>

          </div>

        </div>
      </div>

      {/* ── Customer Retention & Coupon Impact Row ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Customer Behavior & Retention */}
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200/80 dark:border-zinc-800/80 shadow-sm overflow-hidden flex flex-col">
          <div className="px-5 py-4 border-b border-slate-100 dark:border-zinc-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-slate-400" />
              <h2 className="text-sm font-extrabold text-slate-900 dark:text-white">Customer Behavior & Retention</h2>
            </div>
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">All-Time Metrics</span>
          </div>

          <div className="p-6 flex-1 flex flex-col gap-6">
            {/* KPI Cards Row */}
            <div className="grid grid-cols-3 gap-4">
              <div className="p-3 bg-slate-50 dark:bg-zinc-950/20 rounded-xl border border-slate-100 dark:border-zinc-800/40 text-center">
                <p className="text-[9px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider">Repeat Rate</p>
                <p className="text-base font-black text-indigo-600 dark:text-indigo-400 mt-1">{customerRetention.repeatRate.toFixed(1)}%</p>
              </div>
              <div className="p-3 bg-slate-50 dark:bg-zinc-950/20 rounded-xl border border-slate-100 dark:border-zinc-800/40 text-center">
                <p className="text-[9px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider">Average LTV</p>
                <p className="text-base font-black text-slate-800 dark:text-zinc-200 mt-1">{formatBDT(customerRetention.averageLTV)}</p>
              </div>
              <div className="p-3 bg-slate-50 dark:bg-zinc-950/20 rounded-xl border border-slate-100 dark:border-zinc-800/40 text-center">
                <p className="text-[9px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider">Orders / Cust</p>
                <p className="text-base font-black text-slate-800 dark:text-zinc-200 mt-1">{customerRetention.avgOrdersPerCustomer.toFixed(1)}</p>
              </div>
            </div>

            {/* Split Top Spenders vs Top Loyalists */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2 border-t border-slate-100 dark:border-zinc-800/50">

              {/* Top High Spenders */}
              <div className="flex flex-col gap-3">
                <h3 className="text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest pb-1 border-b border-slate-50 dark:border-zinc-800/30">Top 5 Spenders</h3>
                <div className="flex flex-col gap-2">
                  {customerRetention.topSpenders.map((cust, idx) => (
                    <div key={idx} className="flex items-center justify-between p-2 rounded-lg bg-slate-50/50 dark:bg-zinc-950/10 border border-slate-100/50 dark:border-zinc-800/20 text-xs">
                      <div>
                        <p className="font-extrabold text-slate-800 dark:text-zinc-200">{cust.name}</p>
                        <p className="text-[9px] text-slate-400 font-semibold">{cust.phone}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-black text-slate-900 dark:text-white">{formatBDT(cust.spend)}</p>
                        <p className="text-[9px] text-indigo-500 font-bold">{cust.orders} {cust.orders === 1 ? 'order' : 'orders'}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Top Loyal Buyers */}
              <div className="flex flex-col gap-3">
                <h3 className="text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest pb-1 border-b border-slate-50 dark:border-zinc-800/30">Top 5 Loyalists</h3>
                <div className="flex flex-col gap-2">
                  {customerRetention.topLoyalCustomers.map((cust, idx) => (
                    <div key={idx} className="flex items-center justify-between p-2 rounded-lg bg-slate-50/50 dark:bg-zinc-950/10 border border-slate-100/50 dark:border-zinc-800/20 text-xs">
                      <div>
                        <p className="font-extrabold text-slate-800 dark:text-zinc-200">{cust.name}</p>
                        <p className="text-[9px] text-slate-400 font-semibold">{cust.phone}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-black text-indigo-600 dark:text-indigo-400">{cust.orders} {cust.orders === 1 ? 'order' : 'orders'}</p>
                        <p className="text-[9px] text-slate-400 font-bold">{formatBDT(cust.spend)} total</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          </div>
        </div>

        {/* Discount & Coupon Impact */}
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200/80 dark:border-zinc-800/80 shadow-sm overflow-hidden flex flex-col">
          <div className="px-5 py-4 border-b border-slate-100 dark:border-zinc-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Percent className="w-4 h-4 text-slate-400" />
              <h2 className="text-sm font-extrabold text-slate-900 dark:text-white">Discount & Coupon Impact</h2>
            </div>
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{filter === 'all' ? 'All-Time' : 'Current Period'}</span>
          </div>

          <div className="p-6 flex-1 flex flex-col gap-6">

            {/* Visual stacked distribution bar */}
            <div>
              <div className="flex justify-between text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider mb-2">
                <span>Savings Distribution</span>
                <span>Total: {formatBDT(discountCouponImpact.totalDiscounts)}</span>
              </div>
              <div className="w-full h-4 bg-slate-100 dark:bg-zinc-800 rounded-full overflow-hidden flex shadow-inner">
                {discountCouponImpact.totalDiscounts > 0 ? (
                  <>
                    <div
                      className="h-full bg-gradient-to-r from-indigo-500 to-indigo-600 transition-all duration-300 flex items-center justify-center text-[8px] font-black text-white"
                      style={{ width: `${(discountCouponImpact.couponDiscountTotal / discountCouponImpact.totalDiscounts) * 100}%` }}
                      title={`Coupon: ${formatBDT(discountCouponImpact.couponDiscountTotal)}`}
                    >
                      {discountCouponImpact.couponDiscountTotal > 0 && "Coupon"}
                    </div>
                    <div
                      className="h-full bg-gradient-to-r from-amber-500 to-amber-600 transition-all duration-300 flex items-center justify-center text-[8px] font-black text-white"
                      style={{ width: `${(discountCouponImpact.manualDiscountTotal / discountCouponImpact.totalDiscounts) * 100}%` }}
                      title={`Discount: ${formatBDT(discountCouponImpact.manualDiscountTotal)}`}
                    >
                      {discountCouponImpact.manualDiscountTotal > 0 && "Discount"}
                    </div>
                  </>
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-[9px] font-bold text-slate-400">No discounts applied</div>
                )}
              </div>
              <div className="flex gap-4 mt-2 text-[10px] font-bold text-slate-400">
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-indigo-500" /> Coupon ({formatBDT(discountCouponImpact.couponDiscountTotal)})</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-amber-500" /> Discount ({formatBDT(discountCouponImpact.manualDiscountTotal)})</span>
              </div>
            </div>

            {/* Additional Discount KPI Metrics */}
            <div className="grid grid-cols-2 gap-4 border-t border-slate-100 dark:border-zinc-800/50 pt-4">
              <div className="p-3 bg-slate-50 dark:bg-zinc-950/20 rounded-xl border border-slate-100 dark:border-zinc-800/40 text-center">
                <p className="text-[9px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider">Coupon Revenue</p>
                <p className="text-base font-black text-slate-800 dark:text-zinc-200 mt-1">{formatBDT(discountCouponImpact.couponRevenue)}</p>
                <p className="text-[9px] text-slate-400 font-semibold mt-0.5">from {discountCouponImpact.couponOrdersCount} orders</p>
              </div>
              <div className="p-3 bg-slate-50 dark:bg-zinc-950/20 rounded-xl border border-slate-100 dark:border-zinc-800/40 text-center">
                <p className="text-[9px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider">Discounts share of Sales</p>
                <p className="text-base font-black text-rose-500 mt-1">
                  {summary.netSales > 0 ? ((discountCouponImpact.totalDiscounts / (summary.netSales + discountCouponImpact.totalDiscounts)) * 100).toFixed(1) : "0.0"}%
                </p>
                <p className="text-[9px] text-slate-400 font-semibold mt-0.5">ratio of gross sales</p>
              </div>
            </div>

            {/* Coupon performance leaderboard */}
            <div className="flex flex-col gap-3 pt-2 border-t border-slate-100 dark:border-zinc-800/50 flex-1">
              <h3 className="text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest pb-1 border-b border-slate-50 dark:border-zinc-800/30">Top Performing Coupons</h3>
              <div className="flex flex-col gap-2 flex-1 justify-center">
                {discountCouponImpact.couponSummary.length === 0 ? (
                  <p className="text-center text-xs text-slate-400 py-6">No coupons applied during this range.</p>
                ) : (
                  discountCouponImpact.couponSummary.map((coupon, idx) => (
                    <div key={coupon.code} className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50/50 dark:bg-zinc-950/10 border border-slate-100/50 dark:border-zinc-800/20 text-xs hover:border-slate-200 dark:hover:border-zinc-700 transition-all">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 bg-indigo-500/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 rounded-lg flex items-center justify-center text-[10px] font-black">{idx + 1}</span>
                        <div>
                          <p className="font-black text-slate-800 dark:text-zinc-200 tracking-wider uppercase">{coupon.code}</p>
                          <p className="text-[9px] text-slate-400 font-bold">{coupon.count} orders processed</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-extrabold text-slate-900 dark:text-white">Saved {formatBDT(coupon.discount)}</p>
                        <p className="text-[9px] text-slate-400 font-bold">Generated {formatBDT(coupon.revenue)}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

          </div>
        </div>

      </div>

    </div>
  );
}
