"use client";

import { useState } from "react";
import { Ticket, Plus, Trash2, Edit2, CheckCircle2, XCircle, Search, Filter } from "lucide-react";
import { deleteCoupon, toggleCouponStatus } from "./actions";
import { CouponForm } from "./CouponForm";

export function CouponList({ initialCoupons }: { initialCoupons: any[] }) {
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
          <h1 className="text-2xl font-black tracking-tight text-slate-900 uppercase">Coupons & Rewards</h1>
          <p className="text-sm text-slate-500 mt-1 font-medium">Create promotional codes and manage customer discounts.</p>
        </div>
        <button
          onClick={() => {
            setEditingCoupon(null);
            setShowForm(true);
          }}
          className="h-12 px-6 bg-slate-900 text-white text-xs font-black uppercase tracking-widest rounded-xl flex items-center justify-center gap-3 hover:bg-black transition-all shadow-lg shadow-black/10 active:scale-[0.98] group"
        >
          <Plus className="w-4 h-4 group-hover:rotate-90 transition-transform duration-300" />
          Add New Coupon
        </button>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search coupon codes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-400 transition-all"
          />
        </div>
        <button className="h-10 px-4 bg-white border border-slate-200 text-slate-600 rounded-xl text-xs font-bold flex items-center gap-2 hover:bg-slate-50 transition-all shadow-sm">
          <Filter className="w-4 h-4" />
          Filter
        </button>
      </div>

      {/* Data Table */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/50">
                <th className="px-6 py-4 font-black text-[10px] text-slate-500 uppercase tracking-widest">Coupon Code</th>
                <th className="px-6 py-4 font-black text-[10px] text-slate-500 uppercase tracking-widest">Discount</th>
                <th className="px-6 py-4 font-black text-[10px] text-slate-500 uppercase tracking-widest">Validity Period</th>
                <th className="px-6 py-4 font-black text-[10px] text-slate-500 uppercase tracking-widest">Status</th>
                <th className="px-6 py-4 font-black text-[10px] text-slate-500 uppercase tracking-widest text-right">Actions</th>
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
                  <tr key={coupon.id} className="hover:bg-slate-50/80 transition-colors group">
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center border border-indigo-100">
                          <Ticket className="w-5 h-5 text-indigo-500" />
                        </div>
                        <span className="font-black text-sm text-slate-900 tracking-widest">{coupon.code}</span>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-slate-800">
                          {coupon.type === "PERCENTAGE" ? `${coupon.value}% Off` : `৳${coupon.value.toLocaleString()} Flat`}
                        </span>
                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">On all orders</span>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-1.5">
                          <span className={`text-xs font-bold ${isExpired ? 'text-red-500' : isNotStarted ? 'text-amber-500' : 'text-slate-600'}`}>
                            {start ? start.toLocaleDateString() : "No start"}
                            <span className="mx-1 text-slate-300">→</span>
                            {end ? end.toLocaleDateString() : "Infinite"}
                          </span>
                        </div>
                        {isExpired && <span className="text-[9px] font-black uppercase text-red-400 leading-none">Expired</span>}
                        {isNotStarted && <span className="text-[9px] font-black uppercase text-amber-400 leading-none">Upcoming</span>}
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <button
                        onClick={() => handleToggleStatus(coupon.id, coupon.isActive)}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider transition-all border ${
                          coupon.isActive 
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-100 hover:bg-emerald-100' 
                            : 'bg-slate-50 text-slate-400 border-slate-100 hover:bg-slate-100'
                        }`}
                      >
                        {coupon.isActive ? (
                          <><CheckCircle2 className="w-3 h-3" /> Active</>
                        ) : (
                          <><XCircle className="w-3 h-3" /> Inactive</>
                        )}
                      </button>
                    </td>
                    <td className="px-6 py-5 text-right">
                      <div className="flex items-center justify-end gap-2 outline-none">
                        <button
                          onClick={() => {
                            setEditingCoupon(coupon);
                            setShowForm(true);
                          }}
                          className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(coupon.id)}
                          className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filteredCoupons.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-20 text-center">
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
