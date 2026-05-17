"use client";

import { useState } from "react";
import { createSubcategory, updateSubcategory } from "../catalog-actions";
import { Loader2, X, Save } from "lucide-react";

interface SubcategoryFormProps {
  subcategory?: any;
  categories: any[];
  onClose: () => void;
  onSuccess: () => void;
}

export function SubcategoryForm({ subcategory, categories, onClose, onSuccess }: SubcategoryFormProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [name, setName] = useState(subcategory?.name || "");
  const [categoryId, setCategoryId] = useState(subcategory?.categoryId || "");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !categoryId) return;
    
    setLoading(true);
    setError("");

    try {
      let res;
      if (subcategory) {
        res = await updateSubcategory(subcategory.id, { name, categoryId });
      } else {
        res = await createSubcategory({ name, categoryId });
      }

      if (res.success) {
        onSuccess();
      } else {
        setError(res.error);
      }
    } catch (err: any) {
      setError(err.message || "An error occurred.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-none w-full max-w-lg overflow-hidden border border-slate-200 animate-in zoom-in-95 duration-200">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div>
            <h2 className="text-xl font-bold text-slate-900">{subcategory ? "Edit Subcategory" : "Create New Subcategory"}</h2>
            <p className="text-xs text-slate-500 font-medium mt-0.5">Manage your product catalog subcategories.</p>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-white transition-all">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="p-4 bg-red-50 border border-red-100 rounded-none text-red-600 text-sm font-bold flex items-center gap-3">
              <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Parent Category</label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full px-4 py-3 bg-white border border-slate-300 rounded-none text-sm focus:outline-none focus:border-slate-900 transition-colors"
                required
                disabled={loading}
              >
                <option value="">Select Parent Category</option>
                {categories.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Subcategory Name</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="E.g. Football Jerseys"
                className="w-full px-4 py-3 bg-white border border-slate-300 rounded-none text-sm focus:outline-none focus:border-slate-900 transition-colors"
              />
            </div>
          </div>

          <div className="pt-4 flex items-center gap-3">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-slate-900 text-white py-4 rounded-none font-bold uppercase tracking-wider text-xs hover:bg-slate-800 transition-colors flex items-center justify-center gap-3 disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  {subcategory ? "Update Subcategory" : "Create Subcategory"}
                </>
              )}
            </button>
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-6 py-4 border border-slate-300 rounded-none font-bold uppercase tracking-wider text-xs hover:bg-slate-50 transition-colors text-slate-600"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
