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
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label className="block text-sm font-semibold text-slate-900 mb-2">
          DTF Print Cost per Item (৳)
        </label>
        <input
          type="number"
          value={printCost}
          onChange={(e) => setPrintCost(e.target.value)}
          className="w-full max-w-xs px-4 py-2 border border-slate-300 rounded-md focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-sm font-mono"
          required
          min="0"
        />
        <p className="text-xs text-slate-500 mt-1">
          This is the additional charge applied per jersey when a customer enables DTF (name & number) printing at checkout.
        </p>
      </div>
      <div className="flex justify-end pt-2">
        <button
          type="submit"
          disabled={loading}
          className="px-6 py-2.5 bg-slate-900 text-white font-medium rounded-md flex items-center justify-center gap-2 hover:bg-slate-800 transition-colors disabled:opacity-75 shadow-sm"
        >
          {loading ? (
            <div className="w-4 h-4 border-2 border-white/50 border-t-white rounded-full animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          Save Settings
        </button>
      </div>
    </form>
  );
}
