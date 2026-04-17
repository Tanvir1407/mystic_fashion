"use client";

import { useState } from "react";
import { CouponType } from "@/generated/prisma/client";
import { createCoupon, updateCoupon } from "./actions";
import { Loader2, X, Percent, Banknote, Calendar } from "lucide-react";

interface CouponFormProps {
  coupon?: any;
  onClose: () => void;
  onSuccess: () => void;
}

export function CouponForm({ coupon, onClose, onSuccess }: CouponFormProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [formData, setFormData] = useState({
    code: coupon?.code || "",
    type: (coupon?.type as CouponType) || "FLAT",
    value: coupon?.value || 0,
    startDate: coupon?.startDate ? new Date(coupon.startDate).toISOString().split("T")[0] : "",
    endDate: coupon?.endDate ? new Date(coupon.endDate).toISOString().split("T")[0] : "",
    isActive: coupon?.isActive ?? true,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const data = {
      ...formData,
      startDate: formData.startDate ? new Date(formData.startDate) : null,
      endDate: formData.endDate ? new Date(formData.endDate) : null,
    };

    const res = coupon
      ? await updateCoupon(coupon.id, data)
      : await createCoupon(data);

    if (res.success) {
      onSuccess();
    } else {
      setError(res.error || "An error occurred.");
    }
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200 ring-1 ring-black/5 animate-in zoom-in-95 duration-200">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div>
            <h2 className="text-xl font-bold text-slate-900">{coupon ? "Edit Coupon" : "Create New Coupon"}</h2>
            <p className="text-xs text-slate-500 font-medium mt-0.5">Define your discount structure and validity.</p>
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
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Coupon Code</label>
              <input
                type="text"
                required
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                placeholder="E.G. SUMMER25"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-black tracking-widest focus:bg-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Discount Type</label>
                <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-xl border border-slate-200">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, type: "FLAT" })}
                    className={`flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-bold transition-all ${
                      formData.type === "FLAT" ? "bg-white text-indigo-600 shadow-sm ring-1 ring-black/5" : "text-slate-500 hover:text-slate-700"
                    }`}
                  >
                    <Banknote className="w-3.5 h-3.5" />
                    Flat
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, type: "PERCENTAGE" })}
                    className={`flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-bold transition-all ${
                      formData.type === "PERCENTAGE" ? "bg-white text-indigo-600 shadow-sm ring-1 ring-black/5" : "text-slate-500 hover:text-slate-700"
                    }`}
                  >
                    <Percent className="w-3.5 h-3.5" />
                    % Off
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Value</label>
                <div className="relative">
                  <input
                    type="number"
                    required
                    min="0"
                    step="0.01"
                    value={formData.value}
                    onChange={(e) => setFormData({ ...formData, value: parseFloat(e.target.value) || 0 })}
                    className="w-full pl-4 pr-10 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:bg-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all outline-none"
                  />
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400">
                    {formData.type === "FLAT" ? <span className="text-xs font-black">৳</span> : <Percent className="w-4 h-4" />}
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1 flex items-center gap-1.5">
                  <Calendar className="w-3 h-3" />
                  Start Date
                </label>
                <input
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:bg-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all outline-none"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1 flex items-center gap-1.5">
                  <Calendar className="w-3 h-3" />
                  End Date
                </label>
                <input
                  type="date"
                  value={formData.endDate}
                  onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:bg-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all outline-none"
                />
              </div>
            </div>

            <label className="flex items-center gap-3 p-4 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer group hover:bg-white transition-all">
              <div className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
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
                  {coupon ? "Update Coupon" : "Create Coupon"}
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
