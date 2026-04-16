"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import { Plus, Trash2, Save, Eye, EyeOff, X, ImagePlus, Link as LinkIcon, AlignLeft, Hash, LayoutList, RefreshCw } from "lucide-react";
import { createHeroSlide, updateHeroSlide, deleteHeroSlide } from "./actions";
import { uploadImage } from "@/app/admin/actions";

interface Slide {
  id: string;
  image: string;
  link: string;
  label?: string | null;
  sortOrder: number;
  active: boolean;
}

const SPEC_BADGE = (
  <div className="flex items-start gap-2 bg-blue-50 border border-blue-150 rounded-md px-3 py-2.5 mt-1">
    <div className="w-4 h-4 mt-0.5 flex-shrink-0 text-blue-500">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><circle cx="12" cy="12" r="10" /><path d="M12 16v-4M12 8h.01" /></svg>
    </div>
    <div>
      <p className="text-xs font-bold text-blue-700">Recommended: 1920 × 480 px &nbsp;(4:1 ratio)</p>
      <p className="text-[11px] text-blue-500 mt-0.5">Minimum 1280 × 480 px · JPEG or WebP · Wider images crop gracefully on mobile</p>
    </div>
  </div>
);

function FieldRow({ label, icon, children }: { label: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div>
      <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
        <span className="text-slate-400">{icon}</span>
        {label}
      </label>
      {children}
    </div>
  );
}

export default function HeroSlideManager({ initialSlides }: { initialSlides: Slide[] }) {
  const [slides, setSlides] = useState<Slide[]>(initialSlides);
  const [isPending, startTransition] = useTransition();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [uploading, setUploading] = useState<string | null>(null);
  const [showAddPanel, setShowAddPanel] = useState(false);
  const [addingPending, startAddTransition] = useTransition();

  const [newSlide, setNewSlide] = useState({ image: "", link: "/", label: "" });
  const [editData, setEditData] = useState<Partial<Slide>>({});

  const handleImageUpload = async (file: File, target: "new" | string) => {
    setUploading(target);
    const fd = new FormData();
    fd.append("file", file);
    const path = await uploadImage(fd);
    if (target === "new") setNewSlide(s => ({ ...s, image: path }));
    else setEditData(s => ({ ...s, image: path }));
    setUploading(null);
  };

  const handleAdd = () => {
    if (!newSlide.image) return alert("Please upload an image first.");
    startAddTransition(async () => {
      const created = await createHeroSlide({
        image: newSlide.image,
        link: newSlide.link || "/",
        label: newSlide.label || undefined,
        sortOrder: slides.length,
      });
      // Optimistically append the real slide returned from the server
      setSlides(prev => [...prev, created]);
      setNewSlide({ image: "", link: "/", label: "" });
      setShowAddPanel(false);
    });
  };

  const startEdit = (slide: Slide) => {
    setEditingId(slide.id);
    setEditData({ image: slide.image, link: slide.link, label: slide.label || "", sortOrder: slide.sortOrder, active: slide.active });
  };

  const handleSave = (id: string) => {
    startTransition(async () => {
      await updateHeroSlide(id, { ...editData, label: editData.label ?? undefined }); setEditingId(null);
    });
  };

  const handleToggleActive = (slide: Slide) => {
    startTransition(async () => {
      await updateHeroSlide(slide.id, { active: !slide.active });
      setSlides(prev => prev.map(s => s.id === slide.id ? { ...s, active: !s.active } : s));
    });
  };

  const handleDelete = (id: string) => {
    if (!confirm("Delete this slide? This cannot be undone.")) return;
    startTransition(async () => {
      await deleteHeroSlide(id);
      setSlides(prev => prev.filter(s => s.id !== id));
    });
  };

  return (
    <div className="space-y-6">

      {/* Stats bar */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Total Slides", value: slides.length, color: "text-slate-800" },
          { label: "Active", value: slides.filter(s => s.active).length, color: "text-green-600" },
          { label: "Hidden", value: slides.filter(s => !s.active).length, color: "text-slate-400" },
        ].map(stat => (
          <div key={stat.label} className="bg-white border border-slate-200 rounded-lg px-5 py-4 shadow-sm">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{stat.label}</p>
            <p className={`text-2xl font-black mt-1 ${stat.color}`}>{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Slide Table */}
      <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <LayoutList className="w-4 h-4 text-slate-400" />
            <h2 className="text-sm font-semibold text-slate-800">Slide Library</h2>
            <span className="ml-1 bg-slate-100 text-slate-500 text-[11px] font-bold px-2 py-0.5 rounded-full">{slides.length}</span>
          </div>
          <button
            onClick={() => { setShowAddPanel(true); setEditingId(null); }}
            className="flex items-center gap-2 px-3.5 py-2 bg-slate-900 text-white text-xs font-bold rounded-md hover:bg-slate-700 transition-colors shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Slide
          </button>
        </div>

        {slides.length === 0 && !showAddPanel ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-14 h-14 bg-slate-100 rounded-full flex items-center justify-center mb-4">
              <ImagePlus className="w-6 h-6 text-slate-400" />
            </div>
            <p className="text-sm font-semibold text-slate-600 mb-1">No hero slides yet</p>
            <p className="text-xs text-slate-400 max-w-xs">Add your first slide to start showcasing collections on the homepage carousel.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {slides.map((slide, index) => (
              <div key={slide.id}>
                {/* Row */}
                <div className={`flex items-center gap-4 px-6 py-4 hover:bg-slate-50/60 transition-colors ${!slide.active ? "opacity-50" : ""} ${editingId === slide.id ? "bg-indigo-50/40" : ""}`}>
                  {/* Index */}
                  <span className="w-6 text-center text-xs font-mono font-bold text-slate-400 flex-shrink-0">{index + 1}</span>

                  {/* Thumbnail */}
                  <div className="relative w-24 flex-shrink-0" style={{ aspectRatio: "4/1" }}>
                    <div className="relative w-full h-full rounded overflow-hidden border border-slate-200 bg-slate-100">
                      {slide.image && <Image src={slide.image} alt={slide.label || "Slide"} fill className="object-cover" />}
                    </div>
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-800 truncate">{slide.label || <span className="text-slate-400 italic">Untitled Slide</span>}</p>
                    <a href={slide.link} target="_blank" rel="noopener noreferrer" className="text-xs text-indigo-500 hover:underline truncate block font-mono mt-0.5">
                      {slide.link}
                    </a>
                  </div>

                  {/* Sort order */}
                  <div className="hidden sm:flex items-center gap-1 text-xs text-slate-400 font-mono">
                    <Hash className="w-3 h-3" />
                    {slide.sortOrder}
                  </div>

                  {/* Status badge */}
                  <span className={`hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border ${slide.active ? "bg-green-50 text-green-700 border-green-200" : "bg-slate-100 text-slate-500 border-slate-200"}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${slide.active ? "bg-green-500" : "bg-slate-400"}`} />
                    {slide.active ? "Active" : "Hidden"}
                  </span>

                  {/* Actions */}
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      onClick={() => handleToggleActive(slide)}
                      title={slide.active ? "Hide slide" : "Show slide"}
                      className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded transition-colors"
                    >
                      {slide.active ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                    <button
                      onClick={() => editingId === slide.id ? setEditingId(null) : startEdit(slide)}
                      className={`px-3 py-1.5 text-xs font-semibold rounded border transition-colors ${editingId === slide.id ? "bg-indigo-600 text-white border-indigo-600" : "border-slate-200 text-slate-600 hover:bg-slate-50"}`}
                    >
                      {editingId === slide.id ? "Editing" : "Edit"}
                    </button>
                    <button
                      onClick={() => handleDelete(slide.id)}
                      className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Inline Edit Panel */}
                {editingId === slide.id && (
                  <div className="mx-6 mb-5 mt-1 border border-indigo-200 rounded-xl bg-white shadow-sm overflow-hidden">
                    <div className="flex items-center justify-between px-5 py-3 bg-indigo-50 border-b border-indigo-100">
                      <p className="text-xs font-bold text-indigo-700 uppercase tracking-wider">Editing Slide #{index + 1}</p>
                      <button onClick={() => setEditingId(null)} className="p-1 text-indigo-400 hover:text-indigo-700 rounded transition-colors">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="p-5 grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-6">
                      {/* Image */}
                      <div className="space-y-2">
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Slide Image</p>
                        <div className="relative w-full rounded-lg overflow-hidden border border-slate-200 bg-slate-100" style={{ aspectRatio: "4/1" }}>
                          {editData.image
                            ? <Image src={editData.image} alt="Preview" fill className="object-cover" />
                            : <div className="absolute inset-0 flex items-center justify-center text-slate-400 text-xs">No image</div>
                          }
                        </div>
                        {SPEC_BADGE}
                        <label className="flex items-center justify-center gap-2 w-full cursor-pointer text-center px-3 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors bg-white mt-1">
                          {uploading === slide.id ? <><RefreshCw className="w-3.5 h-3.5 animate-spin" /> Uploading...</> : <><ImagePlus className="w-3.5 h-3.5" /> Replace Image</>}
                          <input type="file" accept="image/*" className="hidden" disabled={!!uploading} onChange={e => { const f = e.target.files?.[0]; if (f) handleImageUpload(f, slide.id); }} />
                        </label>
                      </div>

                      {/* Fields */}
                      <div className="space-y-4">
                        <FieldRow label="Link URL" icon={<LinkIcon className="w-3 h-3" />}>
                          <input
                            type="text" value={editData.link || ""} onChange={e => setEditData(s => ({ ...s, link: e.target.value }))}
                            placeholder="/ or https://..."
                            className="w-full text-sm px-3 py-2.5 border border-slate-200 rounded-md focus:outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-200 font-mono"
                          />
                        </FieldRow>
                        <FieldRow label="Label" icon={<AlignLeft className="w-3 h-3" />}>
                          <input
                            type="text" value={editData.label || ""} onChange={e => setEditData(s => ({ ...s, label: e.target.value }))}
                            placeholder="e.g. New Arrivals (optional)"
                            className="w-full text-sm px-3 py-2.5 border border-slate-200 rounded-md focus:outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-200"
                          />
                        </FieldRow>
                        <FieldRow label="Sort Order" icon={<Hash className="w-3 h-3" />}>
                          <input
                            type="number" value={editData.sortOrder ?? 0} onChange={e => setEditData(s => ({ ...s, sortOrder: parseInt(e.target.value) || 0 }))}
                            className="w-24 text-sm px-3 py-2.5 border border-slate-200 rounded-md focus:outline-none focus:border-indigo-400 font-mono"
                          />
                          <p className="text-[11px] text-slate-400 mt-1">Lower numbers appear first in the carousel.</p>
                        </FieldRow>
                        <div className="flex gap-3 pt-2 border-t border-slate-100">
                          <button
                            onClick={() => handleSave(slide.id)} disabled={isPending}
                            className="flex items-center gap-2 px-5 py-2.5 bg-slate-900 text-white text-sm font-semibold rounded-md hover:bg-slate-700 transition disabled:opacity-60 shadow-sm"
                          >
                            <Save className="w-4 h-4" />
                            {isPending ? "Saving..." : "Save Changes"}
                          </button>
                          <button onClick={() => setEditingId(null)} className="px-4 py-2.5 border border-slate-200 text-slate-600 text-sm font-semibold rounded-md hover:bg-slate-50 transition">
                            Cancel
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add New Slide Panel */}
      {showAddPanel && (
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
            <div className="flex items-center gap-2">
              <Plus className="w-4 h-4 text-slate-500" />
              <h3 className="text-sm font-bold text-slate-800">New Hero Slide</h3>
            </div>
            <button onClick={() => { setShowAddPanel(false); setNewSlide({ image: "", link: "/", label: "" }); }} className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="p-6 grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-8">
            {/* Image upload */}
            <div className="space-y-2">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Slide Image</p>
              <div className="relative w-full rounded-lg overflow-hidden border-2 border-dashed border-slate-200 bg-slate-50" style={{ aspectRatio: "4/1" }}>
                {newSlide.image
                  ? <Image src={newSlide.image} alt="Preview" fill className="object-cover rounded-lg" />
                  : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-slate-400">
                      <ImagePlus className="w-6 h-6" />
                      <span className="text-xs font-medium">No image uploaded</span>
                    </div>
                  )}
              </div>
              {SPEC_BADGE}
              <label className="flex items-center justify-center gap-2 w-full cursor-pointer text-center px-3 py-2.5 bg-slate-900 text-white rounded-lg text-xs font-bold hover:bg-slate-700 transition-colors mt-1">
                {uploading === "new" ? <><RefreshCw className="w-3.5 h-3.5 animate-spin" /> Uploading...</> : <><ImagePlus className="w-3.5 h-3.5" /> Upload Image</>}
                <input type="file" accept="image/*" className="hidden" disabled={!!uploading} onChange={e => { const f = e.target.files?.[0]; if (f) handleImageUpload(f, "new"); }} />
              </label>
            </div>

            {/* Fields */}
            <div className="space-y-5">
              <FieldRow label="Link URL" icon={<LinkIcon className="w-3 h-3" />}>
                <input
                  type="text" value={newSlide.link} onChange={e => setNewSlide(s => ({ ...s, link: e.target.value }))}
                  placeholder="/ or https://example.com"
                  className="w-full text-sm px-3 py-2.5 border border-slate-200 rounded-md focus:outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-200 font-mono"
                />
                <p className="text-[11px] text-slate-400 mt-1">Where should this slide take the user when clicked?</p>
              </FieldRow>
              <FieldRow label="Label" icon={<AlignLeft className="w-3 h-3" />}>
                <input
                  type="text" value={newSlide.label} onChange={e => setNewSlide(s => ({ ...s, label: e.target.value }))}
                  placeholder="e.g. Summer Collection (optional)"
                  className="w-full text-sm px-3 py-2.5 border border-slate-200 rounded-md focus:outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-200"
                />
                <p className="text-[11px] text-slate-400 mt-1">Internal identifier only — not shown to customers.</p>
              </FieldRow>

              <div className="pt-4 border-t border-slate-100 flex gap-3">
                <button
                  onClick={handleAdd} disabled={addingPending || uploading === "new"}
                  className="flex items-center gap-2 px-6 py-2.5 bg-slate-900 text-white text-sm font-bold rounded-md hover:bg-slate-700 transition disabled:opacity-60 shadow-sm"
                >
                  <Plus className="w-4 h-4" />
                  {addingPending ? "Adding..." : "Add Slide"}
                </button>
                <button
                  onClick={() => { setShowAddPanel(false); setNewSlide({ image: "", link: "/", label: "" }); }}
                  className="px-4 py-2.5 border border-slate-200 text-slate-600 text-sm font-semibold rounded-md hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
