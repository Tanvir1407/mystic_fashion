"use client";

import { useState } from "react";
import { createDiscount, updateDiscount } from "./actions";
import { Loader2, X, Percent, Banknote, Save } from "lucide-react";

interface DiscountFormProps {
  discount?: any;
  onClose: () => void;
  onSuccess: () => void;
}

export function DiscountForm({ discount, onClose, onSuccess }: DiscountFormProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [formData, setFormData] = useState({
    name: discount?.name || "",
    discountType: discount?.discountType || "PERCENTAGE",
    value: discount?.value || 0,
    active: discount?.active ?? true,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      if (discount) {
        await updateDiscount(discount.id, formData);
      } else {
        await createDiscount(formData);
      }
      onSuccess();
    } catch (err: any) {
      setError(err.message || "An error occurred.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200 ring-1 ring-black/5 animate-in zoom-in-95 duration-200">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div>
            <h2 className="text-xl font-bold text-slate-900">{discount ? "Edit Discount" : "Create New Discount"}</h2>
            <p className="text-xs text-slate-500 font-medium mt-0.5">Define your promotional rule and pricing structure.</p>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-white rounded-lg transition-all border border-transparent hover:border-slate-200">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="p-4 bg-red-50 border border-red-100 rounded-xl text-red-600 text-sm font-bold flex items-center gap-3">
              <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 gap-6">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Discount Label</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="E.G. FLASH SALE 20%"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:bg-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Value Type</label>
                <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-xl border border-slate-200">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, discountType: "FLAT" })}
                    className={`flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-bold transition-all ${formData.discountType === "FLAT" ? "bg-white text-indigo-600 shadow-sm ring-1 ring-black/5" : "text-slate-500 hover:text-slate-700"
                      }`}
                  >
                    <Banknote className="w-3.5 h-3.5" />
                    Flat
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, discountType: "PERCENTAGE" })}
                    className={`flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-bold transition-all ${formData.discountType === "PERCENTAGE" ? "bg-white text-indigo-600 shadow-sm ring-1 ring-black/5" : "text-slate-500 hover:text-slate-700"
                      }`}
                  >
                    <Percent className="w-3.5 h-3.5" />
                    Off
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Amount</label>
                <div className="relative">
                  <input
                    type="number"
                    required
                    min="0"
                    step="0.001"
                    value={formData.value}
                    onChange={(e) => setFormData({ ...formData, value: parseFloat(e.target.value) || 0 })}
                    className="w-full pl-4 pr-10 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:bg-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all outline-none font-mono"
                  />
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400">
                    {formData.discountType === "FLAT" ? <span className="text-xs font-black">৳</span> : <Percent className="w-4 h-4" />}
                  </div>
                </div>
              </div>
            </div>

            <label className="flex items-center gap-3 p-4 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer group hover:bg-white transition-all">
              <div className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.active}
                  onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
              </div>
              <span className="text-sm font-bold text-slate-700 group-hover:text-slate-900 transition-colors">Mark as Active</span>
            </label>
          </div>

          <div className="pt-4 flex items-center gap-3">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-slate-900 text-white py-4 rounded-xl font-black uppercase tracking-widest text-xs hover:bg-black hover:shadow-xl hover:shadow-black/10 transition-all flex items-center justify-center gap-3 disabled:opacity-50 group active:scale-[0.98]"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  {discount ? "Update Rule" : "Create Rule"}
                </>
              )}
            </button>
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-6 py-4 border border-slate-200 rounded-xl font-bold uppercase tracking-widest text-xs hover:bg-slate-50 transition-all active:scale-[0.98] text-slate-600"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
