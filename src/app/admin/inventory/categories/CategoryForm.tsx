"use client";

import { useState } from "react";
import { createCategory, updateCategory } from "../catalog-actions";
import { Loader2, X, Save, ImagePlus, RefreshCw } from "lucide-react";
import Image from "next/image";
import { uploadImage } from "@/app/admin/products/actions";

interface CategoryFormProps {
  category?: any;
  onClose: () => void;
  onSuccess: () => void;
}

export function CategoryForm({ category, onClose, onSuccess }: CategoryFormProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [name, setName] = useState(category?.name || "");
  const [active, setActive] = useState(category ? category.active : true);
  const [image, setImage] = useState<string | null | undefined>(category?.image ?? null);
  const [sortOrder, setSortOrder] = useState<number>(category?.sortOrder ?? 0);
  const [uploading, setUploading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    
    setLoading(true);
    setError("");

    try {
      let res;
      if (category) {
        res = await updateCategory(category.id, { name, active, image: image ?? null, sortOrder });
      } else {
        res = await createCategory({ name, active });
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

  const handleImageUpload = async (file: File) => {
    setUploading(true);
    const fd = new FormData();
    fd.append("file", file);
    try {
      const path = await uploadImage(fd);
      setImage(path);
    } catch (e) {
      alert("Image upload failed.");
    }
    setUploading(false);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-none w-full max-w-4xl overflow-hidden border border-slate-200 animate-in zoom-in-95 duration-200">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div>
            <h2 className="text-xl font-bold text-slate-900">{category ? "Edit Category" : "Create New Category"}</h2>
            <p className="text-xs text-slate-500 font-medium mt-0.5">Manage your product catalog categories.</p>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-white transition-all">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          {error && (
            <div className="p-4 bg-red-50 border border-red-100 rounded-none text-red-600 text-sm font-bold flex items-center gap-3">
              <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2 block">Homepage Image</label>
              <div className="relative w-full aspect-[3/4] bg-slate-100 rounded overflow-hidden border border-slate-200 mb-3">
                {image ? (
                  <>
                    <Image src={image} alt="Preview" fill unoptimized className="object-cover" />
                    <button
                      type="button"
                      onClick={() => setImage(null)}
                      className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors shadow"
                      title="Remove image"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </>
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 text-slate-400">
                    <ImagePlus className="w-6 h-6" />
                    <span className="text-sm text-slate-400">No image — fallback will be used</span>
                  </div>
                )}
              </div>
              <label className="flex items-center gap-2 w-full cursor-pointer text-center px-3 py-2 border border-slate-300 rounded text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors bg-white">
                {uploading ? (
                  <>
                    <RefreshCw className="w-3 h-3 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <ImagePlus className="w-3 h-3" />
                    {image ? "Replace Image" : "Upload Image"}
                  </>
                )}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  disabled={uploading}
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleImageUpload(f);
                  }}
                />
              </label>
            </div>

            <div className="lg:col-span-2 flex flex-col justify-between">
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Category Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="E.g. Jerseys"
                  className="w-full px-4 py-3 bg-white border border-slate-300 rounded-none text-sm focus:outline-none focus:border-slate-900 transition-colors mb-4"
                />

                <div className="grid grid-cols-1 gap-4 items-start">
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 block">Display Order</label>
                    <input
                      type="number"
                      min={0}
                      value={sortOrder}
                      onChange={(e) => setSortOrder(parseInt(e.target.value) || 0)}
                      className="w-36 text-sm px-3 py-2 border border-slate-200 rounded focus:outline-none focus:border-indigo-400 font-mono"
                    />
                    <p className="text-[11px] text-slate-400 mt-2">Lower number = appears first on the homepage.</p>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 block"></label>
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => setActive(!active)}
                        className={`relative inline-flex h-7 w-12 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                          active ? "bg-slate-900" : "bg-slate-200"
                        }`}
                      >
                        <span
                          className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                            active ? "translate-x-5" : "translate-x-0"
                          }`}
                        />
                      </button>
                      <div>
                        <div className="text-sm font-bold text-slate-700">{active ? "Active" : "Inactive"}</div>
                        <div className="text-xs text-slate-500">Inactive categories hidden from storefront navigation.</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6 lg:mt-8 flex items-center gap-3">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-slate-900 text-white py-3 rounded-none font-bold uppercase tracking-wider text-sm hover:bg-slate-800 transition-colors flex items-center justify-center gap-3 disabled:opacity-50"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      {category ? "Update Category" : "Create Category"}
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  disabled={loading}
                  className="px-6 py-3 border border-slate-300 rounded-none font-bold uppercase tracking-wider text-sm hover:bg-slate-50 transition-colors text-slate-600"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
