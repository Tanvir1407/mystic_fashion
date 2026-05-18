"use client";

import { useState } from "react";
import { Ticket, Plus, Trash2, Edit2, CheckCircle2, XCircle, Search, Filter } from "lucide-react";
import { deleteCoupon, toggleCouponStatus } from "./actions";
import { CouponForm } from "./CouponForm";

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
  const [showForm, setShowForm] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<any>(null);
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
          <button
            onClick={() => {
              setEditingCoupon(null);
              setShowForm(true);
            }}
            className="h-10 px-4 bg-slate-900 text-white text-sm font-medium rounded-md flex items-center justify-center gap-2 hover:bg-slate-800 transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Add New Coupon
          </button>
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
                <th className="px-4 py-3 font-semibold text-xs text-slate-500 uppercase tracking-wider">Validity Period</th>
                <th className="px-4 py-3 font-semibold text-xs text-slate-500 uppercase tracking-wider">Status</th>
                {(canEdit || canDelete) && (
                  <th className="px-4 py-3 font-semibold text-xs text-slate-500 uppercase tracking-wider text-right">Actions</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredCoupons.map((coupon) => {
                const now = new Date();
                const start = coupon.startDate ? new Date(coupon.startDate) : null;
                const end = coupon.endDate ? new Date(coupon.endDate) : null;
                const isExpired = end && now > end;
                const isNotStarted = start && now < start;
                
                return (
                  <tr key={coupon.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded bg-slate-100 flex items-center justify-center border border-slate-200">
                          <Ticket className="w-4 h-4 text-slate-500" />
                        </div>
                        <span className="font-medium text-sm text-slate-900">{coupon.code}</span>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex flex-col">
                        <span className="text-sm text-slate-900">
                          {coupon.type === "PERCENTAGE" ? `${coupon.value}% Off` : `৳${coupon.value.toLocaleString()} Flat`}
                        </span>
                        <span className="text-[10px] text-slate-500 uppercase mt-0.5">On all orders</span>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm text-slate-600">
                            {start ? start.toLocaleDateString('en-GB') : "No start"}
                            <span className="mx-1 text-slate-400">-</span>
                            {end ? end.toLocaleDateString('en-GB') : "Infinite"}
                          </span>
                        </div>
                        {isExpired && <span className="text-[10px] font-medium text-red-600">Expired</span>}
                        {isNotStarted && <span className="text-[10px] font-medium text-amber-600">Upcoming</span>}
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
                    {(canEdit || canDelete) && (
                      <td className="px-4 py-4 text-right">
                        <div className="flex items-center justify-end gap-2 outline-none">
                          {canEdit && (
                            <button
                              onClick={() => {
                                setEditingCoupon(coupon);
                                setShowForm(true);
                              }}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-indigo-600 bg-indigo-50 border border-indigo-200 rounded-md hover:bg-indigo-100 hover:border-indigo-300 transition-colors"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                              Edit
                            </button>
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
                    )}
                  </tr>
                );
              })}
              {filteredCoupons.length === 0 && (
                <tr>
                  <td colSpan={canEdit || canDelete ? 5 : 4} className="px-6 py-20 text-center">
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

      {showForm && (
        <CouponForm
          coupon={editingCoupon}
          onClose={() => {
            setShowForm(false);
            setEditingCoupon(null);
          }}
          onSuccess={() => {
            setShowForm(false);
            setEditingCoupon(null);
            // Refresh strategy: Since we're client side, we might just re-fetch
            window.location.reload(); 
          }}
        />
      )}
    </div>
  );
}
