"use client";

import { formatBDT } from "@/utils/formatPrice";
import { ShoppingBag } from "lucide-react";

export default function OrdersCard({
  today, todaySales, month, monthSales, total, monthName, sparkline,
}: {
  today: number; todaySales: number;
  month: number; monthSales: number;
  total: number;
  monthName: string;
  sparkline: { date: string; amount: number; count: number }[];
}) {
  const max = Math.max(...sparkline.map(d => d.count), 1);

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
      <div className="flex items-center gap-2.5 px-5 py-4 border-b border-slate-100">
        <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center">
          <ShoppingBag className="w-4 h-4 text-emerald-600" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-slate-900">Orders</h3>
          <p className="text-xs text-slate-400">{monthName} overview</p>
        </div>
      </div>

      {/* Primary stat */}
      <div className="px-5 pt-4 pb-3">
        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">This Month</p>
        <p className="text-3xl font-black text-emerald-700 mt-0.5">{month}</p>
        <p className="text-xs text-slate-400 mt-0.5">{formatBDT(monthSales)}</p>
      </div>

      {/* Sparkline — order count bars */}
      <div className="px-5 pb-4">
        <div className="flex items-end gap-1 h-12">
          {sparkline.map((d, i) => {
            const pct = max > 0 ? (d.count / max) * 100 : 0;
            const isToday = i === sparkline.length - 1;
            return (
              <div key={d.date} className="flex-1 flex flex-col items-center gap-1 group relative">
                <div
                  className={`w-full rounded-t-sm transition-all ${isToday ? "bg-emerald-500" : "bg-emerald-100 group-hover:bg-emerald-300"}`}
                  style={{ height: `${Math.max(4, pct)}%`, minHeight: d.count > 0 ? "6px" : "2px" }}
                />
                <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[9px] font-bold px-1.5 py-1 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none z-10">
                  {d.date}: {d.count} order{d.count !== 1 ? "s" : ""}
                </div>
              </div>
            );
          })}
        </div>
        <div className="flex justify-between mt-1">
          {sparkline.map((d, i) => (
            <span key={i} className={`flex-1 text-center text-[9px] ${i === sparkline.length - 1 ? "text-emerald-600 font-bold" : "text-slate-300"}`}>
              {d.date}
            </span>
          ))}
        </div>
      </div>

      {/* Sub-stats */}
      <div className="grid grid-cols-2 divide-x divide-slate-100 border-t border-slate-100">
        <div className="px-4 py-3">
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Today</p>
          <p className="text-base font-black text-slate-900 mt-0.5">{today} order{today !== 1 ? "s" : ""}</p>
          <p className="text-[10px] text-slate-400">{formatBDT(todaySales)}</p>
        </div>
        <div className="px-4 py-3">
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">All Time</p>
          <p className="text-base font-black text-slate-900 mt-0.5">{total}</p>
          <p className="text-[10px] text-slate-400">total orders</p>
        </div>
      </div>
    </div>
  );
}
