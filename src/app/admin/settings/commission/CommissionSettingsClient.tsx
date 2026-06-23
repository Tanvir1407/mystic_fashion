"use client";

import { useState } from "react";
import { Save, Loader2 } from "lucide-react";
import { updateCommissionSettingsAction } from "./actions";

export default function CommissionSettingsClient({ initialRate }: { initialRate: number }) {
  const [rate, setRate] = useState(String(initialRate));
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSaved(false);
    await updateCommissionSettingsAction(parseFloat(rate) || 0);
    setLoading(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Commission Rate (%)</label>
        <div className="relative max-w-xs">
          <input
            type="number"
            min={0}
            max={100}
            step={0.1}
            required
            value={rate}
            onChange={(e) => setRate(e.target.value)}
            className="w-full pr-8 pl-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold focus:bg-white focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all outline-none"
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">%</span>
        </div>
        <p className="text-xs text-slate-400 italic">
          Commission = (Order Total − Delivery Charge − Discount) × Rate%
          <br />Returns are subtracted from the base amount.
        </p>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white text-sm font-medium rounded-lg hover:bg-slate-800 transition-colors disabled:opacity-50"
      >
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
        {saved ? "Saved!" : "Save Changes"}
      </button>
    </form>
  );
}
