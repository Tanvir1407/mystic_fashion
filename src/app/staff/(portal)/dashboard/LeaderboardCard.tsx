"use client";

import { formatBDT } from "@/utils/formatPrice";
import { Trophy } from "lucide-react";

const RANK_STYLES = [
  { badge: "bg-amber-400 text-white",  bar: "bg-amber-400", row: "" },
  { badge: "bg-slate-300 text-white",  bar: "bg-slate-300", row: "" },
  { badge: "bg-orange-300 text-white", bar: "bg-orange-300", row: "" },
];

export default function LeaderboardCard({
  leaderboard, myId, myRank, monthName,
}: {
  leaderboard: { id: string; username: string; totalSales: number; orderCount: number }[];
  myId: string;
  myRank: number;
  monthName: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center">
            <Trophy className="w-4 h-4 text-amber-500" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">Leaderboard</h3>
            <p className="text-xs text-slate-400">{monthName} · top sales</p>
          </div>
        </div>
        {myRank > 0 && (
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 rounded-full">
            <span className="text-[10px] text-slate-500">Your rank</span>
            <span className="text-xs font-black text-slate-800">#{myRank}</span>
          </div>
        )}
      </div>

      {leaderboard.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center py-12 text-center">
          <Trophy className="w-8 h-8 text-slate-200 mb-2" />
          <p className="text-sm text-slate-400">No sales this month yet.</p>
        </div>
      ) : (
        <>
          {/* Column headers */}
          <div className="flex items-center gap-3 px-5 py-2 border-b border-slate-100 bg-slate-50">
            <span className="w-6 text-[10px] font-bold text-slate-400 uppercase tracking-wider">#</span>
            <span className="flex-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Staff</span>
            <span className="w-16 text-right text-[10px] font-bold text-slate-400 uppercase tracking-wider">Orders</span>
            <span className="w-20 text-right text-[10px] font-bold text-slate-400 uppercase tracking-wider">Sales</span>
          </div>

          <div className="divide-y divide-slate-100 overflow-y-auto max-h-[280px]">
            {leaderboard.map((s, idx) => {
              const isMe  = s.id === myId;
              const style = RANK_STYLES[idx];

              return (
                <div
                  key={s.id}
                  className={`flex items-center gap-3 px-5 py-3 transition-colors ${isMe ? "bg-blue-50/60" : "hover:bg-slate-50/60"}`}
                >
                  {/* Rank badge */}
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-[10px] font-black
                    ${isMe ? "bg-blue-500 text-white" : style ? style.badge : "bg-slate-100 text-slate-500"}`}>
                    {idx + 1}
                  </div>

                  {/* Name */}
                  <div className="flex-1 min-w-0 flex items-center gap-1.5">
                    <span className={`text-sm font-semibold truncate ${isMe ? "text-blue-700" : "text-slate-800"}`}>
                      {s.username}
                    </span>
                    {isMe && (
                      <span className="text-[9px] font-bold text-blue-500 bg-blue-100 px-1.5 py-0.5 rounded-full flex-shrink-0">you</span>
                    )}
                  </div>

                  {/* Orders */}
                  <div className="w-16 text-right flex-shrink-0">
                    <span className="text-xs font-semibold text-slate-500">{s.orderCount}</span>
                  </div>

                  {/* Sales */}
                  <div className="w-20 text-right flex-shrink-0">
                    <span className={`text-sm font-bold ${isMe ? "text-blue-700" : "text-slate-800"}`}>
                      {formatBDT(s.totalSales)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
