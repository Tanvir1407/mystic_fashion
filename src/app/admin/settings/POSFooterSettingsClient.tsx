"use client";

import { useState } from "react";
import { updateDeliverySettings } from "../actions";
import { Save } from "lucide-react";

interface POSFooterSettingsClientProps {
  initialData: {
    posFooter: string;
  };
}

export default function POSFooterSettingsClient({ initialData }: POSFooterSettingsClientProps) {
  const [posFooter, setPosFooter] = useState(initialData.posFooter || "");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await updateDeliverySettings(undefined, undefined, posFooter);
    setLoading(false);
    alert("POS Receipt Footer updated successfully!");
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="space-y-1.5">
        <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">POS Receipt Footer Message</label>
        <textarea
          value={posFooter}
          onChange={(e) => setPosFooter(e.target.value)}
          className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none min-h-[100px] resize-y"
          placeholder="Thank you for shopping with Mystic. We hope you love your purchase!"
          required
        />
        <p className="text-[10px] text-slate-400 leading-tight italic">This message will appear at the bottom of the printed thermal POS receipts.</p>
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
          Save Configuration
        </button>
      </div>
    </form>
  );
}
