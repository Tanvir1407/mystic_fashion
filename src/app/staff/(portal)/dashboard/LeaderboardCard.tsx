"use client";

import { formatBDT } from "@/utils/formatPrice";
import { Trophy, Crown, TrendingUp } from "lucide-react";

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
  const myEntry = leaderboard.find((s) => s.id === myId);
  const top3 = leaderboard.slice(0, 3);
  const rest = leaderboard.slice(3, 10); // max 10 total
  const nextEntry = myRank > 1 ? leaderboard[myRank - 2] : null;
  const gap = nextEntry ? nextEntry.totalSales - (myEntry?.totalSales ?? 0) : 0;

  // Podium order: 2nd left, 1st center, 3rd right
  const podiumOrder = [top3[1], top3[0], top3[2]].filter(Boolean) as typeof top3;

  return (
    <div className="bg-primary rounded-xl border border-slate-200 shadow-sm flex flex-col overflow-hidden">

      {/* ── Header ── */}
      <div className=" px-5 pt-4 pb-5 flex-shrink-0">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Trophy className="w-4 h-4 text-amber-400" />
            <div>
              <h3 className="text-sm font-black text-white tracking-wide">Sales Leaderboard</h3>
              <p className="text-[10px] text-slate-400">{monthName} · Top performers</p>
            </div>
          </div>
          {myRank > 0 && (
            <div className="text-right">
              <p className="text-[10px] text-slate-400">Your rank</p>
              <p className="text-2xl font-black text-white leading-none">#{myRank}</p>
            </div>
          )}
        </div>


      </div>

      {leaderboard.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center py-10">
          <Trophy className="w-8 h-8 text-slate-200 mb-2" />
          <p className="text-sm text-slate-400">No sales this month yet.</p>
        </div>
      ) : (
        <>
          {/* ── Top 3 Podium ── */}
          {top3.length > 0 && (
            <div className="flex items-end justify-center gap-6 px-6 pt-6 pb-4 bg-white flex-shrink-0">
              {podiumOrder.map((s, i) => {
                const rank = top3[1] ? ([2, 1, 3][i]) : 1;
                const isMe = s.id === myId;
                const isFirst = rank === 1;

                const avatarSize = isFirst ? "w-16 h-16 text-xl" : "w-12 h-12 text-base";
                const ringColor = rank === 1 ? "ring-amber-400" : rank === 2 ? "ring-slate-300" : "ring-orange-300";
                const avatarBg = isMe ? "bg-blue-500" : rank === 1 ? "bg-amber-100" : rank === 2 ? "bg-slate-100" : "bg-orange-100";
                const avatarText = isMe ? "text-white" : rank === 1 ? "text-amber-700" : rank === 2 ? "text-slate-600" : "text-orange-700";
                const badge = rank === 1 ? "🥇" : rank === 2 ? "🥈" : "🥉";
                const nameColor = isMe ? "text-blue-700 font-black" : "text-slate-800 font-bold";
                const salesColor = isMe ? "text-blue-600" : "text-slate-500";

                return (
                  <div key={s.id} className="flex flex-col items-center gap-1.5 min-w-0">
                    {isFirst && <Crown className="w-5 h-5 text-amber-500" />}
                    {!isFirst && <span className="text-xl leading-none">{badge}</span>}
                    <div className={`${avatarSize} rounded-full flex items-center justify-center font-black uppercase ring-2 ${ringColor} ${avatarBg} ${avatarText} shadow-md flex-shrink-0`}>
                      {s.username.charAt(0)}
                    </div>
                    <p className={`text-xs ${nameColor} truncate max-w-[72px] text-center`}>
                      {s.username}
                    </p>
                    <p className={`text-[11px] font-semibold ${salesColor}`}>{formatBDT(s.totalSales)}</p>
                    {isFirst && <span className="text-[10px] font-black text-amber-500 uppercase tracking-wide">1st</span>}
                  </div>
                );
              })}
            </div>
          )}

          {/* ── Scrollable rest list ── */}
          {rest.length > 0 && (
            <div className="border-t border-slate-100 overflow-y-auto flex-1" style={{ maxHeight: 240 }}>
              <div className="divide-y divide-slate-100">
                {rest.map((s, i) => {
                  const rank = i + 4;
                  const isMe = s.id === myId;
                  return (
                    <div
                      key={s.id}
                      className={`flex items-center gap-3 px-4 py-3 transition-colors ${isMe ? "bg-emerald-50" : "hover:bg-slate-50"}`}
                    >
                      <span className={`w-6 text-xs font-bold text-center flex-shrink-0 ${isMe ? "text-emerald-700" : "text-slate-400"}`}>
                        {rank}
                      </span>
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black uppercase flex-shrink-0 ${isMe ? "bg-emerald-500 text-white" : "bg-slate-100 text-slate-600"}`}>
                        {s.username.charAt(0)}
                      </div>
                      <span className={`flex-1 text-sm truncate ${isMe ? "text-emerald-800 font-black" : "text-slate-700 font-medium"}`}>
                        {isMe ? "You" : s.username}
                      </span>
                      <span className={`text-sm font-bold flex-shrink-0 ${isMe ? "text-emerald-700" : "text-slate-600"}`}>
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
