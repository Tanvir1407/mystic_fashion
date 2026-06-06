"use client";

import { useState, useEffect } from "react";
import { Plus, Edit, Trash2, Save, X, Settings, Loader2, Check } from "lucide-react";
import { useRouter } from "next/navigation";
import { AdminPagination } from "@/components/AdminPagination";
import {
  createAttribute,
  updateAttribute,
  deleteAttribute,
  updateCategoryMappings
} from "../attributes-actions";

interface Attribute {
  id: string;
  code: string;
  name: string;
  type: string;
  description: string | null;
  presets?: any;
}

interface Mapping {
  id: string;
  categoryId: string;
  attributeId: string;
  sortOrder: number;
  attribute: Attribute;
}

interface Category {
  id: string;
  name: string;
}

export default function AttributesClient({
  categories,
  attributes: initialAttributes,
  allAttributes: initialAllAttributes = [],
  mappings: initialMappings,
  currentPage,
  totalPages,
  canCreate,
  canEdit,
  canDelete
}: {
  categories: Category[];
  attributes: Attribute[];
  allAttributes?: Attribute[];
  mappings: Mapping[];
  currentPage: number;
  totalPages: number;
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
}) {
  const router = useRouter();
  const [attributes, setAttributes] = useState<Attribute[]>(initialAttributes);
  const [allAttributes, setAllAttributes] = useState<Attribute[]>(initialAllAttributes);
  const [mappings, setMappings] = useState<Mapping[]>(initialMappings);

  // Modal display states
  const [isAttributeModalOpen, setIsAttributeModalOpen] = useState(false);
  const [isMappingModalOpen, setIsMappingModalOpen] = useState(false);

  // Form State for creating/editing attributes
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [description, setDescription] = useState("");
  const [presetsInput, setPresetsInput] = useState("");
  const [loading, setLoading] = useState(false);

  // Category mapping state
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>(categories[0]?.id || "");
  const [mappingLoading, setMappingLoading] = useState(false);

  // Get active attribute IDs mapped to selected category
  const activeMappedAttributeIds = mappings
    .filter(m => m.categoryId === selectedCategoryId)
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map(m => m.attributeId);

  const [selectedMappingIds, setSelectedMappingIds] = useState<string[]>(activeMappedAttributeIds);

  // Sync state when props change
  useEffect(() => {
    setAttributes(initialAttributes);
  }, [initialAttributes]);

  useEffect(() => {
    setAllAttributes(initialAllAttributes);
  }, [initialAllAttributes]);

  useEffect(() => {
    setMappings(initialMappings);
  }, [initialMappings]);

  // Sync state when category changes
  const handleCategoryChange = (catId: string) => {
    setSelectedCategoryId(catId);
    const activeIds = mappings
      .filter(m => m.categoryId === catId)
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map(m => m.attributeId);
    setSelectedMappingIds(activeIds);
  };

  const handleSaveAttribute = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !code.trim()) return alert("Name and Code are required.");
    setLoading(true);

    const presets = presetsInput
      .split(",")
      .map((p) => p.trim())
      .filter(Boolean);

    try {
      if (editingId) {
        // Edit Mode
        const res = await updateAttribute(editingId, {
          name: name.trim(),
          code: code.trim().toLowerCase(),
          type: "TEXT",
          description: description.trim() || null,
          presets
        });

        if (res.success && res.attribute) {
          const updatedAttr = res.attribute as Attribute;
          setAttributes(attributes.map(a => a.id === editingId ? updatedAttr : a));
          setAllAttributes(allAttributes.map(a => a.id === editingId ? updatedAttr : a));
          setEditingId(null);
          setName("");
          setCode("");
          setDescription("");
          setPresetsInput("");
          setIsAttributeModalOpen(false);
          alert("Attribute updated successfully!");
        } else {
          alert(res.error || "Failed to update attribute.");
        }
      } else {
        // Create Mode
        const res = await createAttribute({
          name: name.trim(),
          code: code.trim().toLowerCase(),
          type: "TEXT",
          description: description.trim() || null,
          presets
        });

        if (res.success && res.attribute) {
          const newAttr = res.attribute as Attribute;
          setAttributes([newAttr, ...attributes]);
          setAllAttributes([newAttr, ...allAttributes]);
          setName("");
          setCode("");
          setDescription("");
          setPresetsInput("");
          setIsAttributeModalOpen(false);
          alert("Attribute created successfully!");
        } else {
          alert(res.error || "Failed to create attribute.");
        }
      }
      router.refresh();
    } catch (err: any) {
      alert(err.message || "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  const handleEditClick = (attr: Attribute) => {
    setEditingId(attr.id);
    setName(attr.name);
    setCode(attr.code);
    setDescription(attr.description || "");
    const presetsList = Array.isArray(attr.presets)
      ? attr.presets
      : typeof attr.presets === "string"
      ? JSON.parse(attr.presets || "[]")
      : [];
    setPresetsInput(presetsList.join(", "));
    setIsAttributeModalOpen(true);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setName("");
    setCode("");
    setDescription("");
    setPresetsInput("");
  };

  const handleDeleteAttribute = async (id: string) => {
    if (!confirm("Are you sure you want to delete this attribute? Existing category mappings will be removed.")) return;
    try {
      const res = await deleteAttribute(id);
      if (res.success) {
        setAttributes(attributes.filter(a => a.id !== id));
        setAllAttributes(allAttributes.filter(a => a.id !== id));
        setMappings(mappings.filter(m => m.attributeId !== id));
        setSelectedMappingIds(selectedMappingIds.filter(mid => mid !== id));
        alert("Attribute deleted successfully!");
        router.refresh();
      } else {
        alert(res.error || "Failed to delete attribute.");
      }
    } catch (err: any) {
      alert(err.message || "An unexpected error occurred.");
    }
  };

  const handleToggleMappingCheckbox = (attrId: string) => {
    if (selectedMappingIds.includes(attrId)) {
      setSelectedMappingIds(selectedMappingIds.filter(id => id !== attrId));
    } else {
      if (selectedMappingIds.length >= 2) {
        alert("You can select a maximum of 2 attributes per category.");
        return;
      }
      setSelectedMappingIds([...selectedMappingIds, attrId]);
    }
  };

  const handleSaveCategoryMapping = async () => {
    if (!selectedCategoryId) return alert("Select a category first.");
    setMappingLoading(true);

    try {
      const res = await updateCategoryMappings(selectedCategoryId, selectedMappingIds);
      if (res.success && res.mappings) {
        // Remove old mappings for this category and insert new ones
        const otherMappings = mappings.filter(m => m.categoryId !== selectedCategoryId);
        const newMappedObjs = (res.mappings as any[]).map(m => ({
          id: m.id,
          categoryId: m.categoryId,
          attributeId: m.attributeId,
          sortOrder: m.sortOrder,
          attribute: allAttributes.find(a => a.id === m.attributeId) as Attribute
        }));

        setMappings([...otherMappings, ...newMappedObjs]);
        alert("Category attribute mapping updated successfully!");
        router.refresh();
      } else {
        alert(res.error || "Failed to save mappings.");
      }
    } catch (err: any) {
      alert(err.message || "An unexpected error occurred.");
    } finally {
      setMappingLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 w-full pb-12 px-4 max-w-[1600px] mx-auto animate-fade-in">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
            Attribute Registry & Category Mapping
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Configure custom product variant parameters (RAM, Storage, Volume, etc.) and assign them to categories safely.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              setSelectedCategoryId(categories[0]?.id || "");
              const activeIds = mappings
                .filter(m => m.categoryId === (categories[0]?.id || ""))
                .sort((a, b) => a.sortOrder - b.sortOrder)
                .map(m => m.attributeId);
              setSelectedMappingIds(activeIds);
              setIsMappingModalOpen(true);
            }}
            className="px-4 py-2 border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-colors"
          >
            <Settings className="w-3.5 h-3.5" />
            Category Mapping
          </button>

          {canCreate && (
            <button
              onClick={() => {
                handleCancelEdit();
                setIsAttributeModalOpen(true);
              }}
              className="px-4 py-2 bg-slate-900 text-white hover:bg-slate-800 text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Attribute
            </button>
          )}
        </div>
      </div>

      {/* List of Registered Attributes */}
      <div className="bg-white border border-slate-200 rounded-none p-6 shadow-none">
        <h2 className="text-xs font-bold text-slate-900 uppercase tracking-widest border-b border-slate-100 pb-3 mb-4">
          Registered Attributes ({attributes.length})
        </h2>

        <div className="overflow-x-auto border border-slate-200">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-4 py-3 font-semibold text-slate-600">Name</th>
                <th className="px-4 py-3 font-semibold text-slate-600">Code</th>
                <th className="px-4 py-3 font-semibold text-slate-600">Presets</th>
                <th className="px-4 py-3 font-semibold text-slate-600">Description</th>
                <th className="px-4 py-3 font-semibold text-slate-600 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {attributes.map((attr) => (
                <tr key={attr.id} className="hover:bg-slate-50/50">
                  <td className="px-4 py-3 font-bold text-slate-900">{attr.name}</td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-500">{attr.code}</td>
                  <td className="px-4 py-3 text-xs">
                    <div className="flex flex-wrap gap-1 max-w-[400px]">
                      {(Array.isArray(attr.presets) ? attr.presets : []).map((p: string) => (
                        <span key={p} className="bg-slate-100 text-slate-800 text-[10px] px-1.5 py-0.5 font-semibold">
                          {p}
                        </span>
                      ))}
                      {(Array.isArray(attr.presets) ? attr.presets : []).length === 0 && (
                        <span className="text-slate-400 italic text-[10px]">None</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500 truncate max-w-[250px]" title={attr.description || ""}>
                    {attr.description || "N/A"}
                  </td>
                  <td className="px-4 py-3 text-right flex justify-end gap-2">
                    {canEdit && (
                      <button
                        onClick={() => handleEditClick(attr)}
                        className="p-1 text-slate-400 hover:text-slate-950 transition-colors"
                        title="Edit Attribute"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                    )}
                    {canDelete && (
                      <button
                        onClick={() => handleDeleteAttribute(attr.id)}
                        className="p-1 text-slate-400 hover:text-red-600 transition-colors"
                        title="Delete Attribute"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {attributes.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-slate-400 italic">
                    No registered attributes found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination component */}
        <div className="mt-4">
          <AdminPagination currentPage={currentPage} totalPages={totalPages} />
        </div>
      </div>

      {/* Register / Edit Attribute Modal */}
      {isAttributeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm transition-all duration-300">
          <div className="bg-white border border-slate-200 shadow-2xl max-w-lg w-full p-6 space-y-4 rounded-none relative animate-in fade-in-50 zoom-in-95 duration-150">
            <button
              type="button"
              onClick={() => {
                setIsAttributeModalOpen(false);
                handleCancelEdit();
              }}
              className="absolute top-4 right-4 p-1.5 hover:bg-slate-100 text-slate-500 hover:text-slate-950 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div>
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <Settings className="w-4 h-4 text-slate-500" />
                {editingId ? "Edit Attribute Registry" : "Add Attribute to Registry"}
              </h3>
              <p className="text-xs text-slate-500">Configure parameters like RAM, storage, or sizes to be used across listings.</p>
            </div>

            <form onSubmit={handleSaveAttribute} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                    Attribute Name *
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Storage, RAM, Volume"
                    className="w-full px-4 py-2 border border-slate-300 rounded-none focus:outline-none focus:border-slate-900 text-sm bg-white"
                    required
                    disabled={!canCreate && !canEdit}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                    Attribute Code (Unique) *
                  </label>
                  <input
                    type="text"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder="e.g. storage, ram, volume"
                    className="w-full px-4 py-2 border border-slate-300 rounded-none focus:outline-none focus:border-slate-900 text-sm font-mono lowercase bg-white"
                    required
                    disabled={!!editingId || (!canCreate && !canEdit)}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Description
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Provide context about where this attribute maps..."
                  rows={2}
                  className="w-full px-4 py-2 border border-slate-300 rounded-none focus:outline-none focus:border-slate-900 text-sm bg-white"
                  disabled={!canCreate && !canEdit}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Preset Options (Comma separated)
                </label>
                <input
                  type="text"
                  value={presetsInput}
                  onChange={(e) => setPresetsInput(e.target.value)}
                  placeholder="e.g. S, M, L or 128GB, 256GB"
                  className="w-full px-4 py-2 border border-slate-300 rounded-none focus:outline-none focus:border-slate-900 text-sm bg-white"
                  disabled={!canCreate && !canEdit}
                />
                <p className="text-[10px] text-slate-500 mt-1">
                  Provide standard preset options for the quick variant builder lightbox.
                </p>
              </div>

              {(canCreate || canEdit) && (
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsAttributeModalOpen(false);
                      handleCancelEdit();
                    }}
                    className="px-4 py-2 border border-slate-300 text-slate-700 text-xs font-bold uppercase tracking-widest hover:bg-slate-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-5 py-2 bg-slate-900 text-white text-xs font-bold uppercase tracking-widest flex items-center gap-2 hover:bg-slate-800 transition-colors disabled:opacity-75"
                  >
                    {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                    {editingId ? "Update Attribute" : "Register Attribute"}
                  </button>
                </div>
              )}
            </form>
          </div>
        </div>
      )}

      {/* Category Attribute Mapping Modal */}
      {isMappingModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm transition-all duration-300">
          <div className="bg-white border border-slate-200 shadow-2xl max-w-lg w-full p-6 space-y-4 rounded-none relative animate-in fade-in-50 zoom-in-95 duration-150">
            <button
              type="button"
              onClick={() => setIsMappingModalOpen(false)}
              className="absolute top-4 right-4 p-1.5 hover:bg-slate-100 text-slate-500 hover:text-slate-950 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div>
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <Settings className="w-4 h-4 text-slate-500" />
                Category Attribute Mapper
              </h3>
              <p className="text-xs text-slate-500">Map specific attributes to categories to build product variant forms.</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Select Category
                </label>
                <select
                  value={selectedCategoryId}
                  onChange={(e) => handleCategoryChange(e.target.value)}
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-none focus:outline-none focus:border-slate-900 text-sm bg-white font-medium"
                >
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Warning Callout Box */}
              <div className="bg-amber-50 border border-amber-200 p-4">
                <h4 className="text-xs font-bold text-amber-900 uppercase mb-1">Storefront Alignment Note</h4>
                <p className="text-[11px] text-amber-800 leading-relaxed font-medium">
                  We highly recommend mapping <strong>exactly 1 or 2 attributes</strong> per category.
                  If mapped:
                  <br />• Mapping 1 attribute replaces the standard "Sizes" selector label.
                  <br />• Mapping 2 attributes replaces the "Sizes" and "Colors" selector labels.
                  <br />• Mapping 0 attributes falls back to default "Sizes" and "Colors" labels.
                </p>
              </div>

              <div className="space-y-3 pt-2">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Mapped Attributes (Ordered)
                </label>

                <div className="border border-slate-200 divide-y divide-slate-100 max-h-[250px] overflow-y-auto bg-slate-50">
                  {allAttributes.map((attr) => {
                    const isChecked = selectedMappingIds.includes(attr.id);
                    const sortOrderIndex = selectedMappingIds.indexOf(attr.id);
                    const isDisabled = !isChecked && selectedMappingIds.length >= 2;
                    return (
                      <div
                        key={attr.id}
                        onClick={() => {
                          if (isDisabled) return;
                          handleToggleMappingCheckbox(attr.id);
                        }}
                        className={`flex items-center justify-between p-3 transition-colors ${
                          isDisabled
                            ? "opacity-50 cursor-not-allowed bg-slate-100/30"
                            : isChecked
                              ? "bg-white cursor-pointer"
                              : "hover:bg-slate-100/50 cursor-pointer"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            disabled={isDisabled}
                            onChange={() => {}}
                            className="w-4.5 h-4.5 text-[#800020] border-slate-300 rounded focus:ring-[#800020] cursor-pointer disabled:cursor-not-allowed"
                          />
                          <div>
                            <span className="text-xs font-bold text-slate-950 block">{attr.name}</span>
                            <span className="text-[10px] text-slate-500 font-mono">{attr.code}</span>
                          </div>
                        </div>

                        {isChecked && (
                          <span className="px-2.5 py-1 bg-[#800020] text-white text-[9px] font-bold uppercase tracking-wider">
                            Active Mapping {sortOrderIndex + 1}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {canEdit && (
                <div className="pt-2 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsMappingModalOpen(false)}
                    className="px-4 py-2 border border-slate-300 text-slate-700 text-xs font-bold uppercase tracking-widest hover:bg-slate-50 transition-colors"
                  >
                    Close
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      await handleSaveCategoryMapping();
                      setIsMappingModalOpen(false);
                    }}
                    disabled={mappingLoading || !selectedCategoryId}
                    className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold uppercase tracking-widest flex items-center gap-2 transition-colors disabled:opacity-75"
                  >
                    {mappingLoading ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Check className="w-3.5 h-3.5" />
                    )}
                    Save Mapping
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
