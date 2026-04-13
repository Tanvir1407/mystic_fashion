"use client";

import { useState, useTransition } from "react";
import { Plus, Tag, Percent, Edit2, Check, X } from "lucide-react";
import { createDiscount, updateDiscount, deleteDiscount } from "./actions";
import { DeleteWarningModal } from "@/components/DeleteWarningModal";

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
  const [showAdd, setShowAdd] = useState(false);

  // New Discount Form State
  const [newName, setNewName] = useState("");
  const [newType, setNewType] = useState<"FLAT" | "PERCENTAGE">("PERCENTAGE");
  const [newValue, setNewValue] = useState("");

  // Edit State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editType, setEditType] = useState<"FLAT" | "PERCENTAGE">("PERCENTAGE");
  const [editValue, setEditValue] = useState("");

  const handleAdd = () => {
    if (!newName.trim() || !newValue) return;
    const valueNum = parseFloat(newValue);
    if (isNaN(valueNum) || valueNum <= 0) return alert("Please enter a valid discount amount.");

    startTransition(async () => {
      const created = await createDiscount({ name: newName, discountType: newType, value: valueNum });
      setDiscounts(prev => [created, ...prev]);
      setShowAdd(false);
      setNewName("");
      setNewValue("");
      setNewType("PERCENTAGE");
    });
  };

  const handleToggleActive = (id: string, currentActive: boolean) => {
    startTransition(async () => {
      await updateDiscount(id, { active: !currentActive });
      setDiscounts(prev => prev.map(d => d.id === id ? { ...d, active: !currentActive } : d));
    });
  };

  const startEdit = (d: Discount) => {
    setEditingId(d.id);
    setEditName(d.name);
    setEditType(d.discountType);
    setEditValue(d.value.toString());
  };

  const handleSaveEdit = (id: string) => {
    const valueNum = parseFloat(editValue);
    if (isNaN(valueNum) || valueNum <= 0) return alert("Please enter a valid discount amount.");

    startTransition(async () => {
      const updated = await updateDiscount(id, { name: editName, discountType: editType, value: valueNum });
      setDiscounts(prev => prev.map(d => d.id === id ? updated : d));
      setEditingId(null);
    });
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-lg px-5 py-4 shadow-sm">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Rules</p>
          <p className="text-2xl font-black mt-1 text-slate-800">{discounts.length}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-lg px-5 py-4 shadow-sm">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Active</p>
          <p className="text-2xl font-black mt-1 text-green-600">{discounts.filter(d => d.active).length}</p>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        {/* Header toolbar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50">
          <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
            <Tag className="w-4 h-4 text-indigo-500" /> Discount Rules List
          </h2>
          <button
            onClick={() => setShowAdd(!showAdd)}
            className="flex items-center gap-2 px-3.5 py-1.5 bg-slate-900 text-white text-xs font-bold rounded-md hover:bg-slate-700 transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Add Discount
          </button>
        </div>

        {/* Add Row */}
        {showAdd && (
          <div className="px-6 py-4 bg-indigo-50/50 border-b border-indigo-100 flex items-end gap-4">
            <div className="flex-1 space-y-1.5">
              <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Rule Name / Code</label>
              <input type="text" value={newName} onChange={e => setNewName(e.target.value)} placeholder="e.g. SUMMER25" className="w-full text-sm px-3 py-2 border border-indigo-200 rounded-md focus:border-indigo-400 focus:ring-1 focus:ring-indigo-300" />
            </div>
            <div className="w-32 space-y-1.5">
              <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Type</label>
              <select value={newType} onChange={e => setNewType(e.target.value as any)} className="w-full text-sm px-3 py-2 border border-indigo-200 rounded-md focus:border-indigo-400 bg-white">
                <option value="PERCENTAGE">Percentage</option>
                <option value="FLAT">Flat</option>
              </select>
            </div>
            <div className="w-32 space-y-1.5">
              <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Amount</label>
              <input type="number" value={newValue} onChange={e => setNewValue(e.target.value)} placeholder="0" className="w-full text-sm px-3 py-2 border border-indigo-200 rounded-md focus:border-indigo-400 font-mono" />
            </div>
            <div className="flex gap-2 pb-0.5">
              <button disabled={isPending} onClick={handleAdd} className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-md hover:bg-indigo-700 transition shadow-sm">
                <Check className="w-4 h-4" /> Save
              </button>
              <button onClick={() => setShowAdd(false)} className="px-3 py-2 border border-slate-300 bg-white text-slate-600 rounded-md hover:bg-slate-50 transition text-sm font-medium">Cancel</button>
            </div>
          </div>
        )}

        {/* The List Data */}
        {discounts.length === 0 ? (
          <div className="p-12 text-center text-slate-400 font-medium text-sm">
            No discounts configured yet.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {discounts.map(d => (
              <div key={d.id} className={`flex items-center px-6 py-4 hover:bg-slate-50 transition-colors ${!d.active ? "opacity-50" : ""}`}>

                {editingId === d.id ? (
                  /* Edit Row */
                  <div className="w-full flex items-end gap-4 p-2 bg-slate-50 border border-slate-200 rounded-lg">
                    <div className="flex-1 space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Name</label>
                      <input type="text" value={editName} onChange={e => setEditName(e.target.value)} className="w-full text-sm px-2.5 py-1.5 border border-slate-300 rounded focus:border-indigo-500" />
                    </div>
                    <div className="w-28 space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Type</label>
                      <select value={editType} onChange={e => setEditType(e.target.value as any)} className="w-full text-sm px-2.5 py-1.5 border border-slate-300 rounded focus:border-indigo-500 bg-white">
                        <option value="PERCENTAGE">Percentage</option>
                        <option value="FLAT">Flat</option>
                      </select>
                    </div>
                    <div className="w-24 space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Value</label>
                      <input type="number" value={editValue} onChange={e => setEditValue(e.target.value)} className="w-full text-sm px-2.5 py-1.5 border border-slate-300 rounded focus:border-indigo-500 font-mono" />
                    </div>
                    <div className="flex gap-1.5 pb-px">
                      <button disabled={isPending} onClick={() => handleSaveEdit(d.id)} className="p-1.5 bg-indigo-600 text-white rounded hover:bg-indigo-700 transition">
                        <Check className="w-4 h-4" />
                      </button>
                      <button onClick={() => setEditingId(null)} className="p-1.5 bg-white border border-slate-300 text-slate-600 rounded hover:bg-slate-50 transition">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Display Row */
                  <>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-bold text-slate-800">{d.name}</h3>
                        {d.discountType === "PERCENTAGE" ? (
                          <span className="inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-50 border border-cyan-100 text-cyan-700">
                            Percentage
                          </span>
                        ) : (
                          <span className="inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-100 text-emerald-700">
                            Flat
                          </span>
                        )}
                      </div>
                      <p className="text-sm font-mono font-medium text-slate-500 mt-1">
                        {d.discountType === "PERCENTAGE" ? `${d.value}% OFF` : `৳${d.value.toLocaleString("en-IN")} OFF`}
                      </p>
                    </div>

                    <div className="flex items-center gap-3 flex-shrink-0">
                      {/* Active Toggle Switch */}
                      <div className="flex items-center gap-2 mr-2 border-r border-slate-200 pr-4">
                        <span className="text-xs font-semibold text-slate-400">{d.active ? 'Active' : 'Hidden'}</span>
                        <button
                          disabled={isPending}
                          onClick={() => handleToggleActive(d.id, d.active)}
                          className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${d.active ? 'bg-green-500' : 'bg-slate-300'}`}
                        >
                          <span className={`${d.active ? 'translate-x-4' : 'translate-x-0'} pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out`} />
                        </button>
                      </div>

                      <button onClick={() => startEdit(d)} className="p-1.5 text-slate-400 hover:bg-slate-100 hover:text-indigo-600 rounded transition-colors">
                        <Edit2 className="w-4 h-4" />
                      </button>

                      <DeleteWarningModal
                        title={`Delete rule "${d.name}"?`}
                        description="This will permanently delete this discount. Future checkouts will no longer be able to use it."
                        impacts={[]}
                        onConfirm={async () => {
                          startTransition(async () => {
                            await deleteDiscount(d.id);
                            setDiscounts(prev => prev.filter(item => item.id !== d.id));
                          });
                        }}
                      />
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
