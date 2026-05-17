"use client";

import { useState, useRef, useEffect } from "react";
import { createProduct, updateProduct, uploadImage } from "../../actions";
import { Plus, Trash2, Save, ArrowLeft, GripVertical, Bold, Italic, Underline, List, ListOrdered, Undo, Redo, Eraser } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function ProductFormClient({
  initialData,
  sizeCharts,
  discounts,
  brands = [],
  categories = []
}: {
  initialData?: any,
  sizeCharts: any[],
  discounts: any[],
  brands?: any[],
  categories?: any[]
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState(initialData?.name || "");
  const [description, setDescription] = useState(initialData?.description || "");
  const [price, setPrice] = useState(initialData?.price || "");
  const [images, setImages] = useState<string[]>(initialData?.images || []);
  const [isUploading, setIsUploading] = useState(false);
  const [isFeatured, setIsFeatured] = useState(initialData?.isFeatured || false);
  const [isPublished, setIsPublished] = useState(initialData?.isPublished ?? true);

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

        // ✅ FIX 1: Shudhu valid url ashlei push korbe, undefined ashle korbe na
        if (url && typeof url === 'string') {
          newImages.push(url);
        } else {
          console.warn("Upload response did not return a valid URL:", url);
        }
      }
      setImages((prev) => [...prev, ...newImages]);
    } catch (err) {
      alert("Failed to upload image. Please try again.");
      console.error("Image upload error:", err);
    } finally {
      setIsUploading(false);
    }
  };

  const removeImage = (index: number) => {
    setImages(images.filter((_, i) => i !== index));
  };
  const [brandId, setBrandId] = useState(initialData?.brandId || "");
  const [categoryId, setCategoryId] = useState(initialData?.categoryId || "");
  const [subcategoryId, setSubcategoryId] = useState(initialData?.subcategoryId || "");
  const [sizeChartId, setSizeChartId] = useState(initialData?.sizeChartId || "");
  const [discountId, setDiscountId] = useState(initialData?.discountId || "");

  const [variants, setVariants] = useState<{ id: string, size: string, color: string, colorCode: string, sku: string, stock: number }[]>(
    initialData?.variants?.map((v: any, idx: number) => ({ id: String(idx), size: v.size, color: v.color || "Default", colorCode: v.colorCode || "", sku: v.sku || "", stock: v.stock })) || []
  );

  const [inputColor, setInputColor] = useState("");
  const [inputSize, setInputSize] = useState("");
  const [selectedColors, setSelectedColors] = useState<string[]>([]);
  const [selectedSizes, setSelectedSizes] = useState<string[]>([]);

  const addSelectedColor = () => {
    if (inputColor.trim() && !selectedColors.includes(inputColor.trim())) {
      setSelectedColors([...selectedColors, inputColor.trim()]);
      setInputColor("");
    }
  };

  const addSelectedSize = () => {
    if (inputSize.trim() && !selectedSizes.includes(inputSize.trim().toUpperCase())) {
      setSelectedSizes([...selectedSizes, inputSize.trim().toUpperCase()]);
      setInputSize("");
    }
  };

  const generateVariants = () => {
    if (selectedColors.length === 0 || selectedSizes.length === 0) return alert("Select at least one color and one size.");
    const newVariants = [...variants];
    selectedColors.forEach(color => {
      selectedSizes.forEach(size => {
        if (!newVariants.some(v => v.size === size && v.color === color)) {
           newVariants.push({ id: Date.now() + Math.random().toString(), size, color, colorCode: "", sku: "", stock: 0 });
        }
      });
    });
    setVariants(newVariants);
  };

  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    const updatedVariants = [...variants];
    const draggedItem = updatedVariants[draggedIndex];
    updatedVariants.splice(draggedIndex, 1);
    updatedVariants.splice(index, 0, draggedItem);
    setDraggedIndex(index);
    setVariants(updatedVariants);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  const addVariant = () => {
    setVariants([...variants, { id: Date.now().toString(), size: "", color: "Default", colorCode: "", sku: "", stock: 0 }]);
  };

  const removeVariant = (id: string) => {
    setVariants(variants.filter(v => v.id !== id));
  };

  const updateVariant = (id: string, field: "size" | "stock" | "sku" | "color" | "colorCode", value: any) => {
    setVariants(variants.map(v => v.id === id ? { ...v, [field]: value } : v));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return alert("Name is required.");
    if (!price || isNaN(Number(price))) return alert("Price must be a number.");
    if (variants.length === 0) return alert("You must add at least one Variant.");

    setLoading(true);

    // Check duplicate sizes+colors in UI
    const combinationsSet = new Set(variants.map(v => `${v.size.trim().toLowerCase()}-${v.color.trim().toLowerCase()}`));
    if (combinationsSet.size !== variants.length) {
      setLoading(false);
      return alert("Duplicate Size+Color combinations found. Each variant must be unique.");
    }

    // ✅ FIX 2: Filter out any undefined, null, or empty strings from images array
    const validImages = images.filter((img) => typeof img === 'string' && img.trim() !== "");

    const selectedCategoryObj = categories?.find(c => c.id === categoryId);
    const categoryName = selectedCategoryObj ? selectedCategoryObj.name : "Uncategorized";

    const productPayload = {
      name: name.trim(),
      description: description.trim(),
      price: parseFloat(price),
      images: validImages, // Send the cleaned array
      category: categoryName,
      brandId: brandId || undefined,
      categoryId: categoryId || undefined,
      subcategoryId: subcategoryId || undefined,
      sizeChartId: sizeChartId || undefined,
      discountId: discountId || null,
      isFeatured,
      isPublished,
      variants: variants.map(({ size, color, colorCode, sku, stock }) => ({ size: size.trim(), color: color.trim(), colorCode: colorCode?.trim() || undefined, sku: sku.trim() || undefined, stock }))
    };

    try {
      if (initialData?.id) {
        await updateProduct(initialData.id, productPayload);
      } else {
        await createProduct(productPayload);
      }
      // Success hole page redirect korbe ba reset hobe, apni apnar moto manage korte paren
      router.push("/admin/products");
      // Loading off korar proyojon nai jodi page change hoye jay
    } catch (error) {
      console.error("Failed to save product:", error);
      alert("Failed to save product. Check the server logs.");
      setLoading(false); // ✅ FIX 3: Error hole button loading state off korbe
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6 w-full pb-12 px-4 max-w-[1600px] mx-auto">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-5">
        <div className="flex items-center gap-4">
          <Link href="/admin/products" className="p-2 bg-slate-100 hover:bg-slate-200 rounded-none transition-colors text-slate-500 font-bold flex items-center justify-center">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
              {initialData ? 'Edit Product' : 'Add New Product'}
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">Configure product details, variants, and stock dependencies.</p>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="px-6 py-2.5 bg-slate-900 text-white text-xs font-bold uppercase tracking-widest rounded-none flex items-center justify-center gap-2 hover:bg-slate-800 transition-all disabled:opacity-75 shadow-none active:scale-[0.98]"
        >
          {loading ? (
            <div className="w-4 h-4 border-2 border-white/50 border-t-white rounded-full animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          Save Product Listing
        </button>
      </div>

      {/* Main Grid Layout - 3 Columns on Large Screens */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column (2/3 of Page) - Core Information */}
        <div className="lg:col-span-2 space-y-6">
          {/* Card 1: Product Information */}
          <div className="bg-white border border-slate-200 rounded-none p-6 shadow-none">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4 border-b border-slate-100 pb-2">
              Product Information
            </h2>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-semibold text-slate-900 mb-2">Product Name *</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Mystic Classic Jersey"
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-none focus:outline-none focus:border-slate-900 focus:ring-0 focus:border-slate-900 text-sm"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-900 mb-2">Description</label>
                <SimpleRichTextEditor value={description} onChange={setDescription} />
              </div>
            </div>
          </div>

          {/* Card 2: Gallery Images */}
          <div className="bg-white border border-slate-200 rounded-none p-6 shadow-none">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4 border-b border-slate-100 pb-2">
              Media Gallery
            </h2>

            <div className="flex flex-col gap-6">
              {images.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6">
                  {images.map((img, idx) => (
                    <div key={idx} className="relative group aspect-square border border-slate-200 rounded-none overflow-hidden bg-slate-50 shadow-none">
                      <img src={img} alt={`Uploaded ${idx}`} className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => removeImage(idx)}
                        className="absolute top-1 right-1 bg-red-600/80 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600 shadow"
                        title="Remove Image"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="relative border-2 border-dashed border-slate-300 rounded-none p-8 hover:border-indigo-500 transition-colors bg-slate-50 text-center flex flex-col items-center justify-center">
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleImageUpload}
                  disabled={isUploading}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
                />
                {isUploading ? (
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-6 h-6 border-2 border-indigo-500/50 border-t-indigo-600 rounded-full animate-spin" />
                    <span className="text-xs text-slate-500 font-medium">Uploading images...</span>
                  </div>
                ) : (
                  <>
                    <Plus className="w-8 h-8 text-slate-400 mb-2" />
                    <span className="text-sm font-semibold text-slate-600">Click or drag images to upload</span>
                    <span className="text-xs text-slate-400 mt-1">PNG, JPG up to 5MB</span>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column (1/3 of Page) - Pricing, Sizing & Organization */}
        <div className="space-y-6">
          {/* Card 3: Status & Visibility */}
          <div className="bg-white border border-slate-200 rounded-none p-6 shadow-none">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4 border-b border-slate-100 pb-2">
              Visibility & Publishing
            </h2>

            <div className="space-y-1">
              <div className="flex items-center gap-3 p-2 rounded-none">
                <input
                  type="checkbox"
                  id="isPublished"
                  checked={isPublished}
                  onChange={(e) => setIsPublished(e.target.checked)}
                  className="w-5 h-5 text-emerald-600 border-emerald-300 rounded focus:ring-emerald-500 cursor-pointer shrink-0"
                />
                <label htmlFor="isPublished" className="flex flex-col cursor-pointer select-none">
                  <span className="text-sm font-bold text-emerald-900">Publish to Storefront</span>
                  <span className="text-[10px] text-emerald-700 font-medium">Make visible to customers on the storefront</span>
                </label>
              </div>

              <div className="flex items-center gap-3 p-2 rounded-none">
                <input
                  type="checkbox"
                  id="isFeatured"
                  checked={isFeatured}
                  onChange={(e) => setIsFeatured(e.target.checked)}
                  className="w-5 h-5 text-amber-600 border-amber-300 rounded focus:ring-amber-500 cursor-pointer shrink-0"
                />
                <label htmlFor="isFeatured" className="flex flex-col cursor-pointer select-none">
                  <span className="text-sm font-bold text-amber-900">Featured Product</span>
                  <span className="text-[10px] text-amber-700 font-medium">Pin this product to the top of homepage</span>
                </label>
              </div>
            </div>
          </div>

          {/* Card 4: Pricing & Organization */}
          <div className="bg-white border border-slate-200 rounded-none p-6 shadow-none">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4 border-b border-slate-100 pb-2">
              Pricing & Categories
            </h2>

            <div className="space-y-5">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Selling Price (৳) *</label>
                <input
                  type="number"
                  step="0.001"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="5000"
                  className="w-full px-4 py-2 border border-slate-300 rounded-none focus:outline-none focus:border-slate-900 text-sm font-mono"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Brand</label>
                <select
                  value={brandId}
                  onChange={(e) => setBrandId(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-300 rounded-none focus:outline-none focus:border-slate-900 text-sm bg-white"
                >
                  <option value="">No Brand</option>
                  {brands?.map((b: any) => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Category *</label>
                <select
                  value={categoryId}
                  onChange={(e) => {
                    setCategoryId(e.target.value);
                    setSubcategoryId("");
                  }}
                  className="w-full px-4 py-2 border border-slate-300 rounded-none focus:outline-none focus:border-slate-900 text-sm bg-white"
                  required
                >
                  <option value="">Select Category</option>
                  {categories?.map((c: any) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              {categoryId && categories?.find((c: any) => c.id === categoryId)?.subcategories?.length > 0 && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Subcategory</label>
                  <select
                    value={subcategoryId}
                    onChange={(e) => setSubcategoryId(e.target.value)}
                    className="w-full px-4 py-2 border border-slate-300 rounded-none focus:outline-none focus:border-slate-900 text-sm bg-white"
                  >
                    <option value="">None</option>
                    {categories?.find((c: any) => c.id === categoryId)?.subcategories?.map((sc: any) => (
                      <option key={sc.id} value={sc.id}>{sc.name}</option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Size Chart Reference</label>
                <select
                  value={sizeChartId}
                  onChange={(e) => setSizeChartId(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-300 rounded-none focus:outline-none focus:border-slate-900 text-sm bg-white"
                >
                  <option value="">None Assigned (Ad-hoc sizing)</option>
                  {sizeCharts.map(chart => (
                    <option key={chart.id} value={chart.id}>{chart.category}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Discount</label>
                <select
                  value={discountId}
                  onChange={(e) => setDiscountId(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-300 rounded-none focus:outline-none focus:border-slate-900 text-sm bg-white"
                >
                  <option value="">No Active Promotion</option>
                  {discounts.map(disc => (
                    <option key={disc.id} value={disc.id}>
                      {disc.name} ({disc.discountType === "PERCENTAGE" ? `${disc.value}% OFF` : `৳${disc.value} OFF`})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>


        </div>
      </div>
      {/* Card 5: Size Variants & Stock */}
      <div className="bg-white border border-slate-200 rounded-none p-6 shadow-none">
        <div className="flex flex-col gap-2 mb-4 border-b border-slate-100 pb-3">
          <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
            Size Variants & Stock
          </h2>
          {initialData?.id ? (
            <span className="text-[9px] font-bold text-orange-600 bg-orange-50 border border-orange-100 px-2 py-1 rounded-none w-fit">
              🔒 Stock managed by Purchases & Orders
            </span>
          ) : (
            <span className="text-[10px] text-slate-500 font-medium">Set initial stock for new product</span>
          )}
        </div>

        <div className="mb-6 p-4 bg-slate-50 border border-slate-200 rounded-none">
          <h3 className="text-xs font-bold text-slate-800 uppercase mb-3">Variant Generator</h3>
          <div className="flex flex-col sm:flex-row gap-4 mb-4">
            <div className="flex-1">
              <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">Colors</label>
              <div className="flex gap-2 mb-2">
                <input type="text" value={inputColor} onChange={e => setInputColor(e.target.value)} placeholder="e.g. Black" className="flex-1 px-2 py-1 border border-slate-300 text-xs rounded-none focus:outline-none focus:border-slate-900" />
                <button type="button" onClick={addSelectedColor} className="px-3 py-1 bg-slate-800 text-white text-xs font-bold rounded-none hover:bg-slate-900">Add</button>
              </div>
              <div className="flex flex-wrap gap-1">
                {selectedColors.map(c => (
                  <span key={c} className="text-[10px] bg-slate-200 text-slate-700 px-2 py-0.5 rounded-none flex items-center gap-1">
                    {c} <button type="button" onClick={() => setSelectedColors(selectedColors.filter(sc => sc !== c))} className="hover:text-red-500">&times;</button>
                  </span>
                ))}
              </div>
            </div>
            <div className="flex-1">
              <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">Sizes</label>
              <div className="flex gap-2 mb-2">
                <input type="text" value={inputSize} onChange={e => setInputSize(e.target.value)} placeholder="e.g. XL" className="flex-1 px-2 py-1 border border-slate-300 text-xs rounded-none focus:outline-none focus:border-slate-900 uppercase" />
                <button type="button" onClick={addSelectedSize} className="px-3 py-1 bg-slate-800 text-white text-xs font-bold rounded-none hover:bg-slate-900">Add</button>
              </div>
              <div className="flex flex-wrap gap-1">
                {selectedSizes.map(s => (
                  <span key={s} className="text-[10px] bg-slate-200 text-slate-700 px-2 py-0.5 rounded-none flex items-center gap-1">
                    {s} <button type="button" onClick={() => setSelectedSizes(selectedSizes.filter(ss => ss !== s))} className="hover:text-red-500">&times;</button>
                  </span>
                ))}
              </div>
            </div>
          </div>
          <button type="button" onClick={generateVariants} className="w-full py-2 bg-indigo-600 text-white text-xs font-bold uppercase rounded-none hover:bg-indigo-700 transition-colors">
            Generate Matrix
          </button>
        </div>

        <div className="overflow-hidden border border-slate-200 rounded-none">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="w-8 py-2 text-center"></th>
                <th className="px-3 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider w-1/4">Color</th>
                <th className="px-3 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider w-1/4">Size</th>
                <th className="px-3 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider w-1/4">SKU</th>
                <th className="px-3 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider w-1/4">Stock</th>
                <th className="w-8 py-2 text-center"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {variants.map((v, index) => (
                <tr
                  key={v.id}
                  draggable
                  onDragStart={() => handleDragStart(index)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDragEnd={handleDragEnd}
                  className={`transition-all duration-150 ${draggedIndex === index ? "bg-slate-100 opacity-55" : "hover:bg-slate-50/50"}`}
                >
                  <td className="py-2 text-slate-400 cursor-grab active:cursor-grabbing text-center select-none">
                    <GripVertical className="w-3.5 h-3.5 mx-auto" />
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex gap-1 items-center">
                      <input
                        type="color"
                        value={v.colorCode || "#000000"}
                        onChange={(e) => updateVariant(v.id, "colorCode", e.target.value)}
                        className="w-6 h-6 p-0 border-0 rounded-none cursor-pointer"
                        title="Pick Color"
                      />
                      <input
                        type="text"
                        value={v.color}
                        onChange={(e) => updateVariant(v.id, "color", e.target.value)}
                        placeholder="Color"
                        className="w-full px-2 py-1.5 border border-slate-200 rounded-none text-xs focus:outline-none focus:border-slate-900 font-semibold"
                        required
                      />
                    </div>
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="text"
                      value={v.size}
                      onChange={(e) => updateVariant(v.id, "size", e.target.value.toUpperCase())}
                      placeholder="XL"
                      className="w-full px-2 py-1.5 border border-slate-200 rounded-none text-xs focus:outline-none focus:border-slate-900 uppercase font-semibold"
                      required
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="text"
                      value={v.sku}
                      onChange={(e) => updateVariant(v.id, "sku", e.target.value)}
                      placeholder="SKU-..."
                      className="w-full px-2 py-1.5 border border-slate-200 rounded-none text-xs focus:outline-none focus:border-slate-900 uppercase font-mono"
                    />
                  </td>
                  <td className="px-3 py-2">
                    {initialData?.id ? (
                      <input
                        type="number"
                        value={v.stock}
                        readOnly
                        className="w-full px-2 py-1.5 border border-slate-100 bg-slate-50 rounded-none text-xs font-mono cursor-not-allowed text-slate-500"
                      />
                    ) : (
                      <input
                        type="number"
                        min="0"
                        value={v.stock}
                        onChange={(e) => updateVariant(v.id, "stock", parseInt(e.target.value) || 0)}
                        className="w-full px-2 py-1.5 border border-slate-200 bg-white rounded-none text-xs focus:outline-none focus:border-slate-900 font-mono"
                      />
                    )}
                  </td>
                  <td className="py-2 text-center">
                    <button
                      type="button"
                      onClick={() => removeVariant(v.id)}
                      className="text-slate-400 hover:text-red-600 transition-colors p-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="bg-slate-50/50 p-2 text-center border-t border-slate-200">
            <button
              type="button"
              onClick={addVariant}
              className="text-xs font-semibold text-slate-600 hover:text-slate-900 flex items-center justify-center gap-1.5 mx-auto bg-white border border-slate-200 hover:bg-slate-50 px-3 py-1.5 rounded-none transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Single Row
            </button>
          </div>
        </div>
      </div>
    </form>
  );
}

interface SimpleRichTextEditorProps {
  value: string;
  onChange: (val: string) => void;
}

function SimpleRichTextEditor({ value, onChange }: SimpleRichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);

  // Keep editor content in sync with form state
  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== value) {
      editorRef.current.innerHTML = value || "";
    }
  }, [value]);

  const handleInput = () => {
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
  };

  const execCommand = (command: string) => {
    document.execCommand(command, false);
    handleInput();
  };

  return (
    <div className="border border-slate-300 rounded-none overflow-hidden focus-within:border-slate-900 focus-within:ring-0 focus-within:border-slate-900">
      <div className="flex flex-wrap items-center gap-1 bg-slate-50 border-b border-slate-200 p-2 text-slate-600 select-none">
        <button
          type="button"
          onClick={() => execCommand("bold")}
          className="p-1.5 hover:bg-slate-200 rounded text-slate-700 transition-colors"
          title="Bold"
        >
          <Bold className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => execCommand("italic")}
          className="p-1.5 hover:bg-slate-200 rounded text-slate-700 transition-colors"
          title="Italic"
        >
          <Italic className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => execCommand("underline")}
          className="p-1.5 hover:bg-slate-200 rounded text-slate-700 transition-colors"
          title="Underline"
        >
          <Underline className="w-4 h-4" />
        </button>
        <div className="w-[1px] h-4 bg-slate-300 mx-1" />
        <button
          type="button"
          onClick={() => execCommand("insertUnorderedList")}
          className="p-1.5 hover:bg-slate-200 rounded text-slate-700 transition-colors"
          title="Bullet List"
        >
          <List className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => execCommand("insertOrderedList")}
          className="p-1.5 hover:bg-slate-200 rounded text-slate-700 transition-colors"
          title="Numbered List"
        >
          <ListOrdered className="w-4 h-4" />
        </button>
        <div className="w-[1px] h-4 bg-slate-300 mx-1" />
        <button
          type="button"
          onClick={() => execCommand("undo")}
          className="p-1.5 hover:bg-slate-200 rounded text-slate-700 transition-colors"
          title="Undo"
        >
          <Undo className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => execCommand("redo")}
          className="p-1.5 hover:bg-slate-200 rounded text-slate-700 transition-colors"
          title="Redo"
        >
          <Redo className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => execCommand("removeFormat")}
          className="p-1.5 hover:bg-slate-200 rounded text-slate-700 transition-colors"
          title="Clear Format"
        >
          <Eraser className="w-4 h-4" />
        </button>
      </div>
      <div
        ref={editorRef}
        contentEditable
        onInput={handleInput}
        className="prose prose-sm max-w-none min-h-[180px] max-h-[400px] overflow-y-auto px-4 py-3 bg-white focus:outline-none text-slate-900"
        style={{ outline: "none" }}
      />
    </div>
  );
}
