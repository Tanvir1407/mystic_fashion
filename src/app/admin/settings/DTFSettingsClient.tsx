"use client";

import { useState } from "react";
import { updateDTFPrintSetting } from "../actions";
import { Save } from "lucide-react";

export default function DTFSettingsClient({ initialCost }: { initialCost: number }) {
  const [printCost, setPrintCost] = useState(initialCost.toString());
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await updateDTFPrintSetting(parseInt(printCost) || 0);
    setLoading(false);
    alert("DTF print cost updated successfully!");
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="space-y-1.5">
        <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
          DTF Print Cost Per Item
        </label>
        <div className="relative max-w-xs">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">৳</span>
          <input
            type="number"
            value={printCost}
            onChange={(e) => setPrintCost(e.target.value)}
            className="w-full pl-8 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none"
            required
            min="0"
          />
        </div>
        <p className="text-[10px] text-slate-400 leading-tight italic max-w-md">
          Applied automatically when customers opt for custom jersey printing. 
        </p>
      </div>

      <div className="flex justify-end pt-2 border-t border-slate-100">
        <button
          type="submit"
          disabled={loading}
          className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold uppercase tracking-wider rounded-lg flex items-center justify-center gap-2 transition-all shadow-md shadow-slate-200 active:scale-[0.97] disabled:opacity-50"
        >
          {loading ? (
            <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <Save className="w-3.5 h-3.5" />
          )}
          Update Price
        </button>
      </div>
    </form>
  );
}
