"use client";

import { useState } from "react";
import { createProduct, updateProduct, uploadImage } from "../../actions";
import { Plus, Trash2, Save, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function ProductFormClient({ 
  initialData, 
  sizeCharts 
}: { 
  initialData?: any, 
  sizeCharts: any[] 
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState(initialData?.name || "");
  const [description, setDescription] = useState(initialData?.description || "");
  const [price, setPrice] = useState(initialData?.price || "");
  const [images, setImages] = useState<string[]>(initialData?.images || []);
  const [isUploading, setIsUploading] = useState(false);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setIsUploading(true);
    
    try {
      const newImages: string[] = [];
      for (const file of Array.from(files)) {
        const formData = new FormData();
        formData.append("file", file);
        const url = await uploadImage(formData);
        newImages.push(url);
      }
      setImages((prev) => [...prev, ...newImages]);
    } catch (err) {
      alert("Failed to upload image.");
      console.error(err);
    } finally {
      setIsUploading(false);
    }
  };

  const removeImage = (index: number) => {
    setImages(images.filter((_, i) => i !== index));
  };
  const [team, setTeam] = useState(initialData?.team || "");
  const [category, setCategory] = useState(initialData?.category || "");
  const [sizeChartId, setSizeChartId] = useState(initialData?.sizeChartId || "");

  const [variants, setVariants] = useState<{ id: string, size: string, stock: number }[]>(
    initialData?.variants?.map((v: any, idx: number) => ({ id: String(idx), size: v.size, stock: v.stock })) || [
      { id: "1", size: "M", stock: 0 }
    ]
  );

  const addVariant = () => {
    setVariants([...variants, { id: Date.now().toString(), size: "", stock: 0 }]);
  };

  const removeVariant = (id: string) => {
    setVariants(variants.filter(v => v.id !== id));
  };

  const updateVariant = (id: string, field: "size" | "stock", value: any) => {
    setVariants(variants.map(v => v.id === id ? { ...v, [field]: value } : v));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !category.trim()) return alert("Name and Category are required.");
    if (!price || isNaN(Number(price))) return alert("Price must be a number.");
    if (variants.length === 0) return alert("You must add at least one Size Variant.");

    setLoading(true);
    
    // Check duplicate sizes in UI
    const sizesSet = new Set(variants.map(v => v.size.trim().toLowerCase()));
    if (sizesSet.size !== variants.length) {
      setLoading(false);
      return alert("Duplicate size names found. Each variant must have a unique size.");
    }

    const productPayload = {
      name: name.trim(),
      description: description.trim(),
      price: parseFloat(price),
      images: images,
      team: team.trim(),
      category: category.trim(),
      sizeChartId: sizeChartId || undefined,
      variants: variants.map(({ size, stock }) => ({ size: size.trim(), stock }))
    };

    if (initialData?.id) {
      await updateProduct(initialData.id, productPayload);
    } else {
      await createProduct(productPayload);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6 max-w-4xl pb-12">
      <div className="flex items-center gap-4 mb-2">
        <Link href="/admin/products" className="p-2 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors text-slate-500">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
            {initialData ? 'Edit Product' : 'Add New Product'}
          </h1>
          <p className="text-sm text-slate-500 mt-1">Configure product details, variants, and stock dependencies.</p>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-lg p-6 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="col-span-1 md:col-span-2">
            <label className="block text-sm font-semibold text-slate-900 mb-2">Product Name *</label>
            <input 
              type="text" 
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Mystic Classic Jersey"
              className="w-full px-4 py-2 border border-slate-300 rounded-md focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-sm"
              required
            />
          </div>

          <div className="col-span-1 md:col-span-2">
            <label className="block text-sm font-semibold text-slate-900 mb-2">Description</label>
            <textarea 
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              placeholder="Detailed product features..."
              className="w-full px-4 py-2 border border-slate-300 rounded-md focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-sm"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-900 mb-2">Selling Price (৳) *</label>
            <input 
              type="number" 
              step="0.01"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="5000"
              className="w-full px-4 py-2 border border-slate-300 rounded-md focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-sm font-mono"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-900 mb-0.5">Size Chart Reference</label>
            <p className="text-xs text-slate-500 mb-2 font-medium">This chart shows in customer view or product single page.</p>
            <select
              value={sizeChartId}
              onChange={(e) => setSizeChartId(e.target.value)}
              className="w-full px-4 py-2 border border-slate-300 rounded-md focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-sm bg-white"
            >
              <option value="">None Assigned (Ad-hoc sizing)</option>
              {sizeCharts.map(chart => (
                <option key={chart.id} value={chart.id}>{chart.category}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-900 mb-2">Team / Brand</label>
            <input 
              type="text" 
              value={team}
              onChange={(e) => setTeam(e.target.value)}
              placeholder="e.g. Mystic FC"
              className="w-full px-4 py-2 border border-slate-300 rounded-md focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-sm"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-900 mb-2">Product Category</label>
            <input 
              type="text" 
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="e.g. Jerseys"
              className="w-full px-4 py-2 border border-slate-300 rounded-md focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-sm"
              required
            />
          </div>

          <div className="col-span-1 md:col-span-2">
            <label className="block text-sm font-semibold text-slate-900 mb-2">Gallery Images</label>
            <div className="flex flex-col gap-4">
              <div className="flex flex-wrap gap-2">
                {images.map((img, idx) => (
                  <div key={idx} className="relative group w-24 h-24 border border-slate-200 rounded-md overflow-hidden bg-slate-50">
                    <img src={img} alt={`Uploaded ${idx}`} className="w-full h-full object-cover" />
                    <button 
                      type="button" 
                      onClick={() => removeImage(idx)}
                      className="absolute top-1 right-1 bg-red-600/80 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                      title="Remove Image"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
              
              <div className="relative border-2 border-dashed border-slate-300 rounded-lg p-6 hover:border-indigo-500 transition-colors bg-slate-50 text-center flex flex-col items-center justify-center">
                <input 
                  type="file" 
                  accept="image/*"
                  multiple
                  onChange={handleImageUpload}
                  disabled={isUploading}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
                />
                {isUploading ? (
                  <div className="w-5 h-5 border-2 border-indigo-500/50 border-t-indigo-600 rounded-full animate-spin" />
                ) : (
                  <>
                    <Plus className="w-6 h-6 text-slate-400 mb-2" />
                    <span className="text-sm font-medium text-slate-600">Click or drag images to upload</span>
                    <span className="text-xs text-slate-400 mt-1">PNG, JPG up to 5MB</span>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Variants Section */}
        <div className="border border-slate-200 rounded-md overflow-hidden mb-8">
           <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex justify-between items-center">
            <h3 className="text-sm font-semibold text-slate-700">Size Variants & Stock</h3>
            <p className="text-xs text-slate-500 font-medium">Auto-synced via Purchases Module</p>
          </div>
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100">
                <th className="px-4 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">Size Label</th>
                <th className="px-4 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider w-32">Current Stock</th>
                <th className="px-4 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider w-16"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {variants.map((v) => (
                <tr key={v.id}>
                  <td className="px-4 py-2">
                    <input 
                      type="text" 
                      value={v.size} 
                      onChange={(e) => updateVariant(v.id, "size", e.target.value.toUpperCase())}
                      placeholder="e.g. XL"
                      className="w-full px-3 py-1.5 border border-slate-200 rounded text-sm focus:outline-none focus:border-indigo-500 uppercase"
                      required
                    />
                  </td>
                  <td className="px-4 py-2">
                    <input 
                      type="number" 
                      min="0"
                      value={v.stock} 
                      onChange={(e) => updateVariant(v.id, "stock", parseInt(e.target.value) || 0)}
                      className="w-full px-3 py-1.5 border border-slate-200 bg-slate-50 text-slate-500 rounded text-sm focus:outline-none font-mono cursor-not-allowed"
                      title="Stock limits are driven exclusively by Purchase records. You can override manually here if authorized."
                    />
                  </td>
                  <td className="px-4 py-2 text-center">
                    <button 
                      type="button" 
                      onClick={() => removeVariant(v.id)}
                      className="text-slate-400 hover:text-red-600 transition-colors p-1 rounded-md hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="bg-white p-3 text-center border-t border-slate-100">
            <button 
               type="button"
               onClick={addVariant}
               className="text-xs font-medium text-indigo-600 hover:text-indigo-800 flex items-center justify-center gap-1 mx-auto bg-indigo-50 px-3 py-1.5 rounded-full transition-colors"
            >
              <Plus className="w-3 h-3" />
              Add Size Variant
            </button>
          </div>
        </div>

        <div className="flex justify-end pt-4 border-t border-slate-100">
          <button 
            type="submit" 
            disabled={loading}
            className="px-6 py-2.5 bg-slate-900 text-white font-medium rounded-md flex items-center justify-center gap-2 hover:bg-slate-800 transition-colors disabled:opacity-75 shadow-sm"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-white/50 border-t-white rounded-full animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            Save Product Listing
          </button>
        </div>
      </div>
    </form>
  );
}
