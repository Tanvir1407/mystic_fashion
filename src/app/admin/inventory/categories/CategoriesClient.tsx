"use client";

import { useState, useTransition } from "react";
import { deleteCategory } from "../catalog-actions";
import { Plus, Trash2, Edit2 } from "lucide-react";
import { AdminPagination } from "@/components/AdminPagination";
import { CategoryForm } from "./CategoryForm";
import { useRouter } from "next/navigation";

export default function CategoriesClient({ categories, currentPage, totalPages }: { categories: any[], currentPage: number, totalPages: number }) {
  const [showForm, setShowForm] = useState(false);
  const [editingCategory, setEditingCategory] = useState<any>(null);
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this category?")) return;

    startTransition(async () => {
      const res = await deleteCategory(id);
      if (!res.success) {
        alert(res.error);
      }
    });
  };

  return (
    <div className="max-w-8xl mx-auto space-y-6">
      <div className="flex items-start sm:items-center justify-between flex-col sm:flex-row gap-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Categories</h1>
          <p className="text-sm text-slate-500 mt-1">Manage your product catalog categories.</p>
        </div>
        <button
          onClick={() => {
            setEditingCategory(null);
            setShowForm(true);
          }}
          className="h-10 px-4 bg-slate-900 text-white text-sm font-bold uppercase tracking-wider rounded-none flex items-center justify-center gap-2 hover:bg-slate-800 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Category
        </button>
      </div>

      <div className="bg-white border border-slate-200 rounded-none overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider w-2/3">Category Name</th>
              <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider w-1/3 text-center">Status</th>
              <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider w-24 text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {categories.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-6 py-8 text-center text-sm text-slate-500">No categories found.</td>
              </tr>
            ) : (
              categories.map((category) => (
                <tr key={category.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 text-sm font-medium text-slate-900">{category.name}</td>
                  <td className="px-6 py-4 text-center">
                    <span className={`inline-flex items-center px-2.5 py-0.5 text-xs font-bold ${category.active ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-50 text-slate-500 border border-slate-200'}`}>
                      {category.active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() => {
                          setEditingCategory(category);
                          setShowForm(true);
                        }}
                        className="text-slate-400 hover:text-indigo-600 transition-colors p-1"
                        title="Edit Category"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(category.id)}
                        disabled={isPending}
                        className="text-slate-400 hover:text-red-600 transition-colors p-1 disabled:opacity-50"
                        title="Delete Category"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        <AdminPagination currentPage={currentPage} totalPages={totalPages} />
      </div>

      {showForm && (
        <CategoryForm
          category={editingCategory}
          onClose={() => {
            setShowForm(false);
            setEditingCategory(null);
          }}
          onSuccess={() => {
            setShowForm(false);
            setEditingCategory(null);
            router.refresh();
          }}
        />
      )}
    </div>
  );
}
