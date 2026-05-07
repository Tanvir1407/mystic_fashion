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
      {/* Header */}
      <div className="flex items-start sm:items-center justify-between flex-col sm:flex-row gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Discount</h1>
          <p className="text-sm text-slate-500 mt-1">Manage global promotional pricing and seasonal offers.</p>
        </div>
        <button
          onClick={() => {
            setEditingDiscount(null);
            setShowForm(true);
          }}
          className="h-10 px-4 bg-slate-900 text-white text-sm font-medium rounded-md flex items-center justify-center gap-2 hover:bg-slate-800 transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" />
          New Discount
        </button>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search discount..."
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
                <th className="px-4 py-3 font-semibold text-xs text-slate-500 uppercase tracking-wider">Discount Details</th>
                <th className="px-4 py-3 font-semibold text-xs text-slate-500 uppercase tracking-wider text-center">Type</th>
                <th className="px-4 py-3 font-semibold text-xs text-slate-500 uppercase tracking-wider text-center">Value</th>
                <th className="px-4 py-3 font-semibold text-xs text-slate-500 uppercase tracking-wider text-center">Status</th>
                <th className="px-4 py-3 font-semibold text-xs text-slate-500 uppercase tracking-wider text-right">Actions</th>
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
                  <tr key={d.id} className={`hover:bg-slate-50/50 transition-colors group ${!d.active ? "opacity-60" : ""}`}>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded bg-slate-100 flex items-center justify-center border border-slate-200">
                          {d.discountType === "PERCENTAGE" ? <Percent className="w-4 h-4 text-slate-500" /> : <Banknote className="w-4 h-4 text-slate-500" />}
                        </div>
                        <span className="font-medium text-sm text-slate-900">{d.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-center">
                      <span className="text-sm text-slate-600">
                        {d.discountType}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-center">
                      <span className="text-sm text-slate-900">
                        {d.discountType === "PERCENTAGE" ? `${d.value}%` : `৳${d.value.toLocaleString()}`}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-center">
                      <button
                        onClick={() => handleToggleActive(d.id, d.active)}
                        className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium transition-colors ${d.active
                          ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          }`}
                      >
                        {d.active ? "Active" : "Hidden"}
                      </button>
                    </td>
                    <td className="px-4 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button 
                          onClick={() => {
                            setEditingDiscount(d);
                            setShowForm(true);
                          }} 
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-indigo-600 bg-indigo-50 border border-indigo-200 rounded-md hover:bg-indigo-100 hover:border-indigo-300 transition-colors"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                          Edit
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
