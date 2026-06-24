"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import { Plus, Trash2, Pencil, Eye, EyeOff, X, ImagePlus, Loader2, ExternalLink, Images } from "lucide-react";
import { createHeroSlide, updateHeroSlide, deleteHeroSlide } from "./actions";
import { uploadImage } from "@/app/admin/products/actions";
import { useToastStore } from "@/store/toastStore";

interface Slide {
  id: string;
  image: string;
  link: string;
  label?: string | null;
  sortOrder: number;
  active: boolean;
}

type ModalMode = "add" | "edit" | null;

const EMPTY_FORM = { image: "", link: "/", label: "", sortOrder: 0 };

// ─── Image spec hint ───────────────────────────────────────────────────────────
function SpecHint() {
  return (
    <p className="text-[11px] text-slate-400 mt-1.5">
      Recommended: <span className="font-medium text-slate-500">1920 × 1080 px</span> · JPEG or WebP · Max 500 KB
    </p>
  );
}

// ─── Slide form modal ──────────────────────────────────────────────────────────
function SlideModal({
  mode,
  slide,
  slideIndex,
  totalSlides,
  onClose,
  onSaved,
}: {
  mode: ModalMode;
  slide?: Slide;
  slideIndex?: number;
  totalSlides: number;
  onClose: () => void;
  onSaved: (slide: Slide) => void;
}) {
  const { showToast } = useToastStore();
  const [form, setForm] = useState({
    image: slide?.image ?? "",
    link: slide?.link ?? "/",
    label: slide?.label ?? "",
    sortOrder: slide?.sortOrder ?? totalSlides,
  });
  const [uploading, setUploading] = useState(false);
  const [pending, startTransition] = useTransition();

  const handleImageUpload = async (file: File) => {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("title", "hero-slide");
      const path = await uploadImage(fd);
      setForm(f => ({ ...f, image: path }));
    } catch (err: any) {
      showToast(err?.message || "Image upload failed.", "error");
    } finally {
      setUploading(false);
    }
  };

  const handleSave = () => {
    if (!form.image) {
      showToast("Please upload an image first.", "error");
      return;
    }
    startTransition(async () => {
      try {
        if (mode === "add") {
          const result: any = await createHeroSlide({
            image: form.image,
            link: form.link || "/",
            label: form.label || undefined,
            sortOrder: form.sortOrder,
          });
          const created: Slide = result?.data ?? result;
          if (!created?.id) throw new Error("Failed to create slide.");
          onSaved(created);
          showToast("Slide added successfully.", "success");
        } else if (mode === "edit" && slide) {
          const result: any = await updateHeroSlide(slide.id, {
            image: form.image,
            link: form.link || "/",
            label: form.label || undefined,
            sortOrder: form.sortOrder,
          });
          if (result?.success === false) throw new Error(result.error || "Update failed.");
          const updated: Slide = result?.data ?? { ...slide, ...form, label: form.label || null };
          onSaved(updated);
          showToast("Slide updated.", "success");
        }
        onClose();
      } catch (err: any) {
        showToast(err?.message || "Something went wrong. Please try again.", "error");
      }
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-slate-900/30 backdrop-blur-[2px]" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div>
            <h2 className="text-sm font-semibold text-slate-800">
              {mode === "add" ? "Add New Slide" : `Edit Slide ${slideIndex !== undefined ? `#${slideIndex + 1}` : ""}`}
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              {mode === "add" ? "Upload an image and configure the slide." : "Update image or slide settings."}
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 p-6 space-y-5">

          {/* Image upload */}
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-2">Slide Image</label>

            {/* Preview */}
            <div className="relative w-full bg-slate-50 border border-slate-200 rounded-xl overflow-hidden" style={{ aspectRatio: "16/9" }}>
              {form.image ? (
                <Image src={form.image} alt="Preview" fill className="object-cover" unoptimized />
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-slate-300">
                  <ImagePlus className="w-8 h-8" />
                  <span className="text-xs text-slate-400">No image uploaded</span>
                </div>
              )}
              {uploading && (
                <div className="absolute inset-0 bg-white/70 flex items-center justify-center">
                  <Loader2 className="w-6 h-6 animate-spin text-slate-500" />
                </div>
              )}
            </div>

            <SpecHint />

            {/* Upload button */}
            <label className={`mt-3 flex items-center justify-center gap-2 w-full cursor-pointer px-4 py-2.5 rounded-lg border text-xs font-medium transition-colors ${
              uploading
                ? "bg-slate-50 border-slate-200 text-slate-400 cursor-not-allowed"
                : form.image
                  ? "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                  : "bg-[#800020] border-[#800020] text-white hover:bg-[#6a001a]"
            }`}>
              {uploading ? (
                <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Uploading...</>
              ) : form.image ? (
                <><ImagePlus className="w-3.5 h-3.5" /> Replace Image</>
              ) : (
                <><ImagePlus className="w-3.5 h-3.5" /> Upload Image</>
              )}
              <input type="file" accept="image/*" className="hidden" disabled={uploading} onChange={e => { const f = e.target.files?.[0]; if (f) handleImageUpload(f); e.target.value = ""; }} />
            </label>
          </div>

          {/* Divider */}
          <div className="border-t border-slate-100" />

          {/* Fields */}
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">Link URL</label>
              <input
                type="text"
                value={form.link}
                onChange={e => setForm(f => ({ ...f, link: e.target.value }))}
                placeholder="/shop or https://..."
                className="w-full text-sm px-3 py-2.5 border border-slate-200 rounded-lg bg-white focus:outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100 font-mono transition-shadow"
              />
              <p className="text-[11px] text-slate-400 mt-1">Where the user lands when they click this slide.</p>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">Label <span className="text-slate-400 font-normal">(optional)</span></label>
              <input
                type="text"
                value={form.label}
                onChange={e => setForm(f => ({ ...f, label: e.target.value }))}
                placeholder="e.g. Summer Collection"
                className="w-full text-sm px-3 py-2.5 border border-slate-200 rounded-lg bg-white focus:outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100 transition-shadow"
              />
              <p className="text-[11px] text-slate-400 mt-1">Internal label for identification — not shown to customers.</p>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">Display Order</label>
              <input
                type="number"
                value={form.sortOrder}
                onChange={e => setForm(f => ({ ...f, sortOrder: parseInt(e.target.value) || 0 }))}
                className="w-28 text-sm px-3 py-2.5 border border-slate-200 rounded-lg bg-white focus:outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100 font-mono transition-shadow"
              />
              <p className="text-[11px] text-slate-400 mt-1">Lower number = appears first in the carousel.</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-end gap-3 bg-slate-50/50">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 border border-slate-200 rounded-lg hover:bg-white transition-colors">
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={pending || uploading}
            className="flex items-center gap-2 px-5 py-2 bg-slate-900 text-white text-sm font-medium rounded-lg hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {pending ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            {pending ? "Saving..." : mode === "add" ? "Add Slide" : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Delete confirm inline ────────────────────────────────────────────────────
function DeleteConfirm({ onConfirm, onCancel }: { onConfirm: () => void; onCancel: () => void }) {
  return (
    <div className="flex items-center gap-2 px-3 py-1.5 bg-rose-50 border border-rose-200 rounded-lg">
      <span className="text-xs text-rose-700 font-medium">Delete this slide?</span>
      <button onClick={onConfirm} className="text-xs font-semibold text-rose-600 hover:text-rose-800 transition-colors">Yes</button>
      <span className="text-rose-300">·</span>
      <button onClick={onCancel} className="text-xs font-medium text-slate-500 hover:text-slate-700 transition-colors">Cancel</button>
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────
export default function HeroSlideManager({ initialSlides }: { initialSlides: Slide[] }) {
  const [slides, setSlides] = useState<Slide[]>(initialSlides);
  const [modal, setModal] = useState<{ mode: ModalMode; slide?: Slide; index?: number }>({ mode: null });
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const { showToast } = useToastStore();

  const openAdd = () => setModal({ mode: "add" });
  const openEdit = (slide: Slide, index: number) => setModal({ mode: "edit", slide, index });
  const closeModal = () => setModal({ mode: null });

  const handleSaved = (saved: Slide) => {
    setSlides(prev => {
      const exists = prev.find(s => s.id === saved.id);
      return exists ? prev.map(s => s.id === saved.id ? saved : s) : [...prev, saved];
    });
  };

  const handleToggleActive = (slide: Slide) => {
    startTransition(async () => {
      await updateHeroSlide(slide.id, { active: !slide.active });
      setSlides(prev => prev.map(s => s.id === slide.id ? { ...s, active: !s.active } : s));
    });
  };

  const handleDelete = (id: string) => {
    startTransition(async () => {
      await deleteHeroSlide(id);
      setSlides(prev => prev.filter(s => s.id !== id));
      setDeleteConfirmId(null);
      showToast("Slide deleted.", "success");
    });
  };

  return (
    <>
      {/* Modal */}
      {modal.mode && (
        <SlideModal
          mode={modal.mode}
          slide={modal.slide}
          slideIndex={modal.index}
          totalSlides={slides.length}
          onClose={closeModal}
          onSaved={handleSaved}
        />
      )}

      <div className="space-y-5">

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "Total Slides", value: slides.length },
            { label: "Active", value: slides.filter(s => s.active).length, green: true },
            { label: "Hidden", value: slides.filter(s => !s.active).length, muted: true },
          ].map(stat => (
            <div key={stat.label} className="bg-white border border-slate-200 rounded-xl px-5 py-4">
              <p className="text-xs text-slate-400 font-medium">{stat.label}</p>
              <p className={`text-2xl font-semibold mt-1 ${stat.green ? "text-emerald-600" : stat.muted ? "text-slate-400" : "text-slate-800"}`}>
                {stat.value}
              </p>
            </div>
          ))}
        </div>

        {/* Slide list */}
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">

          {/* Table header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 bg-slate-100 rounded-lg flex items-center justify-center">
                <Images className="w-3.5 h-3.5 text-slate-500" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-800">Slides</p>
                <p className="text-xs text-slate-400">{slides.length} total</p>
              </div>
            </div>
            <button
              onClick={openAdd}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-900 text-white text-xs font-medium rounded-lg hover:bg-slate-700 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Slide
            </button>
          </div>

          {/* Empty state */}
          {slides.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center mb-4">
                <ImagePlus className="w-5 h-5 text-slate-400" />
              </div>
              <p className="text-sm font-medium text-slate-700">No slides yet</p>
              <p className="text-xs text-slate-400 mt-1 max-w-xs">Add your first hero slide to display on the homepage carousel.</p>
              <button onClick={openAdd} className="mt-5 flex items-center gap-1.5 px-4 py-2 bg-slate-900 text-white text-xs font-medium rounded-lg hover:bg-slate-700 transition-colors">
                <Plus className="w-3.5 h-3.5" /> Add First Slide
              </button>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {slides.map((slide, index) => (
                <div key={slide.id} className={`flex items-center gap-4 px-6 py-4 transition-colors ${!slide.active ? "bg-slate-50/60" : "hover:bg-slate-50/40"}`}>

                  {/* Order number */}
                  <span className="w-5 text-xs font-mono text-slate-300 shrink-0 text-center">{index + 1}</span>

                  {/* Thumbnail */}
                  <div className="relative w-[88px] shrink-0 rounded-lg overflow-hidden border border-slate-200 bg-slate-100" style={{ aspectRatio: "16/9" }}>
                    {slide.image && <Image src={slide.image} alt={slide.label || "Slide"} fill className="object-cover" unoptimized />}
                    {!slide.active && (
                      <div className="absolute inset-0 bg-white/50" />
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium truncate ${slide.active ? "text-slate-800" : "text-slate-400"}`}>
                      {slide.label || <span className="italic text-slate-300">Untitled</span>}
                    </p>
                    <a
                      href={slide.link} target="_blank" rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-slate-600 font-mono mt-0.5 truncate max-w-[200px] transition-colors"
                    >
                      {slide.link}
                      <ExternalLink className="w-2.5 h-2.5 shrink-0" />
                    </a>
                  </div>

                  {/* Status badge */}
                  <span className={`hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium border shrink-0 ${
                    slide.active
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                      : "bg-slate-100 text-slate-400 border-slate-200"
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${slide.active ? "bg-emerald-500" : "bg-slate-300"}`} />
                    {slide.active ? "Active" : "Hidden"}
                  </span>

                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    {deleteConfirmId === slide.id ? (
                      <DeleteConfirm onConfirm={() => handleDelete(slide.id)} onCancel={() => setDeleteConfirmId(null)} />
                    ) : (
                      <>
                        <button
                          onClick={() => handleToggleActive(slide)}
                          title={slide.active ? "Hide slide" : "Show slide"}
                          className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                        >
                          {slide.active ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                        <button
                          onClick={() => openEdit(slide, index)}
                          className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setDeleteConfirmId(slide.id)}
                          className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
