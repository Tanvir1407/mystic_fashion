"use client";

import { useState } from "react";
import { createSubcategory, deleteSubcategory } from "../catalog-actions";
import { Plus, Trash2 } from "lucide-react";
import { AdminPagination } from "@/components/AdminPagination";

export default function SubcategoriesClient({
  subcategories,
  categories,
  currentPage,
  totalPages
}: {
  subcategories: any[],
  categories: any[],
  currentPage: number,
  totalPages: number
}) {
  const [newSubcategoryName, setNewSubcategoryName] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState("");
  const [loading, setLoading] = useState(false);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubcategoryName.trim() || !selectedCategoryId) return;

    setLoading(true);
    const res = await createSubcategory({
      name: newSubcategoryName,
      categoryId: selectedCategoryId
    });
    setLoading(false);

    if (res.success && res.subcategory) {
      setNewSubcategoryName("");
      // Keep selectedCategoryId selected for rapid entry
    } else {
      alert(res.error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this subcategory?")) return;

    const res = await deleteSubcategory(id);
    if (!res.success) {
      alert(res.error);
    }
  };

  return (
    <div className="max-w-8xl mx-auto space-y-6">
      <div className="flex items-center justify-between border-b border-slate-200 pb-4">
        <h1 className="text-xl font-bold text-slate-900 uppercase tracking-tight">Subcategories</h1>
      </div>

      <div className="bg-white border border-slate-200 rounded-none p-6">
        <h2 className="text-sm font-bold text-slate-800 uppercase mb-4">Add New Subcategory</h2>
        <form onSubmit={handleAdd} className="flex gap-4">
          <select
            value={selectedCategoryId}
            onChange={(e) => setSelectedCategoryId(e.target.value)}
            className="w-1/3 px-4 py-2 border border-slate-300 rounded-none text-sm focus:outline-none focus:border-slate-900 bg-white"
            required
            disabled={loading}
          >
            <option value="">Select Parent Category</option>
            {categories.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          <input
            type="text"
            value={newSubcategoryName}
            onChange={(e) => setNewSubcategoryName(e.target.value)}
            placeholder="Subcategory Name"
            className="flex-1 px-4 py-2 border border-slate-300 rounded-none text-sm focus:outline-none focus:border-slate-900"
            required
            disabled={loading}
          />
          <button
            type="submit"
            disabled={loading}
            className="bg-slate-900 text-white px-6 py-2 rounded-none text-sm font-bold uppercase tracking-wider hover:bg-slate-800 transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add
          </button>
        </form>
      </div>

      <div className="bg-white border border-slate-200 rounded-none overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider w-1/2">Subcategory Name</th>
              <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider w-1/2">Parent Category</th>
              <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider w-24 text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {subcategories.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-6 py-8 text-center text-sm text-slate-500">No subcategories found.</td>
              </tr>
            ) : (
              subcategories.map((sc) => (
                <tr key={sc.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 text-sm font-medium text-slate-900">{sc.name}</td>
                  <td className="px-6 py-4 text-sm text-slate-600">{sc.category?.name || "Unknown"}</td>
                  <td className="px-6 py-4 text-center">
                    <button
                      onClick={() => handleDelete(sc.id)}
                      className="text-slate-400 hover:text-red-600 transition-colors p-1"
                      title="Delete Subcategory"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        <AdminPagination currentPage={currentPage} totalPages={totalPages} />
      </div>
    </div>
  );
}
