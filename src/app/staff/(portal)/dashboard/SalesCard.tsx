"use client";

import { formatBDT } from "@/utils/formatPrice";
import { TrendingUp } from "lucide-react";

export default function SalesCard({
  today, todayCount, month, monthCount, total, totalCount, sparkline, monthName,
}: {
  today: number; todayCount: number;
  month: number; monthCount: number;
  total: number; totalCount: number;
  sparkline: { date: string; amount: number; count: number }[];
  monthName: string;
}) {
  const max = Math.max(...sparkline.map(d => d.amount), 1);

  return (
    <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm">
      <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-100">
        <div className="w-8 h-8 rounded-xl bg-[#800020]/8 flex items-center justify-center">
          <TrendingUp className="w-4 h-4 text-[#800020]" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-slate-800">Sales</h3>
          <p className="text-xs text-slate-400">{monthName} overview</p>
        </div>
      </div>

      {/* Primary stat */}
      <div className="px-5 pt-5 pb-3">
        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">This Month</p>
        <p className="text-3xl font-black text-[#800020] mt-1">{formatBDT(month)}</p>
        <p className="text-xs text-slate-400 mt-0.5">{monthCount} order{monthCount !== 1 ? "s" : ""}</p>
      </div>

      {/* Sparkline bars */}
      <div className="px-5 pb-4">
        <div className="flex items-end gap-1 h-12">
          {sparkline.map((d, i) => {
            const pct = max > 0 ? (d.amount / max) * 100 : 0;
            const isToday = i === sparkline.length - 1;
            return (
              <div key={d.date} className="flex-1 flex flex-col items-center gap-1 group relative">
                <div
                  className={`w-full rounded-t transition-all ${isToday ? "bg-[#800020]" : "bg-slate-100 group-hover:bg-[#800020]/30"}`}
                  style={{ height: `${Math.max(4, pct)}%`, minHeight: d.amount > 0 ? "6px" : "2px" }}
                />
                <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[9px] font-semibold px-1.5 py-1 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none z-10">
                  {d.date}: {formatBDT(d.amount)}
                </div>
              </div>
            );
          })}
        </div>
        <div className="flex justify-between mt-1.5">
          {sparkline.map((d, i) => (
            <span key={i} className={`flex-1 text-center text-[9px] ${i === sparkline.length - 1 ? "text-[#800020] font-bold" : "text-slate-300"}`}>
              {d.date}
            </span>
          ))}
        </div>
      </div>

      {/* Sub-stats */}
      <div className="grid grid-cols-2 divide-x divide-slate-100 border-t border-slate-100">
        <div className="px-5 py-3.5">
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Today</p>
          <p className="text-base font-black text-slate-800 mt-1">{formatBDT(today)}</p>
          <p className="text-[10px] text-slate-400 mt-0.5">{todayCount} order{todayCount !== 1 ? "s" : ""}</p>
        </div>
        <div className="px-5 py-3.5">
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">All Time</p>
          <p className="text-base font-black text-slate-800 mt-1">{formatBDT(total)}</p>
          <p className="text-[10px] text-slate-400 mt-0.5">{totalCount} total orders</p>
        </div>
      </div>
    </div>
  );
}
