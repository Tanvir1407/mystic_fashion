"use client";

import { useState, useTransition, useMemo } from "react";
import { 
  Plus, 
  Tag, 
  Percent, 
  Edit2, 
  X, 
  Search, 
  Filter, 
  CheckCircle2, 
  XCircle, 
  Banknote
} from "lucide-react";
import { updateDiscount, deleteDiscount } from "./actions";
import { DeleteWarningModal } from "@/components/DeleteWarningModal";
import { DiscountForm } from "./DiscountForm";

interface Discount {
  id: string;
  name: string;
  discountType: "FLAT" | "PERCENTAGE";
  value: number;
  active: boolean;
}

export default function DiscountManager({ initialDiscounts }: { initialDiscounts: Discount[] }) {
  const [discounts, setDiscounts] = useState<Discount[]>(initialDiscounts);
  const [isPending, startTransition] = useTransition();
  const [showForm, setShowForm] = useState(false);
  const [editingDiscount, setEditingDiscount] = useState<Discount | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const handleToggleActive = (id: string, currentActive: boolean) => {
    startTransition(async () => {
      await updateDiscount(id, { active: !currentActive });
      setDiscounts(prev => prev.map(d => d.id === id ? { ...d, active: !currentActive } : d));
    });
  };

  const filteredDiscounts = useMemo(() => {
    return discounts.filter(d => 
      d.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [discounts, searchQuery]);

  return (
    <div className="flex flex-col gap-6">
      {/* Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-1 max-w-sm">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search discount..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-4 focus:ring-slate-900/5 focus:border-slate-400 transition-all"
            />
          </div>
          <button className="h-10 px-4 bg-white border border-slate-200 text-slate-600 rounded-xl text-xs font-bold flex items-center gap-2 hover:bg-slate-50 transition-all shadow-sm">
            <Filter className="w-4 h-4" />
            Filter
          </button>
        </div>

        <button
          onClick={() => {
            setEditingDiscount(null);
            setShowForm(true);
          }}
          className="h-12 px-6 bg-slate-900 text-white text-xs font-black uppercase tracking-widest rounded-xl flex items-center justify-center gap-3 hover:bg-black transition-all shadow-lg shadow-black/10 active:scale-[0.98] group"
        >
          <Plus className="w-4 h-4 group-hover:rotate-90 transition-transform duration-300" />
          New Discount
        </button>
      </div>

      {/* Data Table */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm min-h-[400px]">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/50 text-slate-500">
                <th className="px-6 py-4 font-black text-[10px] uppercase tracking-widest">Discount Details</th>
                <th className="px-6 py-4 font-black text-[10px] uppercase tracking-widest text-center">Type</th>
                <th className="px-6 py-4 font-black text-[10px] uppercase tracking-widest text-center">Value</th>
                <th className="px-6 py-4 font-black text-[10px] uppercase tracking-widest text-center">Status</th>
                <th className="px-6 py-4 font-black text-[10px] uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredDiscounts.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-20 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center">
                        <Tag className="w-8 h-8 text-slate-200" />
                      </div>
                      <p className="text-sm text-slate-400 font-bold uppercase tracking-widest">No discount found</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredDiscounts.map((d) => (
                  <tr key={d.id} className={`hover:bg-slate-50/80 transition-colors group ${!d.active ? "opacity-60" : ""}`}>
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${d.discountType === "PERCENTAGE"
                          ? "bg-purple-50 border-purple-100 text-purple-500"
                          : "bg-emerald-50 border-emerald-100 text-emerald-500"
                          }`}>
                          {d.discountType === "PERCENTAGE" ? <Percent className="w-5 h-5" /> : <Banknote className="w-5 h-5" />}
                        </div>
                        <span className="font-black text-sm text-slate-900 uppercase tracking-tight">{d.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-5 text-center">
                      <span className={`inline-flex px-2 py-1 rounded-md text-[10px] font-black uppercase tracking-widest ${d.discountType === "PERCENTAGE" ? "bg-purple-50 text-purple-700" : "bg-emerald-50 text-emerald-700"
                        }`}>
                        {d.discountType}
                      </span>
                    </td>
                    <td className="px-6 py-5 text-center">
                      <span className="text-sm font-mono font-black text-slate-700">
                        {d.discountType === "PERCENTAGE" ? `${d.value}%` : `৳${d.value.toLocaleString()}`}
                      </span>
                    </td>
                    <td className="px-6 py-5 text-center">
                      <button
                        onClick={() => handleToggleActive(d.id, d.active)}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider transition-all border ${d.active
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-100 hover:bg-emerald-100'
                          : 'bg-slate-50 text-slate-400 border-slate-100 hover:bg-slate-100'
                          }`}
                      >
                        {d.active ? (
                          <><CheckCircle2 className="w-3 h-3" /> Active</>
                        ) : (
                          <><XCircle className="w-3 h-3" /> Hidden</>
                        )}
                      </button>
                    </td>
                    <td className="px-6 py-5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button 
                          onClick={() => {
                            setEditingDiscount(d);
                            setShowForm(true);
                          }} 
                          className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <DeleteWarningModal
                          title={`Delete discount "${d.name}"?`}
                          description="This will remove the discount from all associated products immediately."
                          impacts={["Pricing will revert to base price"]}
                          onConfirm={async () => {
                            startTransition(async () => {
                              await deleteDiscount(d.id);
                              setDiscounts(prev => prev.filter(item => item.id !== d.id));
                            });
                          }}
                        />
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showForm && (
        <DiscountForm 
          discount={editingDiscount}
          onClose={() => {
            setShowForm(false);
            setEditingDiscount(null);
          }}
          onSuccess={() => {
            setShowForm(false);
            setEditingDiscount(null);
            window.location.reload();
          }}
        />
      )}
    </div>
  );
}
