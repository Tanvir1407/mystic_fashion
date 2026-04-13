"use client";

import { useState } from "react";
import { updateDeliverySettings } from "../actions";
import { Save } from "lucide-react";

export default function DeliverySettingsClient({ initialData }: { initialData: { insideDhaka: number, outsideDhaka: number } }) {
  const [insideDhaka, setInsideDhaka] = useState(initialData.insideDhaka.toString());
  const [outsideDhaka, setOutsideDhaka] = useState(initialData.outsideDhaka.toString());
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await updateDeliverySettings(parseInt(insideDhaka) || 0, parseInt(outsideDhaka) || 0);
    setLoading(false);
    alert("Delivery settings updated successfully!");
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-semibold text-slate-900 mb-2">Inside Dhaka Fee (৳)</label>
          <input 
            type="number" 
            value={insideDhaka}
            onChange={(e) => setInsideDhaka(e.target.value)}
            className="w-full px-4 py-2 border border-slate-300 rounded-md focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-sm font-mono"
            required
            min="0"
          />
          <p className="text-xs text-slate-500 mt-1">Applied when customer selects 'Dhaka' as their district.</p>
        </div>
        <div>
          <label className="block text-sm font-semibold text-slate-900 mb-2">Outside Dhaka Fee (৳)</label>
          <input 
            type="number" 
            value={outsideDhaka}
            onChange={(e) => setOutsideDhaka(e.target.value)}
            className="w-full px-4 py-2 border border-slate-300 rounded-md focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-sm font-mono"
            required
            min="0"
          />
          <p className="text-xs text-slate-500 mt-1">Applied for all other districts nationwide.</p>
        </div>
      </div>
      <div className="flex justify-end pt-4">
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
