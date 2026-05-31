"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, TrendingUp, ShoppingBag, Coins, CheckCircle2, User, Mail, Shield, ChevronLeft, ChevronRight, Activity, Calendar, Wallet, Plus, Loader2, X } from "lucide-react";
import { formatBDT } from "@/utils/formatPrice";
import { formatDate } from "@/utils/formatDate";
import { createCommissionPayment } from "../actions";

function CommissionPanel({
  staffId,
  commissionSummary,
  recentPayments,
  currentMonth,
  currentYear,
}: {
  staffId: string;
  commissionSummary: any;
  recentPayments: any[];
  currentMonth: number;
  currentYear: number;
}) {
  const [showModal, setShowModal] = useState(false);
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [payments, setPayments] = useState(recentPayments);
  const [summary, setSummary] = useState(commissionSummary);

  const monthName = new Date(currentYear, currentMonth - 1).toLocaleString("en-US", { month: "long" });

  const handlePay = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const res = await createCommissionPayment({
      staffId,
      amount: parseFloat(amount),
      month: currentMonth,
      year: currentYear,
      note: note.trim() || undefined,
    });
    if (res.success) {
      const paid = parseFloat(amount);
      setSummary((prev: any) => ({
        ...prev,
        paid: prev.paid + paid,
        pending: Math.max(0, prev.pending - paid),
      }));
      setPayments((prev) => [res.data, ...prev]);
      setShowModal(false);
      setAmount("");
      setNote("");
    }
    setLoading(false);
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <Wallet className="w-4 h-4 text-slate-500" />
          <h3 className="text-sm font-semibold text-slate-900">Commission — {monthName} {currentYear}</h3>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 text-white text-xs font-medium rounded-lg hover:bg-slate-800 transition-colors"
        >
          <Plus className="w-3 h-3" /> Record Payment
        </button>
      </div>

      <div className="grid grid-cols-3 divide-x divide-slate-100 border-b border-slate-100">
        <div className="p-4">
          <p className="text-xs text-slate-500">Rate</p>
          <p className="text-lg font-bold text-slate-900">{summary.rate}%</p>
        </div>
        <div className="p-4">
          <p className="text-xs text-slate-500">Earned</p>
          <p className="text-lg font-bold text-green-700">{formatBDT(summary.earned)}</p>
        </div>
        <div className="p-4">
          <p className="text-xs text-slate-500">Pending</p>
          <p className={`text-lg font-bold ${summary.pending > 0 ? "text-amber-600" : "text-slate-900"}`}>
            {formatBDT(summary.pending)}
          </p>
        </div>
      </div>

      {payments.length > 0 && (
        <div className="divide-y divide-slate-100">
          <p className="px-5 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide bg-slate-50">Payment History</p>
          {payments.map((p: any) => (
            <div key={p.id} className="flex items-center justify-between px-5 py-3">
              <div>
                <p className="text-sm font-medium text-slate-900">{formatBDT(p.amount)}</p>
                {p.note && <p className="text-xs text-slate-400">{p.note}</p>}
              </div>
              <div className="text-right">
                <p className="text-xs text-slate-500">{formatDate(p.paidAt)}</p>
                <p className="text-xs text-slate-400">{new Date(p.year, p.month - 1).toLocaleString("en-US", { month: "short", year: "numeric" })}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Payment Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm border border-slate-200">
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <h3 className="text-sm font-semibold text-slate-900">Record Commission Payment</h3>
              <button onClick={() => setShowModal(false)} className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-md transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handlePay} className="p-5 space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-700">Amount (৳)</label>
                <input
                  type="number"
                  min={1}
                  step={0.01}
                  required
                  autoFocus
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder={`Pending: ${formatBDT(summary.pending)}`}
                  className="w-full text-sm px-3 py-2 border border-slate-200 rounded-lg focus:border-slate-400 focus:outline-none"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-700">Note (optional)</label>
                <input
                  type="text"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="e.g. bKash transfer"
                  className="w-full text-sm px-3 py-2 border border-slate-200 rounded-lg focus:border-slate-400 focus:outline-none"
                />
              </div>
              <div className="flex gap-2 pt-1">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 h-10 flex items-center justify-center gap-2 bg-slate-900 text-white text-sm font-medium rounded-lg hover:bg-slate-800 transition-colors disabled:opacity-50"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Confirm Payment"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="h-10 px-4 border border-slate-200 text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default function StaffDetailsClient({
  staff,
  commissionSummary,
  recentPayments,
  currentMonth,
  currentYear,
}: {
  staff: any;
  commissionSummary: any;
  recentPayments: any[];
  currentMonth: number;
  currentYear: number;
}) {
  const [chartMode, setChartMode] = useState<"daily" | "cumulative">("daily");
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  const orders = staff.orders || [];
  const [ledgerPage, setLedgerPage] = useState(1);
  const ledgerPerPage = 10;
  const totalLedgerPages = Math.ceil(orders.length / ledgerPerPage);
  const paginatedOrders = orders.slice((ledgerPage - 1) * ledgerPerPage, ledgerPage * ledgerPerPage);
  const totalOrders = orders.length;

  // Group sales by date
  const salesByDate: Record<string, number> = {};
  const ordersCountByDate: Record<string, number> = {};

  // Last 30 days
  const datesList: string[] = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split("T")[0];
    datesList.push(dateStr);
    salesByDate[dateStr] = 0;
    ordersCountByDate[dateStr] = 0;
  }

  orders.forEach((o: any) => {
    const dateStr = new Date(o.createdAt).toISOString().split("T")[0];
    if (salesByDate[dateStr] !== undefined) {
      salesByDate[dateStr] += o.totalAmount;
      ordersCountByDate[dateStr] += 1;
    }
  });

  let cumulative = 0;
  const chartData = datesList.map((dateStr) => {
    const dailyAmount = salesByDate[dateStr];
    cumulative += dailyAmount;

    const d = new Date(dateStr);
    const label = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });

    return {
      date: dateStr,
      label,
      daily: dailyAmount,
      cumulative,
      count: ordersCountByDate[dateStr],
    };
  });

  const activeValues = chartData.map(d => chartMode === "daily" ? d.daily : d.cumulative);
  const maxVal = Math.max(...activeValues, 1000);

  // Chart dimensions
  const width = 1000;
  const height = 240;
  const paddingX = 60;
  const paddingY = 30;

  // Coordinate mapping
  const points = chartData.map((d, index) => {
    const val = chartMode === "daily" ? d.daily : d.cumulative;
    const x = paddingX + (index / (chartData.length - 1)) * (width - 2 * paddingX);
    const y = height - paddingY - (val / maxVal) * (height - 2 * paddingY);
    return { x, y, data: d };
  });

  // SVG Line path
  const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");

  // SVG Area path under the line
  const areaPath = points.length > 0
    ? `${linePath} L ${points[points.length - 1].x} ${height - paddingY} L ${points[0].x} ${height - paddingY} Z`
    : "";

  // Mouse move handler to find nearest data point
  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement, MouseEvent>) => {
    const svg = e.currentTarget;
    const rect = svg.getBoundingClientRect();
    const mouseX = ((e.clientX - rect.left) / rect.width) * width;

    let nearestIndex = 0;
    let minDistance = Infinity;
    points.forEach((p, index) => {
      const distance = Math.abs(p.x - mouseX);
      if (distance < minDistance) {
        minDistance = distance;
        nearestIndex = index;
      }
    });

    setHoveredIndex(nearestIndex);
    setMousePos({ x: points[nearestIndex].x, y: points[nearestIndex].y });
  };

  // Calculate statistics
  const totalSales = orders.reduce((sum: number, o: any) => sum + o.totalAmount, 0);
  const aov = totalOrders > 0 ? totalSales / totalOrders : 0;

  const deliveredCount = orders.filter((o: any) => o.status === "DELIVERED").length;
  const cancelledCount = orders.filter((o: any) => o.status === "CANCELLED").length;
  const returnedCount = orders.filter((o: any) => o.status === "RETURNED").length;

  const activeOrdersCount = totalOrders - (cancelledCount + returnedCount);
  const successRate = activeOrdersCount > 0 ? (deliveredCount / activeOrdersCount) * 100 : 0;

  // Status breakdown
  const statusList = [
    { key: "PENDING", label: "Pending", color: "bg-amber-500", text: "text-amber-700", bg: "bg-amber-50" },
    { key: "CONFIRMED", label: "Confirmed", color: "bg-blue-500", text: "text-blue-700", bg: "bg-blue-50" },
    { key: "PRINTING", label: "Printing", color: "bg-cyan-500", text: "text-cyan-700", bg: "bg-cyan-50" },
    { key: "PACKAGING", label: "Packaging", color: "bg-purple-500", text: "text-purple-700", bg: "bg-purple-50" },
    { key: "SHIPPED", label: "Shipped", color: "bg-indigo-500", text: "text-indigo-700", bg: "bg-indigo-50" },
    { key: "DELIVERED", label: "Delivered", color: "bg-green-500", text: "text-green-700", bg: "bg-green-50" },
    { key: "RETURNED", label: "Returned", color: "bg-rose-500", text: "text-rose-700", bg: "bg-rose-50" },
    { key: "CANCELLED", label: "Cancelled", color: "bg-red-500", text: "text-red-700", bg: "bg-red-50" }
  ];

  const getStatusCount = (statusKey: string) => {
    return orders.filter((o: any) => o.status === statusKey).length;
  };

  return (
    <div className="space-y-6">
      {/* Header breadcrumbs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-6">
        <div className="flex items-center gap-4">
          <Link href="/admin/staff" className="p-2 bg-white border border-slate-200  text-slate-500 hover:text-slate-900  transition-colors hover:bg-slate-50 shrink-0">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 flex flex-wrap items-center gap-3">
              {staff.username}
              {staff.role && (
                <span className="inline-flex items-center  bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700 ring-1 ring-inset ring-indigo-700/10">
                  {staff.role.name}
                </span>
              )}
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 flex items-center gap-2 mt-1">
              <Mail className="w-3.5 h-3.5" />
              {staff.email}
            </p>
          </div>
        </div>
        <div className="text-right text-xs text-slate-400 font-medium flex items-center gap-1.5 justify-end">
          <Calendar className="w-4 h-4 text-slate-300" />
          Joined: {new Date(staff.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
        </div>
      </div>

      {/* KPI Performance Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* KPI 1: Sales generated */}
        <div className="bg-white border border-slate-200  p-5  relative overflow-hidden transition-all hover: group">
          <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:scale-110 transition-transform">
            <TrendingUp className="w-24 h-24 text-emerald-500" />
          </div>
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-emerald-50 text-emerald-600  border border-emerald-100">
              <TrendingUp className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Sales Revenue</span>
          </div>
          <p className="text-2xl font-black text-slate-900 tracking-tight leading-none mb-1 font-mono">
            {formatBDT(totalSales)}
          </p>
          <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100/50 uppercase tracking-wider">
            Total sales generated
          </span>
        </div>

        {/* KPI 2: Total Orders */}
        <div className="bg-white border border-slate-200  p-5  relative overflow-hidden transition-all hover: group">
          <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:scale-110 transition-transform">
            <ShoppingBag className="w-24 h-24 text-slate-500" />
          </div>
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-slate-50 text-slate-600  border border-slate-200">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Orders Logged</span>
          </div>
          <p className="text-2xl font-black text-slate-900 tracking-tight leading-none mb-1">
            {totalOrders}
          </p>
          <span className="text-[10px] font-bold text-slate-500 bg-slate-50 px-2 py-0.5 rounded border border-slate-200/50 uppercase tracking-wider">
            Individual transactions
          </span>
        </div>

        {/* KPI 3: AOV */}
        <div className="bg-white border border-slate-200  p-5  relative overflow-hidden transition-all hover: group">
          <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:scale-110 transition-transform">
            <Coins className="w-24 h-24 text-indigo-500" />
          </div>
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-indigo-50 text-indigo-600  border border-indigo-100">
              <Coins className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Avg Order Value</span>
          </div>
          <p className="text-2xl font-black text-slate-900 tracking-tight leading-none mb-1 font-mono">
            {formatBDT(aov)}
          </p>
          <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100/50 uppercase tracking-wider">
            Average ticket size
          </span>
        </div>

        {/* KPI 4: Success rate */}
        <div className="bg-white border border-slate-200  p-5  relative overflow-hidden transition-all hover: group">
          <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:scale-110 transition-transform">
            <CheckCircle2 className="w-24 h-24 text-indigo-500" />
          </div>
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-indigo-50 text-indigo-600  border border-indigo-100">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Delivery Success</span>
          </div>
          <p className="text-2xl font-black text-slate-900 tracking-tight leading-none mb-1">
            {successRate.toFixed(1)}%
          </p>
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase tracking-wider ${successRate >= 80 ? "text-emerald-600 bg-emerald-50 border-emerald-100" :
            successRate >= 50 ? "text-amber-600 bg-amber-50 border-amber-100" :
              "text-rose-600 bg-rose-50 border-rose-100"
            }`}>
            Delivered vs. Cancelled/Returned
          </span>
        </div>
      </div>

      {/* Trading Style Performance Chart */}
      <div className="bg-white border border-slate-200 p-6 shadow-sm relative overflow-hidden text-slate-900">
        {/* Neon Trading Grid Background details */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(16,185,129,0.03),rgba(255,255,255,0))]" />

        <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>

            <h2 className="text-lg font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
              <Activity className="w-5 h-5 text-emerald-500" />
              Sales Executive Performance Report
            </h2>
          </div>

          {/* Chart Controls */}
          <div className="flex bg-slate-100 border border-slate-250 p-0.5 rounded-lg shrink-0">
            <button
              onClick={() => setChartMode("daily")}
              className={`px-3 py-1.5 text-xs font-bold uppercase tracking-wider rounded-md transition-all cursor-pointer ${chartMode === "daily"
                  ? "bg-emerald-500 text-white shadow-sm font-extrabold"
                  : "text-slate-500 hover:text-slate-800"
                }`}
            >
              Daily Revenue
            </button>
            <button
              onClick={() => setChartMode("cumulative")}
              className={`px-3 py-1.5 text-xs font-bold uppercase tracking-wider rounded-md transition-all cursor-pointer ${chartMode === "cumulative"
                  ? "bg-emerald-500 text-white shadow-sm font-extrabold"
                  : "text-slate-500 hover:text-slate-800"
                }`}
            >
              Cumulative Growth
            </button>
          </div>
        </div>

        {/* Chart Viewport */}
        <div className="relative w-full h-[240px]">
          {/* SVG Chart */}
          <svg
            className="w-full h-full cursor-crosshair overflow-visible select-none"
            viewBox={`0 0 ${width} ${height}`}
            preserveAspectRatio="none"
            onMouseMove={handleMouseMove}
            onMouseLeave={() => setHoveredIndex(null)}
          >
            <defs>
              {/* Neon Green Fill Gradient */}
              <linearGradient id="glow-area" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#10b981" stopOpacity="0.15" />
                <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
              </linearGradient>
            </defs>

            {/* Horizontal Gridlines */}
            {[0, 0.25, 0.5, 0.75, 1].map((ratio, index) => {
              const y = paddingY + ratio * (height - 2 * paddingY);
              const gridVal = maxVal - ratio * maxVal;
              return (
                <g key={index}>
                  <line
                    x1={paddingX}
                    y1={y}
                    x2={width - paddingX}
                    y2={y}
                    stroke="#e2e8f0"
                    strokeWidth="1"
                    strokeDasharray="4 6"
                  />
                  {/* Y Axis Labels */}
                  <text
                    x={paddingX - 10}
                    y={y + 4}
                    textAnchor="end"
                    fill="#94a3b8"
                    className="text-[9px] font-mono font-bold"
                  >
                    {formatBDT(gridVal).replace("৳", "৳ ")}
                  </text>
                </g>
              );
            })}

            {/* Empty State Overlay */}
            {totalOrders === 0 && (
              <text
                x={width / 2}
                y={height / 2}
                textAnchor="middle"
                fill="#94a3b8"
                className="text-xs font-bold uppercase tracking-widest italic"
              >
                No sales records plotted // Awaiting first order
              </text>
            )}

            {/* Glowing Trading Area Under Line */}
            {totalOrders > 0 && areaPath && (
              <path d={areaPath} fill="url(#glow-area)" />
            )}

            {/* Main Trading Line Path */}
            {totalOrders > 0 && linePath && (
              <path
                d={linePath}
                fill="none"
                stroke="#10b981"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="drop-shadow-[0_2px_4px_rgba(16,185,129,0.2)]"
              />
            )}

            {/* Interactive Crosshairs when Hovered */}
            {hoveredIndex !== null && (
              <g>
                {/* Vertical line */}
                <line
                  x1={mousePos.x}
                  y1={paddingY}
                  x2={mousePos.x}
                  y2={height - paddingY}
                  stroke="#cbd5e1"
                  strokeWidth="1"
                  strokeDasharray="3 3"
                />
                {/* Horizontal line */}
                <line
                  x1={paddingX}
                  y1={mousePos.y}
                  x2={width - paddingX}
                  y2={mousePos.y}
                  stroke="#cbd5e1"
                  strokeWidth="1"
                  strokeDasharray="3 3"
                />
                {/* Intersection glow point */}
                <circle
                  cx={mousePos.x}
                  cy={mousePos.y}
                  r="6"
                  fill="#10b981"
                  className="animate-ping opacity-75"
                />
                <circle
                  cx={mousePos.x}
                  cy={mousePos.y}
                  r="4"
                  fill="#10b981"
                  stroke="#ffffff"
                  strokeWidth="1.5"
                />
              </g>
            )}

            {/* X-Axis Date Labels */}
            {chartData.map((d, index) => {
              // Render label every 5 days to avoid crowding
              if (index % 5 !== 0 && index !== chartData.length - 1) return null;
              const x = paddingX + (index / (chartData.length - 1)) * (width - 2 * paddingX);
              return (
                <text
                  key={index}
                  x={x}
                  y={height - 10}
                  textAnchor="middle"
                  fill="#94a3b8"
                  className="text-[9px] font-mono font-bold uppercase tracking-wider"
                >
                  {d.label}
                </text>
              );
            })}
          </svg>

          {/* Interactive Trading Floating Tooltip */}
          {hoveredIndex !== null && (
            <div
              className="absolute pointer-events-none bg-white/95 border border-slate-200 p-3 shadow-xl rounded-lg backdrop-blur-sm flex flex-col gap-1 z-20 min-w-[140px]"
              style={{
                left: `${(mousePos.x / width) * 100}%`,
                top: `${(mousePos.y / height) * 100 - 95}%`,
                transform: "translateX(-50%)",
              }}
            >
              <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider">
                {chartData[hoveredIndex].date}
              </span>
              <div className="h-px bg-slate-100 my-1" />
              <div className="flex justify-between items-center gap-4 text-xs font-semibold">
                <span className="text-slate-400">Revenue:</span>
                <span className="text-emerald-600 font-mono">
                  {formatBDT(chartData[hoveredIndex].daily)}
                </span>
              </div>
              <div className="flex justify-between items-center gap-4 text-xs font-semibold">
                <span className="text-slate-400">Total:</span>
                <span className="text-indigo-600 font-mono">
                  {formatBDT(chartData[hoveredIndex].cumulative)}
                </span>
              </div>
              <div className="flex justify-between items-center gap-4 text-xs font-semibold">
                <span className="text-slate-400">Orders:</span>
                <span className="text-slate-800 font-mono">
                  {chartData[hoveredIndex].count}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Main Grid: Left Column (Breakdowns), Right Column (Order log) */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

        {/* Left Column: Lifecycle, Role Permissions */}
        <div className="lg:col-span-2 space-y-6">

          {/* Order Status Distribution */}
          <div className="bg-white border border-slate-200  p-5 sm:p-6 ">
            <h3 className="font-bold text-slate-900 mb-5 uppercase tracking-widest text-[11px] flex items-center gap-2.5 pb-4 border-b border-slate-100">
              <div className="p-1.5 bg-indigo-50 ">
                <Activity className="w-4 h-4 text-indigo-500" />
              </div>
              Order Lifecycle Distribution
            </h3>

            {totalOrders === 0 ? (
              <p className="text-xs text-slate-400 italic text-center py-4">No order tracking history logged yet.</p>
            ) : (
              <div className="space-y-4">
                {statusList.map((status) => {
                  const count = getStatusCount(status.key);
                  const percentage = totalOrders > 0 ? (count / totalOrders) * 100 : 0;
                  return (
                    <div key={status.key} className="space-y-1.5">
                      <div className="flex justify-between items-center text-xs font-semibold">
                        <span className="text-slate-500">{status.label}</span>
                        <span className="text-slate-800 font-mono">
                          {count} <span className="text-[10px] text-slate-400">({percentage.toFixed(0)}%)</span>
                        </span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                        <div
                          className={`h-full rounded-full ${status.color} transition-all duration-500`}
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Account Role Permissions */}
          <div className="bg-white border border-slate-200  p-5 sm:p-6 ">
            <h3 className="font-bold text-slate-900 mb-4 uppercase tracking-widest text-[11px] flex items-center gap-2.5 pb-4 border-b border-slate-100">
              <div className="p-1.5 bg-indigo-50 ">
                <Shield className="w-4 h-4 text-indigo-500" />
              </div>
              Assigned Permissions ({staff.role?.permissions?.length || 0})
            </h3>

            {!staff.role ? (
              <p className="text-xs text-slate-400 italic">This account is currently unassigned.</p>
            ) : (
              <div className="space-y-3">
                <div className="flex flex-col gap-1.5">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Roster Profile</span>
                  <div className="bg-slate-50  p-3 border border-slate-100 space-y-1">
                    <p className="text-xs text-slate-600 font-medium">Role: <span className="font-bold text-slate-900 uppercase">{staff.role.name}</span></p>
                    <p className="text-xs text-slate-500 leading-relaxed font-medium">{staff.role.description}</p>
                  </div>
                </div>

                {staff.role.permissions && staff.role.permissions.length > 0 && (
                  <div className="space-y-1.5">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mt-4">Module Clearance Matrix</span>
                    <div className="flex flex-wrap gap-1.5 max-h-[160px] overflow-y-auto pr-1">
                      {Array.from(new Set(staff.role.permissions.map((p: any) => p.subject))).map((subj: any) => (
                        <span key={subj} className="inline-flex items-center  bg-slate-50 border border-slate-200 px-2 py-0.5 text-[10px] font-bold text-slate-600 uppercase tracking-wide">
                          {subj}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Recent Sales Ledger */}
        <div className="lg:col-span-3 bg-white border border-slate-200  overflow-hidden  h-fit">
          <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
            <h3 className="font-bold text-slate-900 uppercase tracking-widest text-[11px] flex items-center gap-2.5">
              <div className="p-1.5 bg-indigo-50 ">
                <User className="w-4 h-4 text-indigo-500" />
              </div>
              Processed Sales Ledger ({orders.length})
            </h3>
          </div>

          {orders.length === 0 ? (
            <div className="p-12 text-center text-slate-400 font-medium text-sm">
              No sales records associated with this account.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/50 border-b border-slate-150">
                    <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Order ID</th>
                    <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Customer</th>
                    <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                    <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Total</th>
                    <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paginatedOrders.map((o: any) => (
                    <tr key={o.id} className="hover:bg-slate-50/40 transition-colors group">
                      <td className="px-5 py-4">
                        <div className="flex flex-col">
                          <span className="font-bold text-sm text-slate-900 group-hover:text-indigo-600 transition-colors">{o.id}</span>
                          <span className="text-[10px] text-slate-400 font-semibold mt-0.5">{formatDate(o.createdAt)}</span>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex flex-col">
                          <span className="font-medium text-xs text-slate-800">{o.customerName}</span>
                          <span className="text-[10px] text-slate-500 font-mono mt-0.5">{o.phone}</span>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        {(() => {
                          const statusConf = statusList.find(s => s.key === o.status);
                          return (
                            <span className={`inline-flex items-center  px-2.5 py-1 text-[10px] font-black uppercase tracking-wider ring-1 ring-inset ${o.status === "DELIVERED" ? "bg-green-50 text-green-700 ring-green-600/10" :
                              o.status === "CANCELLED" ? "bg-red-50 text-red-700 ring-red-600/10" :
                                o.status === "PENDING" ? "bg-amber-50 text-amber-700 ring-amber-600/10" :
                                  "bg-indigo-50 text-indigo-700 ring-indigo-600/10"
                              }`}>
                              {statusConf?.label || o.status}
                            </span>
                          );
                        })()}
                      </td>
                      <td className="px-5 py-4 text-xs font-bold text-slate-800 font-mono">
                        {formatBDT(o.totalAmount)}
                      </td>
                      <td className="px-5 py-4 text-right">
                        <Link
                          href={`/admin/orders/${o.id}`}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-indigo-600 bg-indigo-50 border border-indigo-100  hover:bg-indigo-100 transition-all hover:scale-[1.02]"
                        >
                          View Order
                          <ChevronRight className="w-3.5 h-3.5" />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {totalLedgerPages > 1 && (
                <div className="flex items-center justify-between border-t border-slate-150 bg-slate-50/50 px-4 py-3 sm:px-6">
                  <div className="flex flex-1 justify-between sm:hidden">
                    {ledgerPage > 1 ? (
                      <button
                        onClick={() => setLedgerPage(prev => Math.max(prev - 1, 1))}
                        className="relative inline-flex items-center rounded-md border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
                      >
                        Previous
                      </button>
                    ) : (
                      <span className="relative inline-flex items-center rounded-md border border-slate-200 bg-slate-50 px-4 py-2 text-xs font-semibold text-slate-400 cursor-not-allowed">
                        Previous
                      </span>
                    )}
                    {ledgerPage < totalLedgerPages ? (
                      <button
                        onClick={() => setLedgerPage(prev => Math.min(prev + 1, totalLedgerPages))}
                        className="relative ml-3 inline-flex items-center rounded-md border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
                      >
                        Next
                      </button>
                    ) : (
                      <span className="relative ml-3 inline-flex items-center rounded-md border border-slate-200 bg-slate-50 px-4 py-2 text-xs font-semibold text-slate-400 cursor-not-allowed">
                        Next
                      </span>
                    )}
                  </div>
                  <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
                    <div>
                      <p className="text-xs font-semibold text-slate-500">
                        Showing <span className="text-slate-800">{(ledgerPage - 1) * ledgerPerPage + 1}</span> to{" "}
                        <span className="text-slate-800">{Math.min(ledgerPage * ledgerPerPage, orders.length)}</span> of{" "}
                        <span className="text-slate-800">{orders.length}</span> orders
                      </p>
                    </div>
                    <div>
                      <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm bg-white" aria-label="Pagination">
                        {ledgerPage > 1 ? (
                          <button
                            onClick={() => setLedgerPage(prev => Math.max(prev - 1, 1))}
                            className="relative inline-flex items-center rounded-l-md px-2 py-2 text-slate-400 ring-1 ring-inset ring-slate-200 hover:bg-slate-50 focus:z-20 transition-colors cursor-pointer"
                          >
                            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                          </button>
                        ) : (
                          <span className="relative inline-flex items-center rounded-l-md px-2 py-2 text-slate-300 ring-1 ring-inset ring-slate-100 bg-slate-50 focus:z-20 cursor-not-allowed">
                            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                          </span>
                        )}

                        {Array.from({ length: totalLedgerPages }, (_, i) => i + 1).map((page) => {
                          if (
                            page === 1 ||
                            page === totalLedgerPages ||
                            (page >= ledgerPage - 1 && page <= ledgerPage + 1)
                          ) {
                            return (
                              <button
                                key={page}
                                onClick={() => setLedgerPage(page)}
                                className={`relative inline-flex items-center px-3.5 py-2 text-xs font-bold focus:z-20 transition-all cursor-pointer ${
                                  page === ledgerPage
                                    ? "z-10 bg-indigo-600 text-white shadow-sm ring-1 ring-indigo-600"
                                    : "text-slate-700 ring-1 ring-inset ring-slate-200 hover:bg-slate-50"
                                }`}
                              >
                                {page}
                              </button>
                            );
                          }

                          if (
                            (page === ledgerPage - 2 && page > 1) ||
                            (page === ledgerPage + 2 && page < totalLedgerPages)
                          ) {
                            return (
                              <span
                                key={page}
                                className="relative inline-flex items-center px-3 py-2 text-xs font-semibold text-slate-400 ring-1 ring-inset ring-slate-200 focus:outline-offset-0 select-none bg-slate-50"
                              >
                                ...
                              </span>
                            );
                          }

                          return null;
                        })}

                        {ledgerPage < totalLedgerPages ? (
                          <button
                            onClick={() => setLedgerPage(prev => Math.min(prev + 1, totalLedgerPages))}
                            className="relative inline-flex items-center rounded-r-md px-2 py-2 text-slate-400 ring-1 ring-inset ring-slate-200 hover:bg-slate-50 focus:z-20 transition-colors cursor-pointer"
                          >
                            <ChevronRight className="h-4 w-4" aria-hidden="true" />
                          </button>
                        ) : (
                          <span className="relative inline-flex items-center rounded-r-md px-2 py-2 text-slate-300 ring-1 ring-inset ring-slate-100 bg-slate-50 focus:z-20 cursor-not-allowed">
                            <ChevronRight className="h-4 w-4" aria-hidden="true" />
                          </span>
                        )}
                      </nav>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Commission panel */}
        <CommissionPanel
          staffId={staff.id}
          commissionSummary={commissionSummary}
          recentPayments={recentPayments}
          currentMonth={currentMonth}
          currentYear={currentYear}
        />
      </div>
    </div>
  );
}
