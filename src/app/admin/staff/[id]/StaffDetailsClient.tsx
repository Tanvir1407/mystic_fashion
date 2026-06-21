"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft, TrendingUp, ShoppingBag, Coins, CheckCircle2,
  User, Mail, Shield, ChevronLeft, ChevronRight, Activity,
  Calendar, Wallet, Plus, Loader2, X, BarChart2,
} from "lucide-react";
import { formatBDT } from "@/utils/formatPrice";
import { formatDate } from "@/utils/formatDate";
import { createCommissionPayment } from "../actions";

/* ─────────────────────────────────────────────
   Commission Panel
───────────────────────────────────────────── */
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
  const [payPage, setPayPage] = useState(1);
  const payPerPage = 5;

  const monthName = new Date(currentYear, currentMonth - 1).toLocaleString("en-US", { month: "long" });
  const paidPercent = summary.earned > 0 ? Math.min(100, (summary.paid / summary.earned) * 100) : 0;

  const handlePay = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const payAmount = Math.ceil(parseFloat(amount));
    const res = await createCommissionPayment({ staffId, amount: payAmount, month: currentMonth, year: currentYear, note: note.trim() || undefined });
    if (res.success) {
      setSummary((prev: any) => ({ ...prev, paid: prev.paid + payAmount, pending: Math.max(0, prev.pending - payAmount) }));
      setPayments((prev) => [res.data, ...prev]);
      setShowModal(false);
      setAmount("");
      setNote("");
    }
    setLoading(false);
  };

  const totalPayPages = Math.ceil(payments.length / payPerPage);
  const paginatedPayments = payments.slice((payPage - 1) * payPerPage, payPage * payPerPage);

  return (
    <>
      <div className="bg-white border border-slate-100 rounded-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center">
              <Wallet className="w-4 h-4 text-emerald-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-800">Commission</p>
              <p className="text-xs text-slate-400">{monthName} {currentYear}</p>
            </div>
          </div>
          <button
            onClick={() => { setShowModal(true); setAmount(""); setNote(""); }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 text-white text-xs font-medium rounded-lg hover:bg-slate-800 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Record Payment
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-y sm:divide-y-0 divide-slate-100">
          {[
            { label: "Rate", value: `${summary.rate}%`, sub: "commission rate", color: "text-slate-800" },
            { label: "Earned", value: formatBDT(summary.earned), sub: `${summary.orderCount ?? 0} orders`, color: "text-emerald-600" },
            { label: "Paid Out", value: formatBDT(summary.paid), sub: `${payments.length} payment${payments.length !== 1 ? "s" : ""}`, color: "text-blue-600" },
            { label: "Pending", value: formatBDT(summary.pending), sub: summary.pending > 0 ? "awaiting payment" : "fully paid", color: summary.pending > 0 ? "text-amber-600" : "text-slate-400" },
          ].map((item) => (
            <div key={item.label} className="p-4 space-y-0.5">
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">{item.label}</p>
              <p className={`text-xl font-bold ${item.color}`}>{item.value}</p>
              <p className="text-[10px] text-slate-400">{item.sub}</p>
            </div>
          ))}
        </div>

        {/* Progress bar */}
        {summary.earned > 0 && (
          <div className="px-5 py-3 border-t border-slate-100 bg-slate-50/50">
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-[10px] font-medium text-slate-500">Payment progress</p>
              <p className="text-[10px] font-semibold text-slate-600">{paidPercent.toFixed(0)}%</p>
            </div>
            <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${paidPercent >= 100 ? "bg-emerald-500" : "bg-blue-500"}`}
                style={{ width: `${paidPercent}%` }}
              />
            </div>
          </div>
        )}

        {/* Payment history */}
        {payments.length > 0 && (
          <div className="border-t border-slate-100">
            <div className="flex items-center justify-between px-5 py-2.5 bg-slate-50/50">
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Payment History</p>
              <p className="text-[10px] text-slate-400">{payments.length} record{payments.length !== 1 ? "s" : ""}</p>
            </div>
            <div className="divide-y divide-slate-50">
              {paginatedPayments.map((p: any, idx: number) => (
                <div key={p.id} className="flex items-center gap-3 px-5 py-3 hover:bg-slate-50 transition-colors">
                  <div className="w-6 h-6 rounded-full bg-blue-50 flex items-center justify-center flex-shrink-0">
                    <span className="text-[9px] font-bold text-blue-500">#{(payPage - 1) * payPerPage + idx + 1}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-800">{formatBDT(p.amount)}</p>
                    {p.note && <p className="text-xs text-slate-400 truncate">{p.note}</p>}
                  </div>
                  <p className="text-xs text-slate-400 flex-shrink-0">{formatDate(p.paidAt)}</p>
                </div>
              ))}
            </div>
            {totalPayPages > 1 && (
              <div className="flex items-center justify-between px-5 py-3 border-t border-slate-100 bg-slate-50/50">
                <p className="text-[10px] text-slate-400">
                  {(payPage - 1) * payPerPage + 1}–{Math.min(payPage * payPerPage, payments.length)} of {payments.length}
                </p>
                <div className="flex items-center gap-1">
                  <button onClick={() => setPayPage(p => Math.max(1, p - 1))} disabled={payPage === 1}
                    className="p-1.5 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-200 disabled:opacity-30 transition-colors">
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>
                  {Array.from({ length: totalPayPages }, (_, i) => i + 1).map(pg => (
                    <button key={pg} onClick={() => setPayPage(pg)}
                      className={`w-6 h-6 text-[10px] font-semibold rounded-md transition-colors ${pg === payPage ? "bg-slate-900 text-white" : "text-slate-500 hover:bg-slate-100"}`}>
                      {pg}
                    </button>
                  ))}
                  <button onClick={() => setPayPage(p => Math.min(totalPayPages, p + 1))} disabled={payPage === totalPayPages}
                    className="p-1.5 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-200 disabled:opacity-30 transition-colors">
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {payments.length === 0 && summary.earned === 0 && (
          <div className="px-5 py-10 text-center border-t border-slate-100">
            <p className="text-sm text-slate-400">No commission earned this month yet.</p>
          </div>
        )}
      </div>

      {/* Payment Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-[2px] z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-lg w-full max-w-sm border border-slate-100 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <div>
                <p className="text-sm font-semibold text-slate-900">Record Commission Payment</p>
                <p className="text-xs text-slate-400 mt-0.5">{monthName} {currentYear}</p>
              </div>
              <button onClick={() => setShowModal(false)} className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            {summary.pending > 0 && (
              <div className="mx-5 mt-4 flex items-center justify-between bg-amber-50 border border-amber-100 rounded-xl px-4 py-3">
                <div>
                  <p className="text-[10px] font-semibold text-amber-600 uppercase tracking-wider">Pending</p>
                  <p className="text-lg font-bold text-amber-700">{formatBDT(summary.pending)}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setAmount(String(Math.ceil(summary.pending)))}
                  className="text-xs font-semibold text-amber-700 bg-amber-100 hover:bg-amber-200 px-3 py-1.5 rounded-lg transition-colors border border-amber-200"
                >
                  Pay Full
                </button>
              </div>
            )}

            <form onSubmit={handlePay} className="p-5 space-y-3.5">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-600">Amount (৳)</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">৳</span>
                  <input
                    type="number" min={1} step={1} required autoFocus value={amount}
                    onChange={(e) => setAmount(String(Math.floor(Number(e.target.value))))}
                    placeholder="0"
                    className="w-full text-sm pl-8 pr-3 py-2.5 border border-slate-200 rounded-xl focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-100 font-semibold transition-all"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-600">Note <span className="text-slate-400 font-normal">(optional)</span></label>
                <input
                  type="text" value={note} onChange={(e) => setNote(e.target.value)}
                  placeholder="e.g. bKash — 01XXXXXXXXX"
                  className="w-full text-sm px-3 py-2.5 border border-slate-200 rounded-xl focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-100 transition-all"
                />
              </div>
              <div className="flex gap-2 pt-1">
                <button type="button" onClick={() => setShowModal(false)}
                  className="flex-1 h-10 border border-slate-200 text-slate-600 text-sm font-medium rounded-xl hover:bg-slate-50 transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={loading || !amount}
                  className="flex-1 h-10 flex items-center justify-center gap-2 bg-slate-900 text-white text-sm font-medium rounded-xl hover:bg-slate-800 transition-colors disabled:opacity-50">
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                  {loading ? "Processing…" : "Confirm"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

/* ─────────────────────────────────────────────
   Status config
───────────────────────────────────────────── */
const STATUS_LIST = [
  { key: "PENDING",   label: "Pending",   color: "bg-amber-400",  pill: "bg-amber-50 text-amber-700 ring-amber-200" },
  { key: "CONFIRMED", label: "Confirmed", color: "bg-blue-400",   pill: "bg-blue-50 text-blue-700 ring-blue-200" },
  { key: "PRINTING",  label: "Printing",  color: "bg-cyan-400",   pill: "bg-cyan-50 text-cyan-700 ring-cyan-200" },
  { key: "PACKAGING", label: "Packaging", color: "bg-purple-400", pill: "bg-purple-50 text-purple-700 ring-purple-200" },
  { key: "SHIPPED",   label: "Shipped",   color: "bg-indigo-400", pill: "bg-indigo-50 text-indigo-700 ring-indigo-200" },
  { key: "DELIVERED", label: "Delivered", color: "bg-emerald-400",pill: "bg-emerald-50 text-emerald-700 ring-emerald-200" },
  { key: "RETURNED",  label: "Returned",  color: "bg-rose-400",   pill: "bg-rose-50 text-rose-700 ring-rose-200" },
  { key: "CANCELLED", label: "Cancelled", color: "bg-red-400",    pill: "bg-red-50 text-red-700 ring-red-200" },
  { key: "HOLD",      label: "On Hold",   color: "bg-pink-400",   pill: "bg-pink-50 text-pink-700 ring-pink-200" },
];

/* ─────────────────────────────────────────────
   Main Component
───────────────────────────────────────────── */
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
  const [ledgerPage, setLedgerPage] = useState(1);

  const orders = staff.orders || [];
  const ledgerPerPage = 10;
  const totalLedgerPages = Math.ceil(orders.length / ledgerPerPage);
  const paginatedOrders = orders.slice((ledgerPage - 1) * ledgerPerPage, ledgerPage * ledgerPerPage);

  const totalSales = orders.reduce((sum: number, o: any) => sum + o.totalAmount, 0);
  const aov = orders.length > 0 ? totalSales / orders.length : 0;
  const deliveredCount = orders.filter((o: any) => o.status === "DELIVERED").length;
  const cancelledCount = orders.filter((o: any) => o.status === "CANCELLED").length;
  const returnedCount = orders.filter((o: any) => o.status === "RETURNED").length;
  const activeOrdersCount = orders.length - (cancelledCount + returnedCount);
  const successRate = activeOrdersCount > 0 ? (deliveredCount / activeOrdersCount) * 100 : 0;

  /* ── Chart data ── */
  const datesList: string[] = [];
  const salesByDate: Record<string, number> = {};
  const countByDate: Record<string, number> = {};
  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const s = d.toISOString().split("T")[0];
    datesList.push(s);
    salesByDate[s] = 0;
    countByDate[s] = 0;
  }
  orders.forEach((o: any) => {
    const s = new Date(o.createdAt).toISOString().split("T")[0];
    if (salesByDate[s] !== undefined) { salesByDate[s] += o.totalAmount; countByDate[s]++; }
  });

  let cum = 0;
  const chartData = datesList.map((s) => {
    cum += salesByDate[s];
    const d = new Date(s);
    return { date: s, label: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }), daily: salesByDate[s], cumulative: cum, count: countByDate[s] };
  });

  const activeValues = chartData.map(d => chartMode === "daily" ? d.daily : d.cumulative);
  const maxVal = Math.max(...activeValues, 1000);
  const W = 1000; const H = 220; const PX = 55; const PY = 25;

  const pts = chartData.map((d, i) => {
    const val = chartMode === "daily" ? d.daily : d.cumulative;
    const x = PX + (i / (chartData.length - 1)) * (W - 2 * PX);
    const y = H - PY - (val / maxVal) * (H - 2 * PY);
    return { x, y, data: d };
  });

  const linePath = pts.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
  const areaPath = pts.length > 0 ? `${linePath} L ${pts[pts.length - 1].x} ${H - PY} L ${pts[0].x} ${H - PY} Z` : "";

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const mx = ((e.clientX - rect.left) / rect.width) * W;
    let ni = 0; let md = Infinity;
    pts.forEach((p, i) => { const dist = Math.abs(p.x - mx); if (dist < md) { md = dist; ni = i; } });
    setHoveredIndex(ni);
    setMousePos({ x: pts[ni].x, y: pts[ni].y });
  };

  return (
    <div className="space-y-5">

      {/* ── Header ── */}
      <div className="flex items-center gap-3">
        <Link href="/admin/staff" className="p-2 bg-white border border-slate-100 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-50 transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl font-semibold text-slate-900">{staff.username}</h1>
            {staff.role && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-xs font-medium">
                <Shield className="w-3 h-3" /> {staff.role.name}
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 mt-0.5 text-xs text-slate-400">
            <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{staff.email}</span>
            <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />
              Joined {new Date(staff.createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
            </span>
          </div>
        </div>
      </div>

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { icon: TrendingUp, label: "Total Revenue", value: formatBDT(totalSales), sub: "sales generated", iconColor: "text-emerald-600", iconBg: "bg-emerald-50" },
          { icon: ShoppingBag, label: "Orders", value: String(orders.length), sub: "transactions", iconColor: "text-slate-600", iconBg: "bg-slate-100" },
          { icon: Coins, label: "Avg Order Value", value: formatBDT(aov), sub: "per transaction", iconColor: "text-indigo-600", iconBg: "bg-indigo-50" },
          { icon: CheckCircle2, label: "Success Rate", value: `${successRate.toFixed(1)}%`, sub: "delivered vs. cancelled", iconColor: successRate >= 80 ? "text-emerald-600" : successRate >= 50 ? "text-amber-600" : "text-rose-600", iconBg: successRate >= 80 ? "bg-emerald-50" : successRate >= 50 ? "bg-amber-50" : "bg-rose-50" },
        ].map((kpi) => (
          <div key={kpi.label} className="bg-white border border-slate-100 rounded-2xl p-4 space-y-3">
            <div className={`w-8 h-8 rounded-lg ${kpi.iconBg} flex items-center justify-center`}>
              <kpi.icon className={`w-4 h-4 ${kpi.iconColor}`} />
            </div>
            <div>
              <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">{kpi.label}</p>
              <p className="text-2xl font-bold text-slate-900 leading-tight">{kpi.value}</p>
              <p className="text-[11px] text-slate-400 mt-0.5">{kpi.sub}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Sales Chart ── */}
      <div className="bg-white border border-slate-100 rounded-2xl p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-emerald-50 flex items-center justify-center">
              <Activity className="w-3.5 h-3.5 text-emerald-600" />
            </div>
            <p className="text-sm font-semibold text-slate-800">Sales Performance <span className="text-slate-400 font-normal">· last 30 days</span></p>
          </div>
          <div className="flex bg-slate-100 p-0.5 rounded-lg self-start sm:self-auto">
            {(["daily", "cumulative"] as const).map((mode) => (
              <button key={mode} onClick={() => setChartMode(mode)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all capitalize ${chartMode === mode ? "bg-white text-slate-800 shadow-sm" : "text-slate-400 hover:text-slate-600"}`}>
                {mode === "daily" ? "Daily" : "Cumulative"}
              </button>
            ))}
          </div>
        </div>

        <div className="relative w-full h-[220px]">
          <svg className="w-full h-full cursor-crosshair overflow-visible select-none" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none"
            onMouseMove={handleMouseMove} onMouseLeave={() => setHoveredIndex(null)}>
            <defs>
              <linearGradient id="chart-area" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#10b981" stopOpacity="0.12" />
                <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
              </linearGradient>
            </defs>

            {[0, 0.25, 0.5, 0.75, 1].map((r, i) => {
              const y = PY + r * (H - 2 * PY);
              return (
                <g key={i}>
                  <line x1={PX} y1={y} x2={W - PX} y2={y} stroke="#f1f5f9" strokeWidth="1" />
                  <text x={PX - 8} y={y + 4} textAnchor="end" fill="#cbd5e1" fontSize="11" fontFamily="monospace">
                    {formatBDT(maxVal - r * maxVal).replace("৳", "৳")}
                  </text>
                </g>
              );
            })}

            {orders.length === 0 && (
              <text x={W / 2} y={H / 2} textAnchor="middle" fill="#cbd5e1" fontSize="12">No sales data yet</text>
            )}

            {orders.length > 0 && areaPath && <path d={areaPath} fill="url(#chart-area)" />}
            {orders.length > 0 && linePath && (
              <path d={linePath} fill="none" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            )}

            {hoveredIndex !== null && (
              <g>
                <line x1={mousePos.x} y1={PY} x2={mousePos.x} y2={H - PY} stroke="#e2e8f0" strokeWidth="1" strokeDasharray="3 3" />
                <circle cx={mousePos.x} cy={mousePos.y} r="4" fill="#10b981" stroke="#fff" strokeWidth="2" />
              </g>
            )}

            {chartData.map((d, i) => {
              if (i % 5 !== 0 && i !== chartData.length - 1) return null;
              const x = PX + (i / (chartData.length - 1)) * (W - 2 * PX);
              return <text key={i} x={x} y={H - 8} textAnchor="middle" fill="#cbd5e1" fontSize="10">{d.label}</text>;
            })}
          </svg>

          {hoveredIndex !== null && (
            <div className="absolute pointer-events-none bg-white border border-slate-100 shadow-lg rounded-xl p-3 z-20 min-w-[140px]"
              style={{ left: `${(mousePos.x / W) * 100}%`, top: `${(mousePos.y / H) * 100 - 110}%`, transform: "translateX(-50%)" }}>
              <p className="text-[10px] text-slate-400 font-medium mb-1.5">{chartData[hoveredIndex].date}</p>
              {[
                { label: "Revenue", val: formatBDT(chartData[hoveredIndex].daily), color: "text-emerald-600" },
                { label: "Total", val: formatBDT(chartData[hoveredIndex].cumulative), color: "text-indigo-600" },
                { label: "Orders", val: String(chartData[hoveredIndex].count), color: "text-slate-700" },
              ].map(row => (
                <div key={row.label} className="flex justify-between items-center gap-4 text-xs">
                  <span className="text-slate-400">{row.label}</span>
                  <span className={`font-semibold ${row.color}`}>{row.val}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Commission Panel ── */}
      <CommissionPanel staffId={staff.id} commissionSummary={commissionSummary} recentPayments={recentPayments} currentMonth={currentMonth} currentYear={currentYear} />

      {/* ── Bottom Grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">

        {/* Left: Status breakdown + Permissions */}
        <div className="lg:col-span-2 space-y-5">

          {/* Order Status Breakdown */}
          <div className="bg-white border border-slate-100 rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-4 pb-4 border-b border-slate-100">
              <div className="w-7 h-7 rounded-lg bg-indigo-50 flex items-center justify-center">
                <BarChart2 className="w-3.5 h-3.5 text-indigo-500" />
              </div>
              <p className="text-sm font-semibold text-slate-800">Order Status</p>
            </div>

            {orders.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-4">No orders yet.</p>
            ) : (
              <div className="space-y-3">
                {STATUS_LIST.map((s) => {
                  const count = orders.filter((o: any) => o.status === s.key).length;
                  if (count === 0) return null;
                  const pct = (count / orders.length) * 100;
                  return (
                    <div key={s.key}>
                      <div className="flex justify-between items-center text-xs mb-1">
                        <span className="font-medium text-slate-600">{s.label}</span>
                        <span className="text-slate-400">{count} <span className="text-slate-300">({pct.toFixed(0)}%)</span></span>
                      </div>
                      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${s.color} transition-all duration-500`} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Permissions */}
          <div className="bg-white border border-slate-100 rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-4 pb-4 border-b border-slate-100">
              <div className="w-7 h-7 rounded-lg bg-indigo-50 flex items-center justify-center">
                <Shield className="w-3.5 h-3.5 text-indigo-500" />
              </div>
              <p className="text-sm font-semibold text-slate-800">Permissions</p>
            </div>

            {!staff.role ? (
              <p className="text-xs text-slate-400">No role assigned.</p>
            ) : (
              <div className="space-y-3">
                <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                  <p className="text-xs text-slate-500">Role: <span className="font-semibold text-slate-800">{staff.role.name}</span></p>
                  {staff.role.description && <p className="text-xs text-slate-400 mt-0.5">{staff.role.description}</p>}
                </div>
                {staff.role.permissions?.length > 0 && (
                  <div>
                    <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">Module Access</p>
                    <div className="flex flex-wrap gap-1.5">
                      {Array.from(new Set(staff.role.permissions.map((p: any) => p.subject))).map((subj: any) => (
                        <span key={subj} className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[10px] font-semibold uppercase tracking-wide">
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

        {/* Right: Order Ledger */}
        <div className="lg:col-span-3 bg-white border border-slate-100 rounded-2xl overflow-hidden">
          <div className="flex items-center gap-2 px-5 py-4 border-b border-slate-100">
            <div className="w-7 h-7 rounded-lg bg-indigo-50 flex items-center justify-center">
              <User className="w-3.5 h-3.5 text-indigo-500" />
            </div>
            <p className="text-sm font-semibold text-slate-800">Order Ledger <span className="text-slate-400 font-normal">({orders.length})</span></p>
          </div>

          {orders.length === 0 ? (
            <div className="py-16 text-center">
              <ShoppingBag className="w-8 h-8 text-slate-200 mx-auto mb-2" />
              <p className="text-sm text-slate-400">No orders recorded yet.</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/50">
                      {["Order", "Customer", "Status", "Total", ""].map((h) => (
                        <th key={h} className={`px-4 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider ${h === "" ? "text-right" : ""}`}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {paginatedOrders.map((o: any) => {
                      const sc = STATUS_LIST.find(s => s.key === o.status);
                      return (
                        <tr key={o.id} className="hover:bg-slate-50/60 transition-colors group">
                          <td className="px-4 py-3">
                            <p className="text-xs font-semibold text-slate-800 truncate max-w-[100px]">{o.id}</p>
                            <p className="text-[10px] text-slate-400 mt-0.5">{formatDate(o.createdAt)}</p>
                          </td>
                          <td className="px-4 py-3">
                            <p className="text-xs font-medium text-slate-700">{o.customerName}</p>
                            <p className="text-[10px] text-slate-400 font-mono mt-0.5">{o.phone}</p>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold ring-1 ring-inset ${sc?.pill || "bg-slate-50 text-slate-600 ring-slate-200"}`}>
                              {sc?.label || o.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-xs font-semibold text-slate-700">{formatBDT(o.totalAmount)}</td>
                          <td className="px-4 py-3 text-right">
                            <Link href={`/admin/orders/${o.id}`}
                              className="inline-flex items-center gap-1 text-[10px] font-semibold text-slate-400 hover:text-slate-700 transition-colors">
                              View <ChevronRight className="w-3 h-3" />
                            </Link>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {totalLedgerPages > 1 && (
                <div className="flex items-center justify-between px-5 py-3 border-t border-slate-100 bg-slate-50/50">
                  <p className="text-[11px] text-slate-400">
                    {(ledgerPage - 1) * ledgerPerPage + 1}–{Math.min(ledgerPage * ledgerPerPage, orders.length)} of {orders.length}
                  </p>
                  <div className="flex items-center gap-1">
                    <button onClick={() => setLedgerPage(p => Math.max(1, p - 1))} disabled={ledgerPage === 1}
                      className="p-1.5 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-200 disabled:opacity-30 transition-colors">
                      <ChevronLeft className="w-3.5 h-3.5" />
                    </button>
                    {Array.from({ length: totalLedgerPages }, (_, i) => i + 1).filter(pg =>
                      pg === 1 || pg === totalLedgerPages || (pg >= ledgerPage - 1 && pg <= ledgerPage + 1)
                    ).map((pg, idx, arr) => (
                      <>
                        {idx > 0 && arr[idx - 1] !== pg - 1 && (
                          <span key={`dot-${pg}`} className="px-1 text-slate-300 text-xs">…</span>
                        )}
                        <button key={pg} onClick={() => setLedgerPage(pg)}
                          className={`w-7 h-7 text-xs font-semibold rounded-lg transition-colors ${pg === ledgerPage ? "bg-slate-900 text-white" : "text-slate-500 hover:bg-slate-100"}`}>
                          {pg}
                        </button>
                      </>
                    ))}
                    <button onClick={() => setLedgerPage(p => Math.min(totalLedgerPages, p + 1))} disabled={ledgerPage === totalLedgerPages}
                      className="p-1.5 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-200 disabled:opacity-30 transition-colors">
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
