"use client";

import { useState } from "react";
import { createCategory, deleteCategory } from "../catalog-actions";
import { Plus, Trash2 } from "lucide-react";
import { AdminPagination } from "@/components/AdminPagination";

export default function CategoriesClient({ categories, currentPage, totalPages }: { categories: any[], currentPage: number, totalPages: number }) {
  const [newCategoryName, setNewCategoryName] = useState("");
  const [loading, setLoading] = useState(false);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoryName.trim()) return;

    setLoading(true);
    const res = await createCategory({ name: newCategoryName });
    setLoading(false);

    if (res.success && res.category) {
      setNewCategoryName("");
    } else {
      alert(res.error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this category?")) return;
    
    const res = await deleteCategory(id);
    if (!res.success) {
      alert(res.error);
    }
  };

  return (
    <div className="max-w-8xl mx-auto space-y-6">
      <div className="flex items-center justify-between border-b border-slate-200 pb-4">
        <h1 className="text-xl font-bold text-slate-900 uppercase tracking-tight">Categories</h1>
      </div>

      <div className="bg-white border border-slate-200 rounded-none p-6">
        <h2 className="text-sm font-bold text-slate-800 uppercase mb-4">Add New Category</h2>
        <form onSubmit={handleAdd} className="flex gap-4">
          <input
            type="text"
            value={newCategoryName}
            onChange={(e) => setNewCategoryName(e.target.value)}
            placeholder="Category Name"
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
              <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider w-full">Category Name</th>
              <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider w-24 text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {categories.length === 0 ? (
              <tr>
                <td colSpan={2} className="px-6 py-8 text-center text-sm text-slate-500">No categories found.</td>
              </tr>
            ) : (
              categories.map((category) => (
                <tr key={category.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 text-sm font-medium text-slate-900">{category.name}</td>
                  <td className="px-6 py-4 text-center">
                    <button
                      onClick={() => handleDelete(category.id)}
                      className="text-slate-400 hover:text-red-600 transition-colors p-1"
                      title="Delete Category"
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
