"use client";

import { useState, useMemo } from "react";
import { formatBDT } from "@/utils/formatPrice";
import { formatDateTime } from "@/utils/formatDate";
import { Wallet, TrendingUp, CheckCircle, ChevronLeft, ChevronRight } from "lucide-react";

const PER_PAGE = 5;

export default function PaymentHistoryClient({
  payments,
  totalEarned,
  totalPaid,
  totalPending,
}: {
  payments: any[];
  totalEarned: number;
  totalPaid: number;
  totalPending: number;
}) {
  const [page, setPage] = useState(1);
  const [monthFilter, setMonthFilter] = useState("all");

  // Build unique month options from payments
  const monthOptions = useMemo(() => {
    const seen = new Set<string>();
    const opts: { value: string; label: string }[] = [];
    payments.forEach((p) => {
      const key = `${p.year}-${String(p.month).padStart(2, "0")}`;
      if (!seen.has(key)) {
        seen.add(key);
        const label = new Date(p.year, p.month - 1).toLocaleString("en-US", { month: "long", year: "numeric" });
        opts.push({ value: key, label });
      }
    });
    return opts;
  }, [payments]);

  const filtered = useMemo(() => {
    if (monthFilter === "all") return payments;
    const [y, m] = monthFilter.split("-");
    return payments.filter((p) => p.year === parseInt(y) && p.month === parseInt(m));
  }, [payments, monthFilter]);

  const totalPages = Math.ceil(filtered.length / PER_PAGE);
  const paginated  = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);
  const startIdx   = (page - 1) * PER_PAGE;

  const handleFilter = (val: string) => { setMonthFilter(val); setPage(1); };

  const paidPercent = totalEarned > 0 ? Math.min(100, (totalPaid / totalEarned) * 100) : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Payment History</h1>
        <p className="text-sm text-slate-500 mt-0.5">All commission payments received</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center mb-3">
            <TrendingUp className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-xs text-slate-500 font-medium">Total Earned</p>
          <p className="text-xl font-black text-emerald-700 mt-0.5">{formatBDT(totalEarned)}</p>
          <p className="text-xs text-slate-400 mt-0.5">Daily slab-based commission</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center mb-3">
            <CheckCircle className="w-4 h-4 text-blue-600" />
          </div>
          <p className="text-xs text-slate-500 font-medium">Total Paid Out</p>
          <p className="text-xl font-black text-blue-700 mt-0.5">{formatBDT(totalPaid)}</p>
          <p className="text-xs text-slate-400 mt-0.5">{payments.length} payment{payments.length !== 1 ? "s" : ""}</p>
        </div>
        <div className={`rounded-xl border p-4 ${totalPending > 0 ? "bg-amber-50 border-amber-200" : "bg-white border-slate-200"}`}>
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-3 ${totalPending > 0 ? "bg-amber-100" : "bg-slate-100"}`}>
            <Wallet className={`w-4 h-4 ${totalPending > 0 ? "text-amber-600" : "text-slate-400"}`} />
          </div>
          <p className={`text-xs font-medium ${totalPending > 0 ? "text-amber-700" : "text-slate-500"}`}>Pending</p>
          <p className={`text-xl font-black mt-0.5 ${totalPending > 0 ? "text-amber-800" : "text-slate-400"}`}>{formatBDT(totalPending)}</p>
          <p className={`text-xs mt-0.5 ${totalPending > 0 ? "text-amber-600" : "text-slate-400"}`}>
            {totalPending > 0 ? "awaiting payment" : "fully paid"}
          </p>
        </div>
      </div>

      {/* Progress */}
      {totalEarned > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 px-5 py-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Payment Progress</p>
            <p className="text-xs font-bold text-slate-600">{paidPercent.toFixed(0)}% paid</p>
          </div>
          <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-700 ${paidPercent >= 100 ? "bg-emerald-500" : "bg-blue-500"}`}
              style={{ width: `${paidPercent}%` }}
            />
          </div>
          <div className="flex justify-between mt-1.5">
            <span className="text-[10px] text-slate-400">Paid: {formatBDT(totalPaid)}</span>
            <span className="text-[10px] text-slate-400">Total: {formatBDT(totalEarned)}</span>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {/* Table header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 bg-slate-50 flex-wrap gap-3">
          <p className="text-xs font-bold text-slate-600 uppercase tracking-wider">
            {filtered.length} payment{filtered.length !== 1 ? "s" : ""}
            {monthFilter !== "all" && ` · ${monthOptions.find(o => o.value === monthFilter)?.label}`}
          </p>
          <select
            value={monthFilter}
            onChange={(e) => handleFilter(e.target.value)}
            className="text-xs px-3 py-1.5 border border-slate-200 rounded-lg bg-white focus:border-slate-400 focus:outline-none font-medium text-slate-700"
          >
            <option value="all">All Months</option>
            {monthOptions.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>

        {filtered.length === 0 ? (
          <div className="px-5 py-12 text-center">
            <Wallet className="w-10 h-10 text-slate-200 mx-auto mb-3" />
            <p className="text-sm text-slate-400">No payments found.</p>
          </div>
        ) : (
          <>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide w-12">#</th>
                  <th className="text-right px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide">Amount</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide">Note</th>
                  <th className="text-center px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide">Month</th>
                  <th className="text-right px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide">Paid On</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginated.map((p, idx) => (
                  <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-5 py-3.5">
                      <span className="w-6 h-6 rounded-full bg-blue-50 text-blue-600 text-[10px] font-black flex items-center justify-center">
                        {startIdx + idx + 1}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <span className="text-sm font-bold text-slate-900">{formatBDT(p.amount)}</span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="text-sm text-slate-600">{p.note || <span className="text-slate-300 italic text-xs">—</span>}</span>
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      <span className="inline-flex px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-600">
                        {new Date(p.year, p.month - 1).toLocaleString("en-US", { month: "short", year: "numeric" })}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-right text-xs text-slate-500 whitespace-nowrap">
                      {formatDateTime(p.paidAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-5 py-3 border-t border-slate-100 bg-slate-50">
                <p className="text-xs text-slate-400">
                  Showing {startIdx + 1}–{Math.min(page * PER_PAGE, filtered.length)} of {filtered.length}
                </p>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="p-1.5 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((pg) => (
                    <button
                      key={pg}
                      onClick={() => setPage(pg)}
                      className={`w-7 h-7 text-xs font-bold rounded-md transition-colors ${pg === page ? "bg-slate-900 text-white" : "text-slate-500 hover:bg-slate-200"}`}
                    >
                      {pg}
                    </button>
                  ))}
                  <button
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="p-1.5 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
