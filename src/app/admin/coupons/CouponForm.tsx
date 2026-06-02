"use client";

import { useState } from "react";
import { CouponType } from "@/generated/prisma/client";
import { createCoupon, updateCoupon } from "./actions";
import { Loader2, ArrowLeft, Save, Percent, Banknote, Calendar, ShieldCheck, Tag, Info } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface CouponFormProps {
  coupon?: any;
}

export function CouponForm({ coupon }: CouponFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [formData, setFormData] = useState({
    code: coupon?.code || "",
    type: (coupon?.type as CouponType) || "FLAT",
    value: coupon?.value || 0,
    startDate: coupon?.startDate ? new Date(coupon.startDate).toISOString().split("T")[0] : "",
    endDate: coupon?.endDate ? new Date(coupon.endDate).toISOString().split("T")[0] : "",
    isActive: coupon?.isActive ?? true,
    minCartValue: coupon?.minCartValue !== undefined && coupon?.minCartValue !== null ? coupon.minCartValue : "",
    maxCartValue: coupon?.maxCartValue !== undefined && coupon?.maxCartValue !== null ? coupon.maxCartValue : "",
    maxDiscountAmount: coupon?.maxDiscountAmount !== undefined && coupon?.maxDiscountAmount !== null ? coupon.maxDiscountAmount : "",
    excludeSaleItems: coupon?.excludeSaleItems ?? false,
    usageLimitTotal: coupon?.usageLimitTotal !== undefined && coupon?.usageLimitTotal !== null ? coupon.usageLimitTotal : "",
    usageLimitPerUser: coupon?.usageLimitPerUser ?? 1,
    customerSegment: coupon?.customerSegment || "ALL",
    includedProductIds: coupon?.includedProductIds ? coupon.includedProductIds.join(", ") : "",
    excludedProductIds: coupon?.excludedProductIds ? coupon.excludedProductIds.join(", ") : "",
    includedCategoryIds: coupon?.includedCategoryIds ? coupon.includedCategoryIds.join(", ") : "",
    excludedCategoryIds: coupon?.excludedCategoryIds ? coupon.excludedCategoryIds.join(", ") : "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const parseStringArray = (str: string) => {
      return str.split(",")
        .map(s => s.trim())
        .filter(s => s.length > 0);
    };

    const parseNumber = (val: any) => {
      const parsed = parseFloat(val);
      return isNaN(parsed) ? null : parsed;
    };

    const parseIntNumber = (val: any) => {
      const parsed = parseInt(val);
      return isNaN(parsed) ? null : parsed;
    };

    const data = {
      ...formData,
      value: formData.type === "FREE_SHIPPING" ? 0 : parseFloat(formData.value as any) || 0,
      startDate: formData.startDate ? new Date(formData.startDate) : null,
      endDate: formData.endDate ? new Date(formData.endDate) : null,
      minCartValue: parseNumber(formData.minCartValue),
      maxCartValue: parseNumber(formData.maxCartValue),
      maxDiscountAmount: parseNumber(formData.maxDiscountAmount),
      usageLimitTotal: parseIntNumber(formData.usageLimitTotal),
      usageLimitPerUser: parseInt(formData.usageLimitPerUser as any) || 1,
      customerSegment: formData.customerSegment === "ALL" ? null : formData.customerSegment,
      includedProductIds: parseStringArray(formData.includedProductIds),
      excludedProductIds: parseStringArray(formData.excludedProductIds),
      includedCategoryIds: parseStringArray(formData.includedCategoryIds),
      excludedCategoryIds: parseStringArray(formData.excludedCategoryIds),
    };

    const res = coupon
      ? await updateCoupon(coupon.id, data)
      : await createCoupon(data);

    if (res.success) {
      router.push("/admin/coupons");
      router.refresh();
    } else {
      setError(res.error || "An error occurred.");
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6 w-full pb-12 px-4 max-w-[1600px] mx-auto">

      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-5">
        <div className="flex items-center gap-4">
          <Link href="/admin/coupons" className="p-2 bg-slate-100 hover:bg-slate-200 rounded-none transition-colors text-slate-500 font-bold flex items-center justify-center">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
              {coupon ? "Edit Coupon" : "Add New Coupon"}
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">Configure coupon properties, targeting filters, and cart limit rules.</p>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="px-6 py-2.5 bg-slate-900 text-white text-xs font-bold uppercase tracking-widest rounded-none flex items-center justify-center gap-2 hover:bg-slate-800 transition-all disabled:opacity-75 shadow-none active:scale-[0.98]"
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          Save Coupon Promo
        </button>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-100 rounded-none text-red-600 text-sm font-bold flex items-center gap-3">
          <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
          {error}
        </div>
      )}

      {/* Main Grid Layout - 3 Columns on Large Screens */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/* Left Column (2/3 of Page) - Core Information & Targeting */}
        <div className="lg:col-span-2 space-y-6">

          {/* Card 1: Basic Discount Configurations */}
          <div className="bg-white border border-slate-200 rounded-none p-6 shadow-none">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4 border-b border-slate-100 pb-2 flex items-center gap-2">
              <Tag className="w-4 h-4 text-indigo-600" />
              Basic Discount Configuration
            </h2>

            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-2">Coupon Code *</label>
                  <input
                    type="text"
                    required
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                    placeholder="E.G. SUMMER50"
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-none focus:outline-none focus:border-slate-900 focus:ring-0 text-sm font-black tracking-widest bg-slate-50 focus:bg-white placeholder:font-normal placeholder:text-slate-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-2">Discount Type *</label>
                  <div className="grid grid-cols-3 gap-1 p-1 bg-slate-100 rounded-none border border-slate-200">
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, type: "FLAT" })}
                      className={`flex items-center justify-center gap-1.5 py-2.5 rounded-none text-xs font-bold transition-all ${formData.type === "FLAT" ? "bg-white text-indigo-600 shadow-sm ring-1 ring-black/5" : "text-slate-500 hover:text-slate-700"}`}
                    >
                      <Banknote className="w-3.5 h-3.5" />
                      Flat
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, type: "PERCENTAGE" })}
                      className={`flex items-center justify-center gap-1.5 py-2.5 rounded-none text-xs font-bold transition-all ${formData.type === "PERCENTAGE" ? "bg-white text-indigo-600 shadow-sm ring-1 ring-black/5" : "text-slate-500 hover:text-slate-700"}`}
                    >
                      <Percent className="w-3.5 h-3.5" />
                      Percent
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, type: "FREE_SHIPPING" })}
                      className={`flex items-center justify-center gap-1.5 py-2.5 rounded-none text-xs font-bold transition-all ${formData.type === "FREE_SHIPPING" ? "bg-white text-indigo-600 shadow-sm ring-1 ring-black/5" : "text-slate-500 hover:text-slate-700"}`}
                    >
                      Free Ship
                    </button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {formData.type !== "FREE_SHIPPING" ? (
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-2">Discount Value *</label>
                    <div className="relative">
                      <input
                        type="number"
                        required
                        min="0"
                        step="0.01"
                        value={formData.value}
                        onChange={(e) => setFormData({ ...formData, value: parseFloat(e.target.value) || 0 })}
                        className="w-full pl-4 pr-10 py-2.5 border border-slate-300 rounded-none focus:outline-none focus:border-slate-900 text-sm font-bold bg-slate-50 focus:bg-white placeholder:font-normal placeholder:text-slate-400"
                      />
                      <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400">
                        {formData.type === "FLAT" ? <span className="text-xs font-black">৳</span> : <Percent className="w-4 h-4" />}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-indigo-50 border border-indigo-100 rounded-none p-3.5 flex flex-col justify-center">
                    <span className="text-xs font-bold text-indigo-800 flex items-center gap-1.5"> Free Shipping Active</span>
                    <span className="text-[10px] text-indigo-600/80 font-medium">Waives all delivery and shipping fees.</span>
                  </div>
                )}

                {formData.type === "PERCENTAGE" && (
                  <div className="animate-in fade-in duration-200">
                    <label className="block text-xs font-semibold text-slate-500 mb-2">Maximum Discount Cap (৳)</label>
                    <input
                      type="number"
                      min="0"
                      placeholder="E.G. 1000 (No cap if empty)"
                      value={formData.maxDiscountAmount}
                      onChange={(e) => setFormData({ ...formData, maxDiscountAmount: e.target.value })}
                      className="w-full px-4 py-2.5 border border-slate-300 rounded-none focus:outline-none focus:border-slate-900 text-sm font-bold bg-slate-50 focus:bg-white placeholder:font-normal placeholder:text-slate-400"
                    />
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-2 flex items-center gap-1.5">
                    <Calendar className="w-4 h-4" />
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-none focus:outline-none focus:border-slate-900 text-sm font-medium bg-slate-50 focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-2 flex items-center gap-1.5">
                    <Calendar className="w-4 h-4" />
                    End Date
                  </label>
                  <input
                    type="date"
                    value={formData.endDate}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-none focus:outline-none focus:border-slate-900 text-sm font-medium bg-slate-50 focus:bg-white"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Card 2: Targeting & Filter Whitelists / Blacklists */}
          <div className="bg-white border border-slate-200 rounded-none p-6 shadow-none">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4 border-b border-slate-100 pb-2">
              Targeting Filters (Whitelists / Blacklists)
            </h2>
            <p className="text-[11px] text-slate-400 flex items-center gap-1 bg-slate-50 p-2.5 rounded-none border border-slate-200/50 mb-6">
              <Info className="w-4 h-4 flex-shrink-0 text-slate-500" />
              Provide comma-separated UUIDs (e.g. `uuid-1, uuid-2`). Leave empty to apply cart-wide.
            </p>

            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-2">Included Product IDs</label>
                  <textarea
                    rows={3}
                    value={formData.includedProductIds}
                    onChange={(e) => setFormData({ ...formData, includedProductIds: e.target.value })}
                    placeholder="prod-uuid-1, prod-uuid-2"
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-none focus:outline-none focus:border-slate-900 text-xs font-mono resize-none bg-slate-50 focus:bg-white placeholder:font-normal placeholder:text-slate-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-2">Excluded Product IDs</label>
                  <textarea
                    rows={3}
                    value={formData.excludedProductIds}
                    onChange={(e) => setFormData({ ...formData, excludedProductIds: e.target.value })}
                    placeholder="prod-uuid-3, prod-uuid-4"
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-none focus:outline-none focus:border-slate-900 text-xs font-mono resize-none bg-slate-50 focus:bg-white placeholder:font-normal placeholder:text-slate-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-2">Included Category IDs</label>
                  <textarea
                    rows={3}
                    value={formData.includedCategoryIds}
                    onChange={(e) => setFormData({ ...formData, includedCategoryIds: e.target.value })}
                    placeholder="cat-uuid-1, cat-uuid-2"
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-none focus:outline-none focus:border-slate-900 text-xs font-mono resize-none bg-slate-50 focus:bg-white placeholder:font-normal placeholder:text-slate-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-2">Excluded Category IDs</label>
                  <textarea
                    rows={3}
                    value={formData.excludedCategoryIds}
                    onChange={(e) => setFormData({ ...formData, excludedCategoryIds: e.target.value })}
                    placeholder="cat-uuid-3, cat-uuid-4"
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-none focus:outline-none focus:border-slate-900 text-xs font-mono resize-none bg-slate-50 focus:bg-white placeholder:font-normal placeholder:text-slate-400"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column (1/3 of Page) - Rules, Restrictions & Status */}
        <div className="space-y-6">

          {/* Card 3: Status & Activation */}
          <div className="bg-white border border-slate-200 rounded-none p-6 shadow-none">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4 border-b border-slate-100 pb-2">
              Status & Activation
            </h2>

            <label className="flex items-center gap-3 p-2 rounded-none cursor-pointer group">
              <div className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-bold text-slate-700 group-hover:text-slate-900 transition-colors">Mark as Active</span>
                <span className="text-[10px] text-slate-400">Coupon will be checkable by checkout cart</span>
              </div>
            </label>
          </div>

          {/* Card 4: Spend & Claims Restrictions */}
          <div className="bg-white border border-slate-200 rounded-none p-6 shadow-none">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4 border-b border-slate-100 pb-2 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-indigo-600" />
              Usage Restrictions
            </h2>

            <div className="space-y-5">
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-2">Minimum Cart Spend (৳)</label>
                <input
                  type="number"
                  min="0"
                  placeholder="Unlimited if empty"
                  value={formData.minCartValue}
                  onChange={(e) => setFormData({ ...formData, minCartValue: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-none focus:outline-none focus:border-slate-900 text-sm font-semibold bg-slate-50 focus:bg-white placeholder:font-normal placeholder:text-slate-400"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-2">Maximum Cart Spend (৳)</label>
                <input
                  type="number"
                  min="0"
                  placeholder="Unlimited if empty"
                  value={formData.maxCartValue}
                  onChange={(e) => setFormData({ ...formData, maxCartValue: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-none focus:outline-none focus:border-slate-900 text-sm font-semibold bg-slate-50 focus:bg-white placeholder:font-normal placeholder:text-slate-400"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-2">Global Usage Limit (Stock)</label>
                <input
                  type="number"
                  min="0"
                  placeholder="Unlimited if empty"
                  value={formData.usageLimitTotal}
                  onChange={(e) => setFormData({ ...formData, usageLimitTotal: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-none focus:outline-none focus:border-slate-900 text-sm font-semibold bg-slate-50 focus:bg-white placeholder:font-normal placeholder:text-slate-400"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-2">Usage Limit Per User</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={formData.usageLimitPerUser}
                  onChange={(e) => setFormData({ ...formData, usageLimitPerUser: parseInt(e.target.value) || 1 })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-none focus:outline-none focus:border-slate-900 text-sm font-semibold bg-slate-50 focus:bg-white placeholder:font-normal placeholder:text-slate-400"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-2">Customer Segment Target</label>
                <select
                  value={formData.customerSegment}
                  onChange={(e) => setFormData({ ...formData, customerSegment: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-none focus:outline-none focus:border-slate-900 text-sm font-semibold bg-slate-50 focus:bg-white cursor-pointer"
                >
                  <option value="ALL">All Customers</option>
                  <option value="NEW_USER">New User Only</option>
                  <option value="VIP">VIP Segment</option>
                </select>
              </div>

              <label className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-200 rounded-none cursor-pointer group hover:bg-white transition-all mt-4">
                <div className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.excludeSaleItems}
                    onChange={(e) => setFormData({ ...formData, excludeSaleItems: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                </div>
                <div className="flex flex-col select-none">
                  <span className="text-xs font-bold text-slate-700 group-hover:text-slate-950 transition-colors">Exclude Sale Items</span>
                  <span className="text-[9px] text-slate-400 mt-0.5">Do not apply to sale/discounted items</span>
                </div>
              </label>
            </div>
          </div>
        </div>
      </div>
    </form>
  );
}
