"use client";

import { useMemo } from "react";
import { formatBDT } from "@/utils/formatPrice";
import { Trophy, Crown } from "lucide-react";

export default function LeaderboardCard({
  leaderboard,
  myId,
  myRank,
  monthName,
}: {
  leaderboard: { id: string; username: string; totalSales: number; orderCount: number }[];
  myId: string;
  myRank: number;
  monthName: string;
}) {
  // Sort by totalSales descending
  const sortedLeaderboard = useMemo(() => {
    return [...leaderboard].sort((a, b) => b.totalSales - a.totalSales);
  }, [leaderboard]);

  const top3 = useMemo(() => sortedLeaderboard.slice(0, 3), [sortedLeaderboard]);
  const rest = useMemo(() => sortedLeaderboard.slice(3, 10), [sortedLeaderboard]);

  return (
    <div className="bg-gradient-to-br from-[#800020] via-[#5c0017] to-[#3a000e] rounded-2xl border border-white/10 shadow-xl flex flex-col overflow-hidden text-white transition-all duration-300">
      
      {/* ── Header ── */}
      <div className="px-6 pt-5 pb-4 flex-shrink-0">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-400/10 border border-amber-400/20 flex items-center justify-center shrink-0">
              <Trophy className="w-5 h-5 text-amber-400 animate-pulse" />
            </div>
            <div>
              <h3 className="text-sm font-black text-white tracking-wider uppercase">Sales Leaderboard</h3>
              <p className="text-[10px] text-pink-200/50 font-medium">Rankings refresh in real-time</p>
            </div>
          </div>
          {myRank > 0 && (
            <div className="text-right">
              <p className="text-[10px] text-pink-200/50 font-bold uppercase tracking-wider">Your Rank</p>
              <p className="text-2xl font-black text-amber-300 leading-none mt-0.5">#{myRank}</p>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between border-t border-white/5 pt-3">
          <p className="text-[10px] text-pink-200/70 font-semibold uppercase tracking-wider">{monthName}</p>
        </div>
      </div>

      {leaderboard.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center py-12 bg-black/10 border-t border-white/5">
          <Trophy className="w-9 h-9 text-white/10 mb-2.5" />
          <p className="text-sm text-pink-200/40 font-semibold">No sales logged this month.</p>
        </div>
      ) : (
        <>
          {/* ── Top 3 Podium ── */}
          {top3.length > 0 && (
            <div className="flex items-end justify-center gap-2 px-4 pt-10 pb-5 bg-black/20 backdrop-blur-md border-y border-white/5 flex-shrink-0">
              
              {/* 2nd Place Column */}
              {top3[1] && (
                <div className="flex flex-col items-center group cursor-pointer transition-all duration-300 hover:-translate-y-1">
                  <div className="flex flex-col items-center gap-1.5 mb-2">
                    <span className="text-lg animate-bounce select-none">🥈</span>
                    <div className="w-12 h-12 rounded-full flex items-center justify-center font-black uppercase ring-2 ring-slate-300/40 bg-gradient-to-br from-slate-200 to-slate-400 text-slate-900 shadow-md">
                      {top3[1].username.charAt(0)}
                    </div>
                    <p className="text-[10px] font-black text-pink-100 truncate max-w-[65px] text-center">
                      {top3[1].id === myId ? "You" : top3[1].username}
                    </p>
                    <p className="text-[9px] font-extrabold text-pink-200/80 font-mono">
                      {formatBDT(top3[1].totalSales)}
                    </p>
                  </div>
                  {/* Podium Block */}
                  <div className="w-20 h-16 bg-slate-400/10 border-t border-slate-300/35 rounded-t-xl flex flex-col items-center justify-center backdrop-blur-xs">
                    <span className="text-slate-300/80 font-black text-xs uppercase tracking-wide">2nd</span>
                    <span className="text-[8px] text-slate-400/90 font-bold mt-0.5">{top3[1].orderCount} orders</span>
                  </div>
                </div>
              )}

              {/* 1st Place Column */}
              {top3[0] && (
                <div className="flex flex-col items-center group cursor-pointer transition-all duration-300 hover:-translate-y-1.5">
                  <div className="flex flex-col items-center gap-1.5 mb-2">
                    <Crown className="w-5 h-5 text-amber-400 animate-pulse" />
                    <div className="w-16 h-16 rounded-full flex items-center justify-center font-black uppercase ring-4 ring-amber-400/90 bg-gradient-to-br from-amber-300 to-amber-500 text-slate-950 shadow-[0_0_18px_rgba(251,191,36,0.35)]">
                      {top3[0].username.charAt(0)}
                    </div>
                    <p className="text-xs font-black text-white truncate max-w-[75px] text-center underline decoration-amber-400 decoration-2 underline-offset-2">
                      {top3[0].id === myId ? "You" : top3[0].username}
                    </p>
                    <p className="text-[10px] font-black text-amber-300 font-mono">
                      {formatBDT(top3[0].totalSales)}
                    </p>
                  </div>
                  {/* Podium Block */}
                  <div className="w-24 h-24 bg-amber-500/15 border-t-2 border-amber-400 rounded-t-xl flex flex-col items-center justify-center backdrop-blur-xs shadow-[inset_0_1px_10px_rgba(251,191,36,0.06)]">
                    <span className="text-amber-400 font-black text-sm uppercase tracking-wider">1st</span>
                    <span className="text-[8px] text-amber-300/80 font-bold mt-0.5">{top3[0].orderCount} orders</span>
                  </div>
                </div>
              )}

              {/* 3rd Place Column */}
              {top3[2] && (
                <div className="flex flex-col items-center group cursor-pointer transition-all duration-300 hover:-translate-y-1">
                  <div className="flex flex-col items-center gap-1.5 mb-2">
                    <span className="text-lg animate-bounce select-none">🥉</span>
                    <div className="w-12 h-12 rounded-full flex items-center justify-center font-black uppercase ring-2 ring-orange-400/40 bg-gradient-to-br from-orange-300 to-orange-500 text-slate-900 shadow-md">
                      {top3[2].username.charAt(0)}
                    </div>
                    <p className="text-[10px] font-black text-pink-100 truncate max-w-[65px] text-center">
                      {top3[2].id === myId ? "You" : top3[2].username}
                    </p>
                    <p className="text-[9px] font-extrabold text-pink-200/80 font-mono">
                      {formatBDT(top3[2].totalSales)}
                    </p>
                  </div>
                  {/* Podium Block */}
                  <div className="w-20 h-10 bg-orange-500/10 border-t border-orange-400/35 rounded-t-xl flex flex-col items-center justify-center backdrop-blur-xs">
                    <span className="text-orange-300/80 font-black text-[10px] uppercase tracking-wide">3rd</span>
                    <span className="text-[8px] text-orange-400/80 font-bold mt-0.5">{top3[2].orderCount} orders</span>
                  </div>
                </div>
              )}

            </div>
          )}

          {/* ── Scrollable rest list ── */}
          {rest.length > 0 && (
            <div className="overflow-y-auto flex-1 bg-black/5" style={{ maxHeight: 240 }}>
              <div className="divide-y divide-white/5">
                {rest.map((s, i) => {
                  const rank = i + 4;
                  const isMe = s.id === myId;
                  return (
                    <div
                      key={s.id}
                      className={`flex items-center gap-3 px-5 py-3 transition-all duration-200 hover:translate-x-1 ${
                        isMe ? "bg-white/10" : "hover:bg-white/[0.03]"
                      }`}
                    >
                      <span className={`w-6 text-xs font-bold text-center flex-shrink-0 ${isMe ? "text-amber-300" : "text-pink-200/60"}`}>
                        {rank}
                      </span>
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black uppercase flex-shrink-0 ${
                        isMe
                          ? "bg-gradient-to-br from-blue-400 to-blue-600 text-white shadow-md scale-105"
                          : "bg-white/10 text-pink-100"
                      }`}>
                        {s.username.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className={`block text-xs truncate ${isMe ? "text-white font-black" : "text-pink-100/90 font-medium"}`}>
                          {isMe ? "You" : s.username}
                        </span>
                        <p className="text-[9px] text-pink-200/50 mt-0.5 font-medium">
                          {s.orderCount} Orders
                        </p>
                      </div>
                      <span className={`text-xs font-bold font-mono flex-shrink-0 ${isMe ? "text-amber-300" : "text-pink-200/80"}`}>
                        {formatBDT(s.totalSales)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
