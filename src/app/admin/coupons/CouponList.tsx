"use client";

import { useState } from "react";
import { Ticket, Plus, Trash2, Edit2, CheckCircle2, XCircle, Search, Filter, Eye } from "lucide-react";
import { deleteCoupon, toggleCouponStatus } from "./actions";
import Link from "next/link";
import { formatDateTime } from "@/utils/formatDate";

export function CouponList({ 
  initialCoupons,
  canCreate,
  canEdit,
  canDelete
}: { 
  initialCoupons: any[],
  canCreate: boolean,
  canEdit: boolean,
  canDelete: boolean
}) {
  const [coupons, setCoupons] = useState(initialCoupons);
  const [searchQuery, setSearchQuery] = useState("");

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this coupon?")) {
      const res = await deleteCoupon(id);
      if (res.success) {
        setCoupons(coupons.filter(c => c.id !== id));
      } else {
        alert(res.error);
      }
    }
  };

  const handleToggleStatus = async (id: string, currentStatus: boolean) => {
    const res = await toggleCouponStatus(id, !currentStatus);
    if (res.success) {
      setCoupons(coupons.map(c => c.id === id ? { ...c, isActive: !currentStatus } : c));
    }
  };

  const filteredCoupons = coupons.filter(c => 
    c.code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-start sm:items-center justify-between flex-col sm:flex-row gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Coupons & Rewards</h1>
          <p className="text-sm text-slate-500 mt-1">Create promotional codes and manage customer discounts.</p>
        </div>
        {canCreate && (
          <Link
            href="/admin/coupons/new"
            className="h-10 px-4 bg-slate-900 text-white text-sm font-medium rounded-md flex items-center justify-center gap-2 hover:bg-slate-800 transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Add New Coupon
          </Link>
        )}
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search coupon codes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 h-10 bg-white border border-slate-200 rounded-md text-sm focus:outline-none focus:border-slate-400 transition-colors"
          />
        </div>
        <button className="h-10 px-4 bg-white border border-slate-200 text-slate-700 rounded-md text-sm font-medium flex items-center gap-2 hover:bg-slate-50 transition-colors shadow-sm">
          <Filter className="w-4 h-4" />
          Filter
        </button>
      </div>

      {/* Data Table */}
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="px-4 py-3 font-semibold text-xs text-slate-500 uppercase tracking-wider">Coupon Code</th>
                <th className="px-4 py-3 font-semibold text-xs text-slate-500 uppercase tracking-wider">Discount</th>
                <th className="px-4 py-3 font-semibold text-xs text-slate-500 uppercase tracking-wider">Restrictions</th>
                <th className="px-4 py-3 font-semibold text-xs text-slate-500 uppercase tracking-wider">Usage Stats</th>
                <th className="px-4 py-3 font-semibold text-xs text-slate-500 uppercase tracking-wider">Validity Period</th>
                <th className="px-4 py-3 font-semibold text-xs text-slate-500 uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 font-semibold text-xs text-slate-500 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredCoupons.map((coupon) => {
                const now = new Date();
                const start = coupon.startDate ? new Date(coupon.startDate) : null;
                const end = coupon.endDate ? new Date(coupon.endDate) : null;
                const isExpired = end && now > end;
                const isNotStarted = start && now < start;

                const hasTargeting = (coupon.includedProductIds?.length ?? 0) > 0 ||
                                     (coupon.excludedProductIds?.length ?? 0) > 0 ||
                                     (coupon.includedCategoryIds?.length ?? 0) > 0 ||
                                     (coupon.excludedCategoryIds?.length ?? 0) > 0;

                const usagesCount = coupon._count?.usages ?? 0;
                const usageLimit = coupon.usageLimitTotal;
                
                return (
                  <tr key={coupon.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded bg-slate-100 flex items-center justify-center border border-slate-200">
                          <Ticket className="w-4 h-4 text-slate-500" />
                        </div>
                        <div className="flex flex-col">
                          <Link 
                            href={`/admin/coupons/${coupon.id}`}
                            className="font-bold text-sm text-indigo-600 hover:text-indigo-800 hover:underline transition-colors font-mono"
                          >
                            {coupon.code}
                          </Link>
                          {coupon.customerSegment && (
                            <span className="text-[9px] font-black text-indigo-600 uppercase tracking-wider mt-0.5">
                              Segment: {coupon.customerSegment}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex flex-col">
                        <span className="text-sm font-semibold text-slate-950">
                          {coupon.type === "FREE_SHIPPING" ? (
                            "Free Shipping 🚚"
                          ) : coupon.type === "PERCENTAGE" ? (
                            `${coupon.value}% Off`
                          ) : (
                            `৳${coupon.value.toLocaleString()} Flat`
                          )}
                        </span>
                        {coupon.type === "PERCENTAGE" && coupon.maxDiscountAmount && (
                          <span className="text-[10px] text-slate-500 mt-0.5">
                            Capped at ৳{coupon.maxDiscountAmount.toLocaleString()}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex flex-col gap-0.5">
                        {coupon.minCartValue && (
                          <span className="text-xs text-slate-700">
                            Min spend: ৳{coupon.minCartValue.toLocaleString()}
                          </span>
                        )}
                        {coupon.excludeSaleItems && (
                          <span className="text-[9px] font-bold text-rose-600 bg-rose-50 border border-rose-100/50 px-1.5 py-0.5 rounded w-max mt-0.5">
                            Excludes Sale Items
                          </span>
                        )}
                        {hasTargeting && (
                          <span className="text-[9px] font-bold text-amber-600 bg-amber-50 border border-amber-100/50 px-1.5 py-0.5 rounded w-max mt-0.5">
                            Targeted Filters
                          </span>
                        )}
                        {!coupon.minCartValue && !coupon.excludeSaleItems && !hasTargeting && (
                          <span className="text-xs text-slate-400 font-medium">None</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex flex-col">
                        <span className="text-sm text-slate-900 font-medium">
                          {usagesCount} / {usageLimit !== null ? usageLimit : "∞"} claimed
                        </span>
                        <span className="text-[9px] text-slate-400 mt-0.5 uppercase tracking-wider">
                          Limit per user: {coupon.usageLimitPerUser}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs text-slate-600 font-medium">
                            {coupon.startDate ? formatDateTime(coupon.startDate) : "No start"}
                            <span className="mx-1 text-slate-400">-</span>
                            {coupon.endDate ? formatDateTime(coupon.endDate) : "Infinite"}
                          </span>
                        </div>
                        {isExpired && <span className="text-[9px] font-bold text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-100/50 w-max">Expired</span>}
                        {isNotStarted && <span className="text-[9px] font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-100/50 w-max">Upcoming</span>}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      {canEdit ? (
                        <button
                          onClick={() => handleToggleStatus(coupon.id, coupon.isActive)}
                          className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium transition-colors ${
                            coupon.isActive 
                              ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200' 
                              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          }`}
                        >
                          {coupon.isActive ? "Active" : "Inactive"}
                        </button>
                      ) : (
                        <span
                          className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium ${
                            coupon.isActive 
                              ? 'bg-emerald-100 text-emerald-800' 
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {coupon.isActive ? "Active" : "Inactive"}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-4 text-right">
                      <div className="flex items-center justify-end gap-2 outline-none">
                        <Link
                          href={`/admin/coupons/${coupon.id}`}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-50 border border-slate-200 rounded-md hover:bg-slate-100 hover:border-slate-300 transition-colors"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          View
                        </Link>
                        {canEdit && (
                          <Link
                            href={`/admin/coupons/edit/${coupon.id}`}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-indigo-600 bg-indigo-50 border border-indigo-200 rounded-md hover:bg-indigo-100 hover:border-indigo-300 transition-colors"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                            Edit
                          </Link>
                        )}
                        {canDelete && (
                          <button
                            onClick={() => handleDelete(coupon.id)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-red-600 bg-red-50 border border-red-200 rounded-md hover:bg-red-100 hover:border-red-300 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            Delete
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filteredCoupons.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-20 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center">
                        <Ticket className="w-8 h-8 text-slate-200" />
                      </div>
                      <p className="text-sm text-slate-400 font-bold uppercase tracking-widest">No promo codes found</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
