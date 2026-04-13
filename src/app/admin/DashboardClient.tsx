"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Package, ShoppingCart, Truck, XCircle, DollarSign, TrendingUp, ArrowDownCircle, History, Eye } from "lucide-react";

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
}

const STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-amber-50 text-amber-600",
  CONFIRMED: "bg-blue-50 text-blue-600",
  PACKAGING: "bg-purple-50 text-purple-600",
  SHIPPED: "bg-indigo-50 text-indigo-600",
  DELIVERED: "bg-emerald-50 text-emerald-600",
  CANCELLED: "bg-red-50 text-red-600",
};

export default function DashboardClient({ filter, metrics, topProducts, recentOrders, chartData }: DashboardClientProps) {
  const router = useRouter();
  const fmt = (n: number) => `৳${n.toLocaleString("en-IN")}`;

  const filters = [
    { label: "Weekly", value: "weekly" },
    { label: "Monthly", value: "monthly" },
    { label: "Yearly", value: "yearly" },
    { label: "All Time", value: "all" },
  ];

  // ── SVG Line Chart Helpers ──
  const chartW = 800;
  const chartH = 200;
  const padX = 0;
  const padY = 10;
  const maxVal = Math.max(...chartData.map(d => Math.max(d.revenue, d.sales)), 1);

  const toPoints = (key: "revenue" | "sales") => {
    if (chartData.length === 0) return "";
    const step = chartData.length > 1 ? (chartW - padX * 2) / (chartData.length - 1) : 0;
    return chartData.map((d, i) => {
      const x = padX + i * step;
      const y = chartH - padY - ((d[key] / maxVal) * (chartH - padY * 2));
      return `${x},${y}`;
    }).join(" ");
  };

  const toArea = (key: "revenue" | "sales") => {
    if (chartData.length === 0) return "";
    const step = chartData.length > 1 ? (chartW - padX * 2) / (chartData.length - 1) : 0;
    const points = chartData.map((d, i) => {
      const x = padX + i * step;
      const y = chartH - padY - ((d[key] / maxVal) * (chartH - padY * 2));
      return `${x},${y}`;
    });
    const lastX = padX + (chartData.length - 1) * step;
    return `${padX},${chartH - padY} ${points.join(" ")} ${lastX},${chartH - padY}`;
  };

  const metricCards = [
    // Row 1 — Quantity
    { label: "Current Stock", value: metrics.currentStockCount.toLocaleString(), suffix: "units", icon: Package, color: "bg-blue-500/10 text-blue-600" },
    { label: "Pending Orders", value: metrics.pendingOrderQty.toLocaleString(), suffix: "qty", icon: ShoppingCart, color: "bg-amber-500/10 text-amber-600" },
    { label: "Delivered", value: metrics.deliveredProductQty.toLocaleString(), suffix: "qty", icon: Truck, color: "bg-emerald-500/10 text-emerald-600" },
    { label: "Cancelled", value: metrics.cancelProductQty.toLocaleString(), suffix: "qty", icon: XCircle, color: "bg-red-500/10 text-red-600" },
    // Row 2 — Financial
    { label: "Total Profit", value: fmt(metrics.totalProfit), suffix: null, icon: TrendingUp, color: "bg-indigo-500/10 text-indigo-600" },
    { label: "Total Sales", value: fmt(metrics.totalSaleAmount), suffix: null, icon: DollarSign, color: "bg-emerald-500/10 text-emerald-600" },
    { label: "Total Purchases ", value: fmt(metrics.totalPurchaseAmount), suffix: null, icon: ArrowDownCircle, color: "bg-sky-500/10 text-sky-600" },
    { label: "Cancel Value", value: fmt(metrics.totalCancelAmount), suffix: null, icon: XCircle, color: "bg-red-500/10 text-red-600" },
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

      {/* ── Line Chart ── */}
      <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-bold text-slate-900">Revenue & Cost Trend</h2>
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5 text-[11px] font-semibold text-indigo-500"><span className="w-3 h-[3px] rounded-full bg-indigo-500 inline-block"></span>Profit (Realized)</span>
            <span className="flex items-center gap-1.5 text-[11px] font-semibold text-orange-400"><span className="w-3 h-[3px] rounded-full bg-orange-400 inline-block"></span>Total Purchases</span>
          </div>
        </div>

        {chartData.length === 0 ? (
          <div className="h-52 flex items-center justify-center text-sm text-slate-400">No data for this period.</div>
        ) : (
          <div className="relative">
            {/* Y-axis reference lines */}
            <div className="absolute inset-0 flex flex-col justify-between pointer-events-none" style={{ padding: `${padY}px 0` }}>
              {[0, 1, 2, 3].map(i => <div key={i} className="border-t border-slate-100"></div>)}
            </div>

            <svg viewBox={`0 0 ${chartW} ${chartH}`} className="w-full h-52 relative z-10" preserveAspectRatio="none">
              <defs>
                <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#6366f1" stopOpacity="0.15" />
                  <stop offset="100%" stopColor="#6366f1" stopOpacity="0" />
                </linearGradient>
                <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#fb923c" stopOpacity="0.12" />
                  <stop offset="100%" stopColor="#fb923c" stopOpacity="0" />
                </linearGradient>
              </defs>

              {/* Area fills */}
              <polygon points={toArea("revenue")} fill="url(#revGrad)" />
              <polygon points={toArea("sales")} fill="url(#salesGrad)" />

              {/* Lines */}
              <polyline points={toPoints("revenue")} fill="none" stroke="#6366f1" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
              <polyline points={toPoints("sales")} fill="none" stroke="#fb923c" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />

              {/* Dots */}
              {chartData.map((d, i) => {
                const step = chartData.length > 1 ? (chartW) / (chartData.length - 1) : 0;
                const x = i * step;
                const yRev = chartH - padY - ((d.revenue / maxVal) * (chartH - padY * 2));
                const ySales = chartH - padY - ((d.sales / maxVal) * (chartH - padY * 2));
                return (
                  <g key={i}>
                    <circle cx={x} cy={yRev} r="4" fill="#fff" stroke="#6366f1" strokeWidth="2" vectorEffect="non-scaling-stroke" />
                    <circle cx={x} cy={ySales} r="4" fill="#fff" stroke="#fb923c" strokeWidth="2" vectorEffect="non-scaling-stroke" />
                  </g>
                );
              })}
            </svg>

            {/* X-axis labels */}
            <div className="flex justify-between mt-2 px-0">
              {chartData.map((d, i) => (
                <span key={i} className="text-[10px] font-semibold text-slate-400 text-center" style={{ width: `${100 / chartData.length}%` }}>
                  {i % Math.ceil(chartData.length / 10) === 0 || chartData.length <= 12 ? d.name : ""}
                </span>
              ))}
            </div>
          </div>
        )}
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
                      <Image src={p.image} alt={p.name} fill className="object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-300"><Package className="w-4 h-4" /></div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-slate-800 truncate">{p.name}</p>
                    <p className="text-[11px] text-slate-400 font-semibold">{p.sold} sold</p>
                  </div>
                  <p className="text-sm font-extrabold text-slate-900 flex-shrink-0">{fmt(p.revenue)}</p>
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
                    <p className="text-sm font-extrabold text-slate-900 min-w-[70px] text-right">{fmt(order.totalAmount)}</p>
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
