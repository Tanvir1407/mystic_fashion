"use client";

import { useState, useTransition } from "react";
import { deleteSubcategory } from "../catalog-actions";
import { Plus, Trash2, Edit2 } from "lucide-react";
import { AdminPagination } from "@/components/AdminPagination";
import { SubcategoryForm } from "./SubcategoryForm";
import { useRouter } from "next/navigation";

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
  const [showForm, setShowForm] = useState(false);
  const [editingSubcategory, setEditingSubcategory] = useState<any>(null);
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this subcategory?")) return;

    startTransition(async () => {
      const res = await deleteSubcategory(id);
      if (!res.success) {
        alert(res.error);
      }
    });
  };

  return (
    <div className="max-w-8xl mx-auto space-y-6">
      <div className="flex items-start sm:items-center justify-between flex-col sm:flex-row gap-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Subcategories</h1>
          <p className="text-sm text-slate-500 mt-1">Manage your product catalog subcategories.</p>
        </div>
        <button
          onClick={() => {
            setEditingSubcategory(null);
            setShowForm(true);
          }}
          className="h-10 px-4 bg-slate-900 text-white text-sm font-bold uppercase tracking-wider rounded-none flex items-center justify-center gap-2 hover:bg-slate-800 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Subcategory
        </button>
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
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() => {
                          setEditingSubcategory(sc);
                          setShowForm(true);
                        }}
                        className="text-slate-400 hover:text-indigo-600 transition-colors p-1"
                        title="Edit Subcategory"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(sc.id)}
                        disabled={isPending}
                        className="text-slate-400 hover:text-red-600 transition-colors p-1 disabled:opacity-50"
                        title="Delete Subcategory"
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
        <SubcategoryForm
          subcategory={editingSubcategory}
          categories={categories}
          onClose={() => {
            setShowForm(false);
            setEditingSubcategory(null);
          }}
          onSuccess={() => {
            setShowForm(false);
            setEditingSubcategory(null);
            router.refresh();
          }}
        />
      )}
    </div>
  );
}
