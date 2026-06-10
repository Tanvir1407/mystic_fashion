"use client";

import { formatBDT } from "@/utils/formatPrice";
import { Wallet } from "lucide-react";
import Link from "next/link";

export default function CommissionCard({
  monthEstimated, monthEarned, totalEarned, totalPaid, monthName,
}: {
  monthEstimated: number;
  monthEarned: number;
  totalEarned: number;
  totalPaid: number;
  monthName: string;
}) {
  const totalDue = Math.max(0, totalEarned - totalPaid);
  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center">
            <Wallet className="w-4 h-4 text-amber-600" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">Commission</h3>
            <p className="text-xs text-slate-400">Slab-based daily</p>
          </div>
        </div>
        <Link href="/staff/payments" className="text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors">
          History →
        </Link>
      </div>

      {/* 4 stats */}
      <div className="grid grid-cols-2 divide-x divide-y divide-slate-100">
        <div className="px-5 py-4">
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Estimated This Month</p>
          <p className="text-2xl font-black text-amber-600 mt-1">{formatBDT(monthEstimated)}</p>
          <p className="text-[10px] text-slate-400 mt-0.5">based on all orders</p>
        </div>
        <div className="px-5 py-4">
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Confirmed This Month</p>
          <p className="text-2xl font-black text-emerald-700 mt-1">{formatBDT(monthEarned)}</p>
          <p className="text-[10px] text-slate-400 mt-0.5">from delivered orders</p>
        </div>
        <div className="px-5 py-4">
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">All Time Confirmed</p>
          <p className="text-2xl font-black text-slate-900 mt-1">{formatBDT(totalEarned)}</p>
          <p className="text-[10px] text-slate-400 mt-0.5">total earned</p>
        </div>
        <div className="px-5 py-4">
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Total Paid</p>
          <p className="text-2xl font-black text-blue-700 mt-1">{formatBDT(totalPaid)}</p>
          <p className="text-[10px] text-slate-400 mt-0.5">by admin</p>
        </div>
      </div>

      {/* Pending banner */}
      {totalDue > 0 && (
        <div className="border-t border-slate-100 bg-amber-50/50 px-5 py-3 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold text-amber-600 uppercase tracking-wider">Pending Payout</p>
            <p className="text-lg font-black text-amber-800">{formatBDT(totalDue)}</p>
          </div>
          <Link href="/staff/payments" className="text-xs font-semibold text-amber-700 bg-amber-100 hover:bg-amber-200 px-3 py-1.5 rounded-lg transition-colors border border-amber-300">
            View History →
          </Link>
        </div>
      )}
    </div>
  );
}
