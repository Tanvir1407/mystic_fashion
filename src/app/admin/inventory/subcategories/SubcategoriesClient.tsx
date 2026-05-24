"use client";

import { useState, useTransition } from "react";
import { deleteSubcategory, restoreSubcategory } from "../catalog-actions";
import { Plus, Trash2, Edit2, RotateCcw } from "lucide-react";
import { AdminPagination } from "@/components/AdminPagination";
import { SubcategoryForm } from "./SubcategoryForm";
import { useRouter } from "next/navigation";

export default function SubcategoriesClient({
  subcategories,
  categories,
  currentPage,
  totalPages,
  currentTab = "active",
  canCreate,
  canEdit,
  canDelete
}: {
  subcategories: any[],
  categories: any[],
  currentPage: number,
  totalPages: number,
  currentTab?: string,
  canCreate: boolean,
  canEdit: boolean,
  canDelete: boolean
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
      } else {
        router.refresh();
      }
    });
  };

  const handleRestore = async (id: string) => {
    startTransition(async () => {
      const res = await restoreSubcategory(id);
      if (res.success) {
        router.refresh();
      } else {
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
        {canCreate && currentTab === "active" && (
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
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 gap-6">
        <button
          onClick={() => {
            const params = new URLSearchParams(window.location.search);
            params.set("tab", "active");
            params.set("page", "1");
            router.push(`/admin/inventory/subcategories?${params.toString()}`);
          }}
          className={`pb-3 text-sm font-bold uppercase tracking-wide border-b-2 transition-all ${
            currentTab === "active"
              ? "border-slate-900 text-slate-900"
              : "border-transparent text-slate-400 hover:text-slate-600"
          }`}
        >
          Active Subcategories
        </button>
        <button
          onClick={() => {
            const params = new URLSearchParams(window.location.search);
            params.set("tab", "trash");
            params.set("page", "1");
            router.push(`/admin/inventory/subcategories?${params.toString()}`);
          }}
          className={`pb-3 text-sm font-bold uppercase tracking-wide border-b-2 transition-all ${
            currentTab === "trash"
              ? "border-slate-900 text-slate-900"
              : "border-transparent text-slate-400 hover:text-slate-600"
          }`}
        >
          Trash Bin
        </button>
      </div>

      <div className="bg-white border border-slate-200 rounded-none overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider w-2/5">Subcategory Name</th>
              <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider w-2/5">Parent Category</th>
              <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider w-1/5 text-center">Status</th>
              <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider w-32 text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {subcategories.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-6 py-12 text-center text-sm text-slate-500 font-medium">
                  No {currentTab === "trash" ? "deleted" : ""} subcategories found.
                </td>
              </tr>
            ) : (
              subcategories.map((sc) => (
                <tr key={sc.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 text-sm font-medium text-slate-900">{sc.name}</td>
                  <td className="px-6 py-4 text-sm text-slate-600">{sc.category?.name || "Unknown"}</td>
                  <td className="px-6 py-4 text-center">
                    <span className={`inline-flex items-center px-2.5 py-0.5 text-xs font-bold ${sc.active && !sc.deletedAt ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-50 text-slate-500 border border-slate-200'}`}>
                      {sc.deletedAt ? "Deleted" : sc.active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <div className="flex items-center justify-center gap-2">
                      {currentTab === "trash" ? (
                        <button
                          onClick={() => handleRestore(sc.id)}
                          disabled={isPending}
                          className="inline-flex items-center gap-1 px-3 py-1 bg-indigo-50 border border-indigo-200 text-indigo-700 hover:bg-indigo-100 text-xs font-bold transition-all disabled:opacity-50"
                        >
                          <RotateCcw className="w-3 h-3" />
                          Restore
                        </button>
                      ) : (
                        <>
                          {canEdit && (
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
                          )}
                          {canDelete && (
                            <button
                              onClick={() => handleDelete(sc.id)}
                              disabled={isPending}
                              className="text-slate-400 hover:text-red-600 transition-colors p-1 disabled:opacity-50"
                              title="Delete Subcategory"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </>
                      )}
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
