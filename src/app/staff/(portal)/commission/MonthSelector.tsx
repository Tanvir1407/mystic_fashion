"use client";

import { useRouter } from "next/navigation";

export default function MonthSelector({
  current,
  options,
}: {
  current: string;
  options: { month: number; year: number; label: string }[];
}) {
  const router = useRouter();

  return (
    <select
      value={current}
      onChange={(e) => {
        const [m, y] = e.target.value.split("-");
        router.push(`/staff/commission?month=${m}&year=${y}`);
      }}
      className="text-sm px-3 py-2 border border-slate-200 rounded-lg bg-white focus:border-slate-400 focus:outline-none"
    >
      {options.map((o) => (
        <option key={`${o.month}-${o.year}`} value={`${o.month}-${o.year}`}>
          {o.label}
        </option>
      ))}
    </select>
  );
}
