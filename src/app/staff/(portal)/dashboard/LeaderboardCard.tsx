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
  const sortedLeaderboard = useMemo(
    () => [...leaderboard].sort((a, b) => b.totalSales - a.totalSales),
    [leaderboard]
  );
  const top3 = useMemo(() => sortedLeaderboard.slice(0, 3), [sortedLeaderboard]);
  const rest  = useMemo(() => sortedLeaderboard.slice(3, 10), [sortedLeaderboard]);

  return (
    <div className="bg-gradient-to-br from-[#800020] via-[#5c0017] to-[#3a000e] rounded-2xl border border-white/10 shadow-sm flex flex-col overflow-hidden text-white">

      {/* Header */}
      <div className="px-6 pt-5 pb-3 flex-shrink-0">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-400/10 border border-amber-400/20 flex items-center justify-center shrink-0">
              <Trophy className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h3 className="text-sm font-black text-white tracking-wide uppercase">Sales Leaderboard</h3>
              <p className="text-[10px] text-white/40 font-medium">{monthName} · Top performers</p>
            </div>
          </div>
          {myRank > 0 && (
            <div className="text-right">
              <p className="text-[10px] text-white/40 font-semibold uppercase tracking-wider">Your Rank</p>
              <p className="text-2xl font-black text-amber-400 leading-none mt-0.5">#{myRank}</p>
            </div>
          )}
        </div>
      </div>

      {leaderboard.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center py-12">
          <Trophy className="w-9 h-9 text-white/10 mb-2.5" />
          <p className="text-sm text-white/30 font-semibold">No sales logged this month.</p>
        </div>
      ) : (
        <>
          {/* Top 3 Podium */}
          {top3.length > 0 && (
            <div className="flex items-end justify-center gap-2 px-4 pt-8 pb-0 bg-black/15 border-y border-white/8 flex-shrink-0">

              {/* 2nd Place */}
              {top3[1] && (() => {
                const isMe = top3[1].id === myId;
                return (
                  <div className="flex flex-col items-center">
                    <div className="flex flex-col items-center gap-1.5 mb-2">
                      <span className="text-base select-none">🥈</span>
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center font-black uppercase ring-2 ring-white/20 text-sm shadow-sm
                        ${isMe ? "bg-[#800020] text-white border-2 border-white/40" : "bg-white/15 text-white"}`}>
                        {top3[1].username.charAt(0)}
                      </div>
                      <p className="text-[10px] font-bold text-white/80 truncate max-w-[65px] text-center">
                        {isMe ? "You" : top3[1].username}
                      </p>
                      <p className="text-[9px] font-bold text-white/50 font-mono">{formatBDT(top3[1].totalSales)}</p>
                    </div>
                    <div className="w-20 h-14 bg-white/8 border-t border-white/15 rounded-t-xl flex flex-col items-center justify-center">
                      <span className="text-white/60 font-black text-[10px] uppercase tracking-wide">2nd</span>
                      <span className="text-[8px] text-white/35 font-semibold mt-0.5">{top3[1].orderCount} orders</span>
                    </div>
                  </div>
                );
              })()}

              {/* 1st Place */}
              {top3[0] && (() => {
                const isMe = top3[0].id === myId;
                return (
                  <div className="flex flex-col items-center">
                    <div className="flex flex-col items-center gap-1.5 mb-2">
                      <Crown className="w-5 h-5 text-amber-400" />
                      <div className={`w-16 h-16 rounded-full flex items-center justify-center font-black uppercase text-lg ring-2 ring-amber-400/60 shadow-sm
                        ${isMe ? "bg-[#800020] text-white border-2 border-amber-400/80" : "bg-amber-400/20 text-amber-300"}`}>
                        {top3[0].username.charAt(0)}
                      </div>
                      <p className="text-xs font-black text-white truncate max-w-[75px] text-center">
                        {isMe ? "You" : top3[0].username}
                      </p>
                      <p className="text-[10px] font-black text-amber-400 font-mono">{formatBDT(top3[0].totalSales)}</p>
                    </div>
                    <div className="w-24 h-20 bg-amber-400/10 border-t-2 border-amber-400/50 rounded-t-xl flex flex-col items-center justify-center">
                      <span className="text-amber-400 font-black text-xs uppercase tracking-wider">1st</span>
                      <span className="text-[8px] text-amber-400/60 font-semibold mt-0.5">{top3[0].orderCount} orders</span>
                    </div>
                  </div>
                );
              })()}

              {/* 3rd Place */}
              {top3[2] && (() => {
                const isMe = top3[2].id === myId;
                return (
                  <div className="flex flex-col items-center">
                    <div className="flex flex-col items-center gap-1.5 mb-2">
                      <span className="text-base select-none">🥉</span>
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center font-black uppercase ring-2 ring-white/15 text-sm shadow-sm
                        ${isMe ? "bg-[#800020] text-white border-2 border-white/40" : "bg-white/10 text-white/70"}`}>
                        {top3[2].username.charAt(0)}
                      </div>
                      <p className="text-[10px] font-bold text-white/80 truncate max-w-[65px] text-center">
                        {isMe ? "You" : top3[2].username}
                      </p>
                      <p className="text-[9px] font-bold text-white/50 font-mono">{formatBDT(top3[2].totalSales)}</p>
                    </div>
                    <div className="w-20 h-9 bg-white/6 border-t border-white/12 rounded-t-xl flex flex-col items-center justify-center">
                      <span className="text-white/50 font-black text-[10px] uppercase tracking-wide">3rd</span>
                      <span className="text-[8px] text-white/30 font-semibold">{top3[2].orderCount} orders</span>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}

          {/* Scrollable rest list */}
          {rest.length > 0 && (
            <div className="overflow-y-auto flex-1 divide-y divide-white/5">
              {rest.map((s, i) => {
                const rank = i + 4;
                const isMe = s.id === myId;
                return (
                  <div
                    key={s.id}
                    className={`flex items-center gap-3 px-5 py-3 transition-colors cursor-default
                      ${isMe ? "bg-white/10" : "hover:bg-white/5"}`}
                  >
                    <span className={`w-5 text-xs font-bold text-center shrink-0 ${isMe ? "text-amber-400" : "text-white/30"}`}>
                      {rank}
                    </span>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black uppercase shrink-0
                      ${isMe ? "bg-[#800020] text-white ring-1 ring-white/30" : "bg-white/8 text-white/60"}`}>
                      {s.username.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className={`block text-xs truncate ${isMe ? "text-white font-bold" : "text-white/70 font-medium"}`}>
                        {isMe ? "You" : s.username}
                      </span>
                      <p className="text-[9px] text-white/30 mt-0.5">{s.orderCount} orders</p>
                    </div>
                    <span className={`text-xs font-bold shrink-0 ${isMe ? "text-amber-400" : "text-white/50"}`}>
                      {formatBDT(s.totalSales)}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
