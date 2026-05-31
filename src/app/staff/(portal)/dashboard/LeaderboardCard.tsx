"use client";

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
  const top3 = leaderboard.slice(0, 3);
  const rest = leaderboard.slice(3, 10); // max 10 total

  // Podium order: 2nd left, 1st center, 3rd right
  const podiumOrder = [top3[1], top3[0], top3[2]].filter(Boolean) as typeof top3;

  return (
    <div className="bg-gradient-to-br from-primary via-[#6a001a] to-[#4c0012] rounded-xl border border-primary/20 shadow-md flex flex-col overflow-hidden text-white">

      {/* ── Header ── */}
      <div className="px-5 pt-4 pb-5 flex-shrink-0">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Trophy className="w-4 h-4 text-amber-400 animate-pulse" />
            <div>
              <h3 className="text-sm font-black text-white tracking-wide uppercase">Sales Leaderboard</h3>
              <p className="text-[10px] text-pink-200/70">{monthName} · Top performers</p>
            </div>
          </div>
          {myRank > 0 && (
            <div className="text-right">
              <p className="text-[10px] text-pink-200/70">Your rank</p>
              <p className="text-2xl font-black text-amber-300 leading-none">#{myRank}</p>
            </div>
          )}
        </div>
      </div>

      {leaderboard.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center py-10">
          <Trophy className="w-8 h-8 text-pink-300/20 mb-2" />
          <p className="text-sm text-pink-200/50">No sales this month yet.</p>
        </div>
      ) : (
        <>
          {/* ── Top 3 Podium ── */}
          {top3.length > 0 && (
            <div className="flex items-end justify-center gap-6 px-6 pt-6 pb-4 bg-black/10 backdrop-blur-sm border-y border-white/5 flex-shrink-0">
              {podiumOrder.map((s, i) => {
                const rank = top3[1] ? ([2, 1, 3][i]) : 1;
                const isMe = s.id === myId;
                const isFirst = rank === 1;

                const avatarSize = isFirst ? "w-16 h-16 text-xl" : "w-12 h-12 text-base";
                const ringColor = rank === 1 ? "ring-amber-400/80" : rank === 2 ? "ring-slate-300/60" : "ring-orange-400/60";
                const avatarBg = isMe
                  ? "bg-gradient-to-br from-blue-400 to-blue-600"
                  : rank === 1
                  ? "bg-gradient-to-br from-amber-300 to-amber-500"
                  : rank === 2
                  ? "bg-gradient-to-br from-slate-200 to-slate-400"
                  : "bg-gradient-to-br from-orange-300 to-orange-500";
                const avatarText = isMe ? "text-white" : "text-slate-950";
                const badge = rank === 1 ? "🏆" : rank === 2 ? "🥈" : "🥉";
                const nameColor = isMe ? "text-white font-black underline decoration-blue-400 decoration-2 underline-offset-2" : "text-pink-100 font-bold";
                const salesColor = isMe ? "text-amber-300 font-bold" : "text-pink-200/80";

                return (
                  <div key={s.id} className="flex flex-col items-center gap-1.5 min-w-0">
                    {isFirst && <Crown className="w-5 h-5 text-amber-400" />}
                    {!isFirst && <span className="text-xl leading-none">{badge}</span>}
                    <div className={`${avatarSize} rounded-full flex items-center justify-center font-black uppercase ring-2 ${ringColor} ${avatarBg} ${avatarText} shadow-md flex-shrink-0`}>
                      {s.username.charAt(0)}
                    </div>
                    <p className={`text-xs ${nameColor} truncate max-w-[72px] text-center`}>
                      {isMe ? "You" : s.username}
                    </p>
                    <p className={`text-[11px] font-bold ${salesColor}`}>{formatBDT(s.totalSales)}</p>
                    {isFirst && <span className="text-[10px] font-black text-amber-400 uppercase tracking-wide">1st</span>}
                  </div>
                );
              })}
            </div>
          )}

          {/* ── Scrollable rest list ── */}
          {rest.length > 0 && (
            <div className="overflow-y-auto flex-1" style={{ maxHeight: 240 }}>
              <div className="divide-y divide-white/5">
                {rest.map((s, i) => {
                  const rank = i + 4;
                  const isMe = s.id === myId;
                  return (
                    <div
                      key={s.id}
                      className={`flex items-center gap-3 px-4 py-3 transition-colors ${
                        isMe ? "bg-white/10" : "hover:bg-white/5"
                      }`}
                    >
                      <span className={`w-6 text-xs font-bold text-center flex-shrink-0 ${isMe ? "text-amber-300" : "text-pink-200/60"}`}>
                        {rank}
                      </span>
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black uppercase flex-shrink-0 ${
                        isMe
                          ? "bg-gradient-to-br from-blue-400 to-blue-600 text-white shadow-sm"
                          : "bg-white/10 text-pink-100"
                      }`}>
                        {s.username.charAt(0)}
                      </div>
                      <span className={`flex-1 text-sm truncate ${isMe ? "text-white font-black" : "text-pink-100/90 font-medium"}`}>
                        {isMe ? "You" : s.username}
                      </span>
                      <span className={`text-sm font-bold flex-shrink-0 ${isMe ? "text-amber-300" : "text-pink-200/80"}`}>
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
