"use client";

import { formatBDT } from "@/utils/formatPrice";
import { Wallet } from "lucide-react";
import Link from "next/link";

export default function CommissionCard({
  monthEarned, totalCommission, totalPaid, totalDue, monthName,
}: {
  monthEarned: number;
  totalCommission: number;
  totalPaid: number;
  totalDue: number;
  monthName: string;
}) {
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
            <p className="text-xs text-slate-400">Slab-based</p>
          </div>
        </div>
        <Link href="/staff/payments" className="text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors">
          History →
        </Link>
      </div>

      {/* 4 stats */}
      <div className="grid grid-cols-2 divide-x divide-y divide-slate-100">
        <div className="px-5 py-4 flex flex-col justify-between">
          <div>
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">This Month Earned</p>
            <p className="text-2xl font-black text-emerald-700 mt-1">{formatBDT(monthEarned)}</p>
          </div>
          <p className="text-[10px] text-slate-400 mt-1.5">{monthName} (delivered only)</p>
        </div>
        <div className="px-5 py-4">
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">All Time Earned</p>
          <p className="text-2xl font-black text-slate-900 mt-1">{formatBDT(totalCommission)}</p>
          <p className="text-[10px] text-slate-400 mt-0.5">from delivered orders</p>
        </div>

        <div className="px-5 py-4">
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Total Paid</p>
          <p className="text-2xl font-black text-blue-700 mt-1">{formatBDT(totalPaid)}</p>
          <p className="text-[10px] text-slate-400 mt-0.5">by admin</p>
        </div>
        <div className="px-5 py-4">
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Total Due</p>
          <p className={`text-2xl font-black mt-1 ${totalDue > 0 ? "text-orange-600" : "text-slate-400"}`}>
            {formatBDT(totalDue)}
          </p>
          <p className="text-[10px] text-slate-400 mt-0.5">{totalDue > 0 ? "awaiting payment" : "fully paid"}</p>
        </div>
      </div>
    </div>
  );
}
