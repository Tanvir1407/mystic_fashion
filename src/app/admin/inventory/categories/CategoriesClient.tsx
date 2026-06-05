"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import {
  deleteCategory,
  restoreCategory,
  updateCategoryDisplay,
} from "../catalog-actions";
import {
  Plus,
  Trash2,
  Edit2,
  RotateCcw,
  ImagePlus,
  RefreshCw,
  Save,
  X,
  Hash,
  Image as ImageIcon,
  GripVertical,
} from "lucide-react";
import { AdminPagination } from "@/components/AdminPagination";
import { CategoryForm } from "./CategoryForm";
import { uploadImage } from "@/app/admin/products/actions";
import { useRouter } from "next/navigation";

// Fallback images when no custom image is uploaded
const FALLBACK_IMAGES: Record<string, string> = {
  Jersey: "/images/jersey_category.png",
  Shoes: "/images/shoes_category.png",
  Perfume: "/images/perfume_category.png",
  "T-shirt": "/images/tshirt_category.png",
  Polo: "/images/polo_category.png",
  Watch: "/images/watch_category.png",
};

export default function CategoriesClient({
  categories,
  currentPage,
  totalPages,
  currentTab = "active",
  canCreate,
  canEdit,
  canDelete,
}: {
  categories: any[];
  currentPage: number;
  totalPages: number;
  currentTab?: string;
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
}) {
  const [showForm, setShowForm] = useState(false);
  const [editingCategory, setEditingCategory] = useState<any>(null);
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleDelete = async (id: string) => {
    if (
      !confirm(
        "Are you sure you want to delete this category? All subcategories will also be soft-deleted. Continue?"
      )
    )
      return;
    startTransition(async () => {
      const res = await deleteCategory(id);
      if (!res.success) {
        alert(res.error);
      } else {
        router.refresh();
      }
    });
  };

  const handleRestore = async (id: string) => {
    startTransition(async () => {
      const res = await restoreCategory(id);
      if (res.success) {
        router.refresh();
      } else {
        alert(res.error);
      }
    });
  };

  // Display edits (image + sortOrder) are handled inside `CategoryForm` modal now.

  // Sort by sortOrder for display
  const sortedCategories = [...categories].sort(
    (a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)
  );

  return (
    <div className="max-w-8xl mx-auto space-y-6">
      <div className="flex items-start sm:items-center justify-between flex-col sm:flex-row gap-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Categories</h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage product categories — set homepage images and display order.
          </p>
        </div>
        {canCreate && currentTab === "active" && (
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
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 gap-6">
        <button
          onClick={() => {
            const params = new URLSearchParams(window.location.search);
            params.set("tab", "active");
            params.set("page", "1");
            router.push(`/admin/inventory/categories?${params.toString()}`);
          }}
          className={`pb-3 text-sm font-bold uppercase tracking-wide border-b-2 transition-all ${
            currentTab === "active"
              ? "border-slate-900 text-slate-900"
              : "border-transparent text-slate-400 hover:text-slate-600"
          }`}
        >
          Active Categories
        </button>
        <button
          onClick={() => {
            const params = new URLSearchParams(window.location.search);
            params.set("tab", "trash");
            params.set("page", "1");
            router.push(`/admin/inventory/categories?${params.toString()}`);
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

      {/* Category Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {sortedCategories.length === 0 ? (
          <div className="col-span-full bg-white border border-slate-200 py-16 text-center text-sm text-slate-500 font-medium">
            No {currentTab === "trash" ? "deleted" : ""} categories found.
          </div>
        ) : (
          sortedCategories.map((category) => {
            const resolvedImage = category.image || FALLBACK_IMAGES[category.name] || null;

            return (
              <div
                key={category.id}
                className={`bg-white border rounded-lg overflow-hidden shadow-sm transition-all border-slate-200 hover:border-slate-300`}
              >
                {/* Card Header - Image Thumbnail */}
                <div className="relative w-full aspect-[3/2] bg-slate-100 overflow-hidden">
                  {resolvedImage ? (
                    <Image
                      src={resolvedImage}
                      alt={category.name}
                      fill
                      unoptimized={true}
                      className="object-cover"
                    />
                  ) : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-slate-300">
                      <ImageIcon className="w-8 h-8" />
                      <span className="text-xs font-medium">No Image</span>
                    </div>
                  )}

                  {/* Sort order badge */}
                  <div className="absolute top-2 left-2 bg-black/60 text-white text-[10px] font-black px-2 py-0.5 rounded flex items-center gap-1">
                    <GripVertical className="w-2.5 h-2.5" />
                    Order: {category.sortOrder ?? 0}
                  </div>

                  {/* Custom image indicator */}
                  {category.image && (
                    <div className="absolute top-2 right-2 bg-emerald-500 text-white text-[9px] font-black px-2 py-0.5 rounded uppercase tracking-wider">
                      Custom Image
                    </div>
                  )}
                </div>

                {/* Card Body */}
                <div className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">
                        {category.name}
                      </h3>
                      <span
                        className={`inline-flex items-center px-2 py-0.5 text-[10px] font-bold mt-1 ${
                          category.active && !category.deletedAt
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : "bg-slate-50 text-slate-500 border border-slate-200"
                        }`}
                      >
                        {category.deletedAt
                          ? "Deleted"
                          : category.active
                          ? "Active"
                          : "Inactive"}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {currentTab === "trash" ? (
                        <button
                          onClick={() => handleRestore(category.id)}
                          disabled={isPending}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-indigo-50 border border-indigo-200 text-indigo-700 hover:bg-indigo-100 text-xs font-bold transition-all disabled:opacity-50 rounded"
                        >
                          <RotateCcw className="w-3 h-3" />
                          Restore
                        </button>
                      ) : (
                        <>
                          {canEdit && (
                            <>
                              <button
                                onClick={() => {
                                  setEditingCategory(category);
                                  setShowForm(true);
                                }}
                                title="Edit Category"
                                className="p-1.5 rounded border bg-slate-50 border-slate-200 text-slate-400 hover:text-indigo-600 hover:border-indigo-300 hover:bg-indigo-50 transition-all"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}
                          {canDelete && (
                            <button
                              onClick={() => handleDelete(category.id)}
                              disabled={isPending}
                              className="p-1.5 rounded border bg-slate-50 border-slate-200 text-slate-400 hover:text-red-600 hover:border-red-200 hover:bg-red-50 transition-all disabled:opacity-50"
                              title="Delete Category"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </div>

                  {/* Display editing moved into modal; no inline panel here anymore */}
                </div>
              </div>
            );
          })
        )}
      </div>

      <AdminPagination currentPage={currentPage} totalPages={totalPages} />

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
