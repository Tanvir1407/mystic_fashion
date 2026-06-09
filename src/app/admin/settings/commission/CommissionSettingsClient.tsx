"use client";

import { useState } from "react";
import { Save, Loader2, Plus, Trash2, GripVertical } from "lucide-react";

interface Slab {
  id?: string;
  minAmount: number;
  maxAmount: number | null;
  rate: number;
  priority: number;
}

export default function CommissionSettingsClient({ initialSlabs }: { initialSlabs: Slab[] }) {
  const [slabs, setSlabs] = useState<Slab[]>(
    initialSlabs.length > 0
      ? initialSlabs
      : [
          { minAmount: 0, maxAmount: 5000, rate: 0, priority: 1 },
          { minAmount: 5001, maxAmount: 10000, rate: 1, priority: 2 },
          { minAmount: 10001, maxAmount: null, rate: 1.5, priority: 3 },
        ]
  );
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);

  const updateSlab = (index: number, field: keyof Slab, value: string) => {
    setSlabs((prev) => {
      const next = [...prev];
      const num = value === "" ? 0 : parseFloat(value);
      if (field === "maxAmount") {
        next[index] = { ...next[index], maxAmount: value === "" ? null : num };
      } else if (field === "rate") {
        next[index] = { ...next[index], rate: num };
      } else {
        next[index] = { ...next[index], [field]: num };
      }
      return next;
    });
  };

  const addSlab = () => {
    const last = slabs[slabs.length - 1];
    const nextMin = last ? (last.maxAmount ?? last.minAmount) + 1 : 0;
    setSlabs([...slabs, { minAmount: nextMin, maxAmount: nextMin + 5000, rate: 0, priority: slabs.length + 1 }]);
  };

  const removeSlab = (index: number) => {
    if (slabs.length <= 1) return;
    setSlabs(slabs.filter((_, i) => i !== index).map((s, i) => ({ ...s, priority: i + 1 })));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSaved(false);

    try {
      const res = await fetch("/api/admin/settings/commission", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slabs }),
      });
      const data = await res.json();
      if (data.success) {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      }
    } catch {
      //
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-200">
              <th className="pb-2 text-xs font-semibold text-slate-500 uppercase tracking-wider w-8">#</th>
              <th className="pb-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">From (BDT)</th>
              <th className="pb-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">To (BDT)</th>
              <th className="pb-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">Rate (%)</th>
              <th className="pb-2 w-10" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {slabs.map((slab, i) => (
              <tr key={i}>
                <td className="py-2 text-sm font-medium text-slate-400">{i + 1}</td>
                <td className="py-2 pr-2">
                  <input
                    type="number"
                    min={0}
                    value={slab.minAmount}
                    onChange={(e) => updateSlab(i, "minAmount", e.target.value)}
                    className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded text-sm focus:bg-white focus:ring-2 focus:ring-green-500/20 focus:border-green-500 outline-none"
                  />
                </td>
                <td className="py-2 pr-2">
                  <input
                    type="number"
                    min={0}
                    value={slab.maxAmount ?? ""}
                    onChange={(e) => updateSlab(i, "maxAmount", e.target.value)}
                    placeholder="Unlimited"
                    className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded text-sm focus:bg-white focus:ring-2 focus:ring-green-500/20 focus:border-green-500 outline-none"
                  />
                </td>
                <td className="py-2 pr-2">
                  <div className="relative max-w-[100px]">
                    <input
                      type="number"
                      min={0}
                      step={0.1}
                      value={slab.rate}
                      onChange={(e) => updateSlab(i, "rate", e.target.value)}
                      className="w-full pr-6 pl-2 py-1.5 bg-slate-50 border border-slate-200 rounded text-sm focus:bg-white focus:ring-2 focus:ring-green-500/20 focus:border-green-500 outline-none"
                    />
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 text-xs">%</span>
                  </div>
                </td>
                <td className="py-2">
                  <button
                    type="button"
                    onClick={() => removeSlab(i)}
                    disabled={slabs.length <= 1}
                    className="p-1 text-slate-400 hover:text-red-500 disabled:opacity-30 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <button
        type="button"
        onClick={addSlab}
        className="flex items-center gap-1.5 text-sm font-medium text-green-600 hover:text-green-700 transition-colors"
      >
        <Plus className="w-4 h-4" />
        Add Slab
      </button>

      <div className="pt-2">
        <button
          type="submit"
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white text-sm font-medium rounded-lg hover:bg-slate-800 transition-colors disabled:opacity-50"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {saved ? "Saved!" : "Save Changes"}
        </button>
      </div>
    </form>
  );
}
