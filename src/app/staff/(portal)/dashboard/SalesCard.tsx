"use client";

import { useMemo } from "react";
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
  const max = useMemo(() => {
    return Math.max(...sparkline.map(d => d.amount), 1);
  }, [sparkline]);

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-xs hover:shadow-md transition-all duration-300 flex flex-col justify-between">
      
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#800020]/10 border border-[#800020]/15 flex items-center justify-center shrink-0">
            <TrendingUp className="w-5 h-5 text-[#800020]" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-800 tracking-wide uppercase">Sales Analytics</h3>
            <p className="text-[10px] text-slate-400 font-medium">{monthName} Overview</p>
          </div>
        </div>
      </div>

      {/* Primary stat */}
      <div className="px-5 pt-5 pb-3">
        <p className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest">Monthly Revenue</p>
        <p className="text-3xl font-black text-[#800020] tracking-tight mt-1">
          {formatBDT(month)}
        </p>
        <p className="text-xs text-slate-400 font-medium mt-1">
          Generated across {monthCount} complete transactions
        </p>
      </div>

      {/* Sparkline bars */}
      <div className="px-5 pb-4">
        <div className="flex items-end gap-1.5 h-16 pt-2">
          {sparkline.map((d, i) => {
            const value = d.amount;
            const pct = max > 0 ? (value / max) * 100 : 0;
            const isToday = i === sparkline.length - 1;
            return (
              <div key={d.date} className="flex-1 flex flex-col items-center gap-1 group relative cursor-pointer">
                <div
                  className={`w-full rounded-t transition-all duration-300 ${
                    isToday 
                      ? "bg-gradient-to-t from-[#800020] to-[#b01235] shadow-[0_-2px_8px_rgba(128,0,32,0.3)]" 
                      : "bg-slate-100 group-hover:bg-[#800020]/25 group-hover:scale-y-105"
                  }`}
                  style={{ height: `${Math.max(4, pct)}%`, minHeight: value > 0 ? "6px" : "2px" }}
                />
                <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-slate-900/95 backdrop-blur-md text-white text-[9px] font-semibold px-2 py-1.5 rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none z-20 shadow-lg border border-white/10 transition-all duration-200">
                  <p className="font-extrabold text-[8px] text-slate-400">{d.date}</p>
                  <p className="text-white mt-0.5">{formatBDT(d.amount)}</p>
                </div>
              </div>
            );
          })}
        </div>
        <div className="flex justify-between mt-2 border-t border-slate-50 pt-1.5">
          {sparkline.map((d, i) => (
            <span key={i} className={`flex-1 text-center text-[9px] ${i === sparkline.length - 1 ? "text-[#800020] font-black" : "text-slate-400 font-medium"}`}>
              {d.date}
            </span>
          ))}
        </div>
      </div>

      {/* Sub-stats Grid */}
      <div className="grid grid-cols-2 divide-x divide-slate-100 border-t border-slate-100 bg-slate-50/50">
        <div className="px-5 py-3.5 hover:bg-slate-100/30 transition-colors">
          <p className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider">Today</p>
          <p className="text-base font-black text-slate-800 mt-0.5">
            {formatBDT(today)}
          </p>
          <p className="text-[10px] text-slate-400 font-medium mt-0.5">
            {todayCount} orders placed
          </p>
        </div>
        <div className="px-5 py-3.5 hover:bg-slate-100/30 transition-colors">
          <p className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider">All Time</p>
          <p className="text-base font-black text-slate-800 mt-0.5">
            {formatBDT(total)}
          </p>
          <p className="text-[10px] text-slate-400 font-medium mt-0.5">
            {totalCount} gross orders
          </p>
        </div>
      </div>
    </div>
  );
}
