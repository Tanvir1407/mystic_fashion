"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Image from "next/image";
import UploadedImage from "@/components/UploadedImage";
import { Package, ShoppingCart, Truck, XCircle, DollarSign, TrendingUp, ArrowDownCircle, History, Eye, Plus, Users } from "lucide-react";
import { formatBDT } from "@/utils/formatPrice";
import { useAdminAuth, PermissionGuard } from "./AdminAuthContext";

interface Metrics {
  currentStockCount: number;
  pendingOrderQty: number;
  deliveredProductQty: number;
  cancelProductQty: number;
  totalProfit: number;
  totalSaleAmount: number;
  totalPurchaseAmount: number;
  totalCancelAmount: number;
}

interface DashboardClientProps {
  filter: string;
  metrics: Metrics;
  topProducts: any[];
  recentOrders: any[];
  chartData: { name: string; revenue: number; sales: number }[];
  topStaff: { username: string; email: string; orderCount: number }[];
}

const STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-amber-50 text-amber-600",
  CONFIRMED: "bg-blue-50 text-blue-600",
  PACKAGING: "bg-purple-50 text-purple-600",
  SHIPPED: "bg-indigo-50 text-indigo-600",
  DELIVERED: "bg-emerald-50 text-emerald-600",
  CANCELLED: "bg-red-50 text-red-600",
  HOLD: "bg-pink-50 text-pink-600",
};

export default function DashboardClient({ filter, metrics, topProducts, recentOrders, chartData, topStaff }: DashboardClientProps) {
  const router = useRouter();
  const { checkPermission } = useAdminAuth();

  const filters = [
    { label: "Weekly", value: "weekly" },
    { label: "Monthly", value: "monthly" },
    { label: "Yearly", value: "yearly" },
    { label: "All Time", value: "all" },
  ];

  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  // ── SVG Spline Chart Helpers ──
  const chartW = 800;
  const chartH = 240;
  const padX = 45;
  const padY = 20;
  const maxVal = Math.max(...chartData.map(d => Math.max(d.revenue, d.sales)), 1);
  const yMax = maxVal * 1.15; // 15% top padding for safe headroom

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

  const getBezierLinePath = (key: "revenue" | "sales") => {
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

  const getBezierAreaPath = (key: "revenue" | "sales") => {
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

  // ── Period Summary Metrics ──
  const periodTotalProfit = chartData.reduce((acc, d) => acc + d.revenue, 0);
  const periodTotalPurchases = chartData.reduce((acc, d) => acc + d.sales, 0);
  const periodNetFlow = periodTotalProfit - periodTotalPurchases;
  const periodProfitMargin = metrics.totalSaleAmount > 0 ? (metrics.totalProfit / metrics.totalSaleAmount) * 100 : 0;

  const metricCards = [
    // Row 1 — Quantity
    { label: "Current Stock", value: metrics.currentStockCount.toLocaleString(), suffix: "units", icon: Package, color: "bg-blue-500/10 text-blue-600" },
    { label: "Pending Orders", value: metrics.pendingOrderQty.toLocaleString(), suffix: "qty", icon: ShoppingCart, color: "bg-amber-500/10 text-amber-600" },
    { label: "Delivered", value: metrics.deliveredProductQty.toLocaleString(), suffix: "qty", icon: Truck, color: "bg-emerald-500/10 text-emerald-600" },
    { label: "Cancelled", value: metrics.cancelProductQty.toLocaleString(), suffix: "qty", icon: XCircle, color: "bg-red-500/10 text-red-600" },
    // Row 2 — Financial
    { label: "Total Profit", value: formatBDT(metrics.totalProfit), suffix: null, icon: TrendingUp, color: "bg-indigo-500/10 text-indigo-600" },
    { label: "Total Sales", value: formatBDT(metrics.totalSaleAmount), suffix: null, icon: DollarSign, color: "bg-emerald-500/10 text-emerald-600" },
    { label: "Total Purchases ", value: formatBDT(metrics.totalPurchaseAmount), suffix: null, icon: ArrowDownCircle, color: "bg-sky-500/10 text-sky-600" },
    { label: "Cancel Value", value: formatBDT(metrics.totalCancelAmount), suffix: null, icon: XCircle, color: "bg-red-500/10 text-red-600" },
  ];

  return (
    <div className="flex flex-col gap-6 pb-8">

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Dashboard</h1>
          <p className="text-xs text-slate-500 mt-0.5">Business performance at a glance.</p>
        </div>
        <div className="inline-flex bg-white border border-slate-200 p-0.5 rounded-lg shadow-sm">
          {filters.map(f => (
            <button
              key={f.value}
              onClick={() => router.push(`/admin?filter=${f.value}`)}
              className={`px-3 py-1 text-[11px] font-bold rounded-md transition-all ${filter === f.value
                ? "bg-slate-900 text-white shadow"
                : "text-slate-500 hover:text-slate-800"
                }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Quick Actions ── */}
      {(checkPermission("CREATE", "ORDERS") || checkPermission("CREATE", "PRODUCTS") || checkPermission("CREATE", "PURCHASES")) && (
        <div className="flex flex-wrap items-center gap-3 animate-in fade-in slide-in-from-top-1 duration-300">
          <PermissionGuard action="CREATE" subject="ORDERS">
            <Link
              href="/admin/orders/create"
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg shadow-sm text-xs font-bold uppercase tracking-wide transition-all hover:shadow-md active:scale-[0.97]"
            >
              <Plus className="w-3.5 h-3.5 stroke-[3]" />
              Create Order
            </Link>
          </PermissionGuard>

          <PermissionGuard action="CREATE" subject="PRODUCTS">
            <Link
              href="/admin/products/new"
              className="flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg shadow-sm text-xs font-bold uppercase tracking-wide transition-all hover:shadow-md active:scale-[0.97]"
            >
              <Plus className="w-3.5 h-3.5 stroke-[3]" />
              Add Product
            </Link>
          </PermissionGuard>

          <PermissionGuard action="CREATE" subject="PURCHASES">
            <Link
              href="/admin/purchases/new"
              className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg shadow-sm text-xs font-bold uppercase tracking-wide transition-all hover:shadow-sm active:scale-[0.97]"
            >
              <Plus className="w-3.5 h-3.5 stroke-[3] text-slate-400" />
              New Purchase
            </Link>
          </PermissionGuard>
        </div>
      )}

      {/* ── Metric Cards — 4 per row ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {metricCards.map((card, i) => {
          const Icon = card.icon;
          return (
            <div key={i} className="bg-white rounded-xl border border-slate-200/80 p-4 flex items-center gap-3 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${card.color}`}>
                <Icon className="w-[18px] h-[18px]" />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider truncate">{card.label}</p>
                <p className="text-lg font-extrabold text-slate-900 leading-tight mt-0.5 truncate">
                  {card.value}
                  {card.suffix && <span className="text-[10px] font-semibold text-slate-400 ml-1">{card.suffix}</span>}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Chart & Staff Layout Grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-7 gap-4">

        {/* ── Line Chart (3/4 space) ── */}
        <div className="lg:col-span-5 bg-white rounded-xl border border-slate-200/80 p-6 shadow-[0_4px_20px_rgba(0,0,0,0.02)] transition-all duration-300 hover:shadow-[0_8px_30px_rgba(0,0,0,0.04)]">

          {/* Chart Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 border-b border-slate-100 pb-5">
            <div>
              <h2 className="text-base font-extrabold text-slate-950 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-indigo-500" />
                Revenue & Cost Flow
              </h2>
            </div>
          </div>

          {chartData.length === 0 ? (
            <div className="h-60 flex items-center justify-center text-sm text-slate-400 font-medium">No sales or purchase data recorded for this period.</div>
          ) : (
            <div className="flex flex-col gap-6">

              {/* Interactive Chart Workspace */}
              <div className="relative">
                {/* Y-axis Labels & Reference Gridlines */}
                <div className="absolute inset-0 flex flex-col justify-between pointer-events-none" style={{ padding: `${padY}px 0`, bottom: `${padY}px` }}>
                  {[1.0, 0.75, 0.5, 0.25, 0].map((ratio, i) => {
                    const val = yMax * ratio;
                    return (
                      <div key={i} className="w-full flex items-center relative">
                        {/* Gridline */}
                        <div className="flex-1 border-t border-dashed border-slate-100" style={{ marginLeft: `${padX}px` }}></div>
                        {/* Label on the left */}
                        <span
                          className="absolute left-0 text-[9px] font-black text-slate-400 text-right pr-2"
                          style={{ width: `${padX}px`, transform: "translateY(-50%)" }}
                        >
                          {formatCompactBDT(val)}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* The SVG Artwork */}
                <svg viewBox={`0 0 ${chartW} ${chartH}`} className="w-full h-64 relative z-10 overflow-visible" preserveAspectRatio="none">
                  <defs>
                    {/* High fidelity gradients */}
                    <linearGradient id="profitGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#6366f1" stopOpacity="0.25" />
                      <stop offset="100%" stopColor="#6366f1" stopOpacity="0.0" />
                    </linearGradient>
                    <linearGradient id="purchaseGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.20" />
                      <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.0" />
                    </linearGradient>

                    {/* Drop shadow effects */}
                    <filter id="glow-indigo" x="-10%" y="-10%" width="120%" height="120%">
                      <feDropShadow dx="0" dy="4" stdDeviation="4" floodColor="#6366f1" floodOpacity="0.15" />
                    </filter>
                    <filter id="glow-amber" x="-10%" y="-10%" width="120%" height="120%">
                      <feDropShadow dx="0" dy="4" stdDeviation="4" floodColor="#f59e0b" floodOpacity="0.15" />
                    </filter>
                  </defs>

                  {/* Dotted Vertical Gridlines */}
                  {chartData.map((d, i) => {
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
                        stroke="#f1f5f9"
                        strokeWidth="1.5"
                        strokeDasharray="4 4"
                        className="transition-opacity duration-200"
                        style={{ opacity: hoveredIndex === i ? 1 : 0.4 }}
                      />
                    );
                  })}

                  {/* Curved Area Fills under Spline curves */}
                  <path d={getBezierAreaPath("revenue")} fill="url(#profitGrad)" className="transition-all duration-300" />
                  <path d={getBezierAreaPath("sales")} fill="url(#purchaseGrad)" className="transition-all duration-300" />

                  {/* Smooth Bezier lines */}
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
                  <path
                    d={getBezierLinePath("sales")}
                    fill="none"
                    stroke="#f59e0b"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    filter="url(#glow-amber)"
                    vectorEffect="non-scaling-stroke"
                  />

                  {/* Interactive coordinate points and guiding markers */}
                  {chartData.map((d, i) => {
                    const step = chartData.length === 1 ? (chartW - padX * 2) : (chartW - padX * 2) / (chartData.length - 1);
                    const x = chartData.length === 1 ? chartW / 2 : padX + i * step;
                    const yRev = chartH - padY - ((d.revenue / yMax) * (chartH - padY * 2));
                    const ySales = chartH - padY - ((d.sales / yMax) * (chartH - padY * 2));

                    const isHovered = hoveredIndex === i;

                    return (
                      <g key={i} className="transition-transform duration-200">
                        {/* Profit Dot */}
                        <circle
                          cx={x}
                          cy={yRev}
                          r={isHovered ? "7" : "4.5"}
                          fill="#ffffff"
                          stroke="#6366f1"
                          strokeWidth={isHovered ? "3.5" : "2"}
                          vectorEffect="non-scaling-stroke"
                          className="transition-all duration-150 shadow-md"
                        />

                        {/* Purchase Dot */}
                        <circle
                          cx={x}
                          cy={ySales}
                          r={isHovered ? "7" : "4.5"}
                          fill="#ffffff"
                          stroke="#f59e0b"
                          strokeWidth={isHovered ? "3.5" : "2"}
                          vectorEffect="non-scaling-stroke"
                          className="transition-all duration-150 shadow-md"
                        />
                      </g>
                    );
                  })}
                </svg>

                {/* X-axis timeline labels */}
                <div className="flex justify-between mt-3" style={{ paddingLeft: `${padX}px`, paddingRight: `${padX - 10}px` }}>
                  {chartData.length === 1 ? (
                    <span className="text-[10px] font-bold text-slate-400 text-center w-full bg-slate-50 py-1 rounded">
                      {chartData[0].name}
                    </span>
                  ) : (
                    chartData.map((d, i) => {
                      const showLabel = i % Math.ceil(chartData.length / 8) === 0 || chartData.length <= 12;
                      return (
                        <span
                          key={i}
                          className={`text-[10px] font-bold text-slate-400 transition-colors duration-200 ${hoveredIndex === i ? "text-slate-800 font-extrabold" : ""
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
                    })
                  )}
                </div>

                {/* Transparent columns for ultra-responsive hover hit detection */}
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

                {/* High-fidelity custom React HTML Tooltip card */}
                {hoveredIndex !== null && (
                  <div
                    className="absolute z-40 bg-white/95 backdrop-blur-md rounded-xl border border-slate-200/90 p-4 shadow-[0_10px_35px_rgba(0,0,0,0.12)] pointer-events-none flex flex-col gap-2 transition-all duration-200"
                    style={{
                      left: `${padX + (hoveredIndex / (chartData.length - 1)) * (chartW - padX * 2) * 100 / chartW}%`,
                      transform: `translate(${hoveredIndex < chartData.length / 2 ? "16px" : "-108%"}, -50%)`,
                      top: "45%",
                      minWidth: "220px",
                    }}
                  >
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-1">
                      <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">
                        {chartData[hoveredIndex].name}
                      </span>
                      <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded tracking-wider ${chartData[hoveredIndex].revenue - chartData[hoveredIndex].sales >= 0
                        ? "bg-emerald-50 text-emerald-600 border border-emerald-100"
                        : "bg-rose-50 text-rose-600 border border-rose-100"
                        }`}>
                        {chartData[hoveredIndex].revenue - chartData[hoveredIndex].sales >= 0 ? "Surplus" : "Deficit"}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500 font-semibold flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-indigo-500 inline-block"></span>
                        Realized Profit:
                      </span>
                      <span className="font-extrabold text-indigo-600">
                        {formatBDT(chartData[hoveredIndex].revenue)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500 font-semibold flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-amber-500 inline-block"></span>
                        Stock Purchases:
                      </span>
                      <span className="font-extrabold text-amber-600">
                        {formatBDT(chartData[hoveredIndex].sales)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs border-t border-slate-100 pt-2 mt-1">
                      <span className="text-slate-800 font-extrabold">Net Flow Balance:</span>
                      <span className={`font-black ${chartData[hoveredIndex].revenue - chartData[hoveredIndex].sales >= 0
                        ? "text-emerald-600"
                        : "text-rose-600"
                        }`}>
                        {formatBDT(chartData[hoveredIndex].revenue - chartData[hoveredIndex].sales)}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ── Top Performing Staff (1/4 space) ── */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200/80 p-6 shadow-[0_4px_20px_rgba(0,0,0,0.02)] flex flex-col gap-5 transition-all duration-300 hover:shadow-[0_8px_30px_rgba(0,0,0,0.04)]">
          <div>
            <h2 className="text-base font-extrabold text-slate-950 flex items-center gap-2">
              <Users className="w-5 h-5 text-indigo-500" />
              Top Performers
            </h2>
          </div>

          <div className="flex-1 flex flex-col justify-start divide-y divide-slate-100">
            {topStaff.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400 font-medium flex flex-col items-center gap-2">
                <Users className="w-8 h-8 text-slate-300" />
                No staff orders recorded.
              </div>
            ) : (
              topStaff.map((staff, idx) => {
                const badgeStyles = [
                  { fill: "#f59e0b", stroke: "#d97706", text: "text-amber-950", shadow: "drop-shadow-[0_2px_8px_rgba(245,158,11,0.25)]" },
                  { fill: "#94a3b8", stroke: "#475569", text: "text-slate-950", shadow: "drop-shadow-[0_2px_8px_rgba(148,163,184,0.25)]" },
                  { fill: "#ea580c", stroke: "#b45309", text: "text-orange-950", shadow: "drop-shadow-[0_2px_8px_rgba(234,88,12,0.25)]" },
                ][idx] || { fill: "#cbd5e1", stroke: "#94a3b8", text: "text-slate-800", shadow: "" };

                return (
                  <div key={idx} className="flex items-center gap-3 py-3.5 first:pt-1 last:pb-1">
                    {/* Ranking Shield Badge */}
                    <div className={`relative w-8 h-8 flex items-center justify-center shrink-0 ${badgeStyles.shadow}`}>
                      <svg viewBox="0 0 32 32" className="w-full h-full">
                        <path
                          d="M16 3 L26 7 C26 19 19 26 16 29 C13 26 6 19 6 7 Z"
                          fill={badgeStyles.fill}
                          stroke={badgeStyles.stroke}
                          strokeWidth="1.5"
                          strokeLinejoin="round"
                        />
                      </svg>
                      <span className={`absolute text-xs font-black ${badgeStyles.text}`} style={{ top: "45%", transform: "translateY(-50%)" }}>
                        {idx + 1}
                      </span>
                    </div>

                    {/* Credentials */}
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-extrabold text-slate-800 truncate">{staff.username}</p>
                      <p className="text-[10px] text-slate-400 font-medium truncate">{staff.email}</p>
                    </div>

                    {/* Performance Pill */}
                    <div className="flex-shrink-0">
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-slate-50 text-slate-700 border border-slate-200/60 shadow-sm">
                        {staff.orderCount} {staff.orderCount === 1 ? "Order" : "Orders"}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

      </div>

      {/* ── Bottom Grid: Top Products + Recent Orders ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Top 5 Products */}
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.04)] overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-100 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-indigo-500" />
            <h2 className="text-sm font-bold text-slate-900">Top Selling Products</h2>
          </div>
          <div className="divide-y divide-slate-50">
            {topProducts.length === 0 ? (
              <div className="px-5 py-8 text-center text-sm text-slate-400">No sales data for this period.</div>
            ) : (
              topProducts.map((p, idx) => (
                <div key={idx} className="flex items-center gap-3 px-5 py-3 hover:bg-slate-50/60 transition-colors">
                  <span className="text-xs font-black text-slate-300 w-4 text-right">{idx + 1}</span>
                  <div className="w-9 h-9 rounded-lg overflow-hidden relative flex-shrink-0 bg-slate-100 border border-slate-200">
                    {p.image ? (
                      <UploadedImage src={p.image} alt={p.name} fill className="object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-300"><Package className="w-4 h-4" /></div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-slate-800 truncate">{p.name}</p>
                    <p className="text-[11px] text-slate-400 font-semibold">{p.sold} sold</p>
                  </div>
                  <p className="text-sm font-extrabold text-slate-900 flex-shrink-0">{formatBDT(p.revenue)}</p>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent Orders */}
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.04)] overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <History className="w-4 h-4 text-slate-400" />
              <h2 className="text-sm font-bold text-slate-900">Recent Orders</h2>
            </div>
            <Link href="/admin/orders" className="text-[11px] font-bold text-indigo-500 hover:text-indigo-700 transition-colors uppercase tracking-wider">
              View All →
            </Link>
          </div>
          <div className="divide-y divide-slate-50">
            {recentOrders.length === 0 ? (
              <div className="px-5 py-8 text-center text-sm text-slate-400">No orders in this period.</div>
            ) : (
              recentOrders.map((order) => (
                <div key={order.id} className="flex items-center justify-between px-5 py-3 hover:bg-slate-50/60 transition-colors">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-slate-800 truncate">{order.customerName}</p>
                    <p className="text-[11px] text-slate-400 font-semibold">{new Date(order.createdAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</p>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <span className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded tracking-wider ${STATUS_COLORS[order.status] || "bg-slate-100 text-slate-600"}`}>
                      {order.status}
                    </span>
                    <p className="text-sm font-extrabold text-slate-900 min-w-[70px] text-right">{formatBDT(order.totalAmount)}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
