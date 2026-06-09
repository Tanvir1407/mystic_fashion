"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { formatBDT } from "@/utils/formatPrice";

interface DailyRecord {
  date: Date;
  totalSales: number;
  commission: number;
}

interface OrderSummary {
  id: string;
  customerName: string;
  totalAmount: number;
  deliveredAt: Date | null;
}

export default function DailyCommissionTable({
  dailyRecords,
  orders,
}: {
  dailyRecords: DailyRecord[];
  orders: OrderSummary[];
}) {
  const [expandedDate, setExpandedDate] = useState<string | null>(null);

  const ordersByDate = orders.reduce<Record<string, OrderSummary[]>>((map, o) => {
    if (!o.deliveredAt) return map;
    const key = new Date(o.deliveredAt).toDateString();
    if (!map[key]) map[key] = [];
    map[key].push(o);
    return map;
  }, {});

  const totalCommission = dailyRecords.reduce((s, r) => s + r.commission, 0);

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-100">
        <h2 className="text-sm font-semibold text-slate-900">Daily Commission Breakdown</h2>
      </div>
      {dailyRecords.length === 0 ? (
        <p className="px-5 py-8 text-center text-sm text-slate-400">No deliveries this month.</p>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="w-8 px-2 py-3" />
                  <th className="text-left px-3 py-3 text-xs font-semibold text-slate-500">Date</th>
                  <th className="text-center px-3 py-3 text-xs font-semibold text-slate-500">Orders</th>
                  <th className="text-right px-3 py-3 text-xs font-semibold text-slate-500">Total Sales</th>
                  <th className="text-right px-3 py-3 text-xs font-semibold text-slate-500">Commission</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {dailyRecords.map((r) => {
                  const dateKey = new Date(r.date).toDateString();
                  const dayOrders = ordersByDate[dateKey] || [];
                  const isExpanded = expandedDate === dateKey;

                  return (
                    <tr key={dateKey} className="group">
                      <td className="px-2 py-3">
                        <button
                          type="button"
                          onClick={() => setExpandedDate(isExpanded ? null : dateKey)}
                          className="p-0.5 text-slate-400 hover:text-slate-600 transition-colors"
                        >
                          {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                        </button>
                      </td>
                      <td className="px-3 py-3 font-medium text-slate-900">
                        {new Date(r.date).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                      </td>
                      <td className="px-3 py-3 text-center text-slate-600">
                        {dayOrders.length}
                      </td>
                      <td className="px-3 py-3 text-right text-slate-900 font-medium">
                        {formatBDT(r.totalSales)}
                      </td>
                      <td className="px-3 py-3 text-right font-semibold text-green-700">
                        {formatBDT(r.commission)}
                      </td>
                    </tr>
                  );
                })}
                <tr className="bg-slate-50 font-semibold">
                  <td className="px-2 py-3" />
                  <td className="px-3 py-3 text-slate-700 text-sm">Totals</td>
                  <td className="px-3 py-3 text-center text-slate-700 text-sm">
                    {orders.length}
                  </td>
                  <td className="px-3 py-3 text-right text-slate-900 text-sm">
                    {formatBDT(dailyRecords.reduce((s, r) => s + r.totalSales, 0))}
                  </td>
                  <td className="px-3 py-3 text-right text-green-700 text-sm">
                    {formatBDT(totalCommission)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {expandedDate && ordersByDate[expandedDate] && (
            <div className="border-t border-slate-100 bg-slate-50/50">
              <div className="px-8 py-3">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                  Orders — {new Date(expandedDate).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                </p>
                <div className="space-y-1.5">
                  {ordersByDate[expandedDate].map((o) => (
                    <div key={o.id} className="flex items-center justify-between text-sm bg-white rounded-md px-3 py-2 border border-slate-200">
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-mono text-slate-400">{o.id}</span>
                        <span className="text-slate-700">{o.customerName}</span>
                      </div>
                      <span className="font-medium text-slate-900">{formatBDT(o.totalAmount)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
