"use client";

import { useState, useRef, useEffect } from "react";
import { createProduct, updateProduct, uploadImage } from "../actions";
import { createBrand, createSubcategory, createCategory } from "../../inventory/catalog-actions";
import { getCategoryMappings } from "../../inventory/attributes-actions";
import { slugify } from "@/utils/slugify";
import { Plus, Trash2, Save, ArrowLeft, GripVertical, Bold, Italic, Underline, List, ListOrdered, Undo, Redo, Eraser, X, Loader2, ChevronDown } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

function generateSKUCode({
  brandName,
  categoryName,
  productName,
  color,
  size
}: {
  brandName?: string;
  categoryName?: string;
  productName: string;
  color?: string;
  size?: string;
}): string {
  // 1. Brand Abbreviation (max 3 chars)
  let brandCode = "MYS";
  if (brandName) {
    const cleanBrand = brandName.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
    const words = brandName.split(/\s+/).filter(Boolean);
    if (words.length >= 2) {
      brandCode = words.map(w => w[0]).join("").toUpperCase().slice(0, 3);
    } else {
      brandCode = cleanBrand.slice(0, 3);
    }
  }

  // 2. Category Abbreviation (3 chars)
  let catCode = "GEN";
  if (categoryName) {
    const nameUpper = categoryName.toUpperCase();
    const mappings: Record<string, string> = {
      "JERSEY": "JSY",
      "T-SHIRT": "TS",
      "TSHIRT": "TS",
      "PANTS": "PNT",
      "PANJABI": "PJB",
      "ACCESSORIES": "ACC",
      "SHIRT": "SRT",
      "HOODIE": "HD",
      "POLO": "PLO",
      "SMARTPHONE": "PHN",
      "ELECTRONICS": "ELC"
    };
    
    const matchedKey = Object.keys(mappings).find(k => nameUpper.includes(k));
    if (matchedKey) {
      catCode = mappings[matchedKey];
    } else {
      const cleanCat = categoryName.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
      const consonants = cleanCat.replace(/[AEIOU]/g, "");
      catCode = consonants.length >= 2 ? consonants.slice(0, 3) : cleanCat.slice(0, 3);
    }
  }

  // 3. Product Model/Style Code (3 chars)
  let modelCode = "";
  const words = productName.trim().split(/\s+/).filter(w => {
    if (brandName && w.toLowerCase() === brandName.toLowerCase()) return false;
    return w.length > 0;
  });

  if (words.length >= 2) {
    modelCode = words.map(w => w[0]).join("").toUpperCase().slice(0, 3);
  } else if (words.length === 1) {
    const cleanWord = words[0].replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
    const consonants = cleanWord.replace(/[AEIOU]/g, "");
    modelCode = consonants.length >= 3 ? consonants.slice(0, 3) : cleanWord.slice(0, 3);
  }
  if (!modelCode || modelCode.length < 2) {
    modelCode = "PROD";
  }

  // 4. Color Abbreviation (3 chars)
  let colorCode = "";
  if (color && color !== "Default") {
    const cleanColor = color.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
    const mappings: Record<string, string> = {
      "BLACK": "BLK",
      "WHITE": "WHT",
      "NAVY": "NVY",
      "BLUE": "BLU",
      "GREEN": "GRN",
      "YELLOW": "YLW",
      "ORANGE": "ORG",
      "PURPLE": "PRP",
      "RED": "RED",
      "GREY": "GRY",
      "GRAY": "GRY",
      "MAROON": "MRN",
      "GOLD": "GLD",
      "SILVER": "SLV",
      "PINK": "PNK"
    };
    if (mappings[cleanColor]) {
      colorCode = mappings[cleanColor];
    } else {
      const consonants = cleanColor.replace(/[AEIOU]/g, "");
      colorCode = consonants.length >= 3 ? consonants.slice(0, 3) : cleanColor.slice(0, 3);
    }
  }

  // 5. Size (direct uppercase, max 3 chars)
  let sizeCode = "";
  if (size && size !== "Default") {
    sizeCode = size.replace(/[^a-zA-Z0-9]/g, "").toUpperCase().slice(0, 3);
  }

  const segments = [brandCode, catCode, modelCode];
  if (colorCode) segments.push(colorCode);
  if (sizeCode) segments.push(sizeCode);

  return segments.join("-");
}

export default function ProductFormClient({
  initialData,
  sizeCharts,
  discounts,
  brands = [],
  categories = [],
  allProducts = []
}: {
  initialData?: any,
  sizeCharts: any[],
  discounts: any[],
  brands?: any[],
  categories?: any[],
  allProducts?: { id: string, name: string, categoryId?: string | null, categoryRel?: { name: string } | null, mediaAssets?: { url: string }[] }[]
}) {
  const [isCombo, setIsCombo] = useState(initialData?.isCombo || false);
  const [comboRequiredQty, setComboRequiredQty] = useState<number>(initialData?.comboRequiredQty || 1);
  const [comboChildIds, setComboChildIds] = useState<string[]>(initialData?.comboChildIds || []);
  const [comboDefaultChildIds, setComboDefaultChildIds] = useState<string[]>(initialData?.comboDefaultChildIds || []);
  const [comboFilterCategory, setComboFilterCategory] = useState<string>("all");
  const [comboSearch, setComboSearch] = useState("");
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [isSizeModalOpen, setIsSizeModalOpen] = useState(false);
  const [isColorModalOpen, setIsColorModalOpen] = useState(false);
  const [mappedAttributes, setMappedAttributes] = useState<{ id: string; name: string; code: string; presets?: string[] }[]>([]);
  const [name, setName] = useState(initialData?.name || "");
  const [description, setDescription] = useState(initialData?.description || "");
  const [price, setPrice] = useState(initialData?.price || "");

  // Declare categorization / relational states first to avoid temporal dead zone in hooks
  const [brandId, setBrandId] = useState(initialData?.brandId || "");
  const [categoryId, setCategoryId] = useState(initialData?.categoryId || "");
  const [subcategoryId, setSubcategoryId] = useState(initialData?.subcategoryId || "");
  const [sizeChartId, setSizeChartId] = useState(initialData?.sizeChartId || "");
  const [discountId, setDiscountId] = useState(initialData?.discountId || "");

  const [hasSize, setHasSize] = useState(() => {
    if (!initialData?.variants || initialData.variants.length === 0) return true;
    return initialData.variants.some((v: any) => v.size && v.size !== "Default" && v.size !== "-");
  });
  const [hasColor, setHasColor] = useState(() => {
    if (!initialData?.variants || initialData.variants.length === 0) return false;
    return initialData.variants.some((v: any) => v.color && v.color !== "Default" && v.color !== "-");
  });

  const [useDifferentPrices, setUseDifferentPrices] = useState(() => {
    if (!initialData?.variants || initialData.variants.length === 0) return false;
    const basePrice = initialData.price ? Number(initialData.price) : 0;
    return initialData.variants.some((v: any) => {
      const vPrice = v.price ?? (v.pricingMatrix?.basePrice ? Number(v.pricingMatrix.basePrice) : undefined);
      return vPrice !== undefined && Number(vPrice) !== basePrice;
    });
  });

  const [images, setImages] = useState<{ url: string, boundAttributes: any }[]>(() => {
    if (initialData?.mediaAssets && initialData.mediaAssets.length > 0) {
      return initialData.mediaAssets.map((asset: any) => ({
        url: asset.url,
        boundAttributes: asset.boundAttributes || {}
      }));
    }
    return initialData?.images?.map((url: string) => ({ url, boundAttributes: {} })) || [];
  });

  const [sizeOptions, setSizeOptions] = useState<string[]>(["S", "M", "L", "XL", "XXL", "3XL"]);
  const [selectedSizes, setSelectedSizes] = useState<string[]>(() => {
    if (!initialData?.variants) return [];
    const sizesSet = new Set<string>(
      initialData.variants.map((v: any) => v.size).filter((s: any) => s && s !== "Default" && s !== "-")
    );
    return Array.from(sizesSet);
  });
  const [customSizeInput, setCustomSizeInput] = useState("");

  const [colorOptions, setColorOptions] = useState<string[]>(["Black", "White", "Navy", "Red", "Royal Blue", "Maroon", "Grey"]);
  const [selectedColors, setSelectedColors] = useState<string[]>(() => {
    if (!initialData?.variants) return [];
    const colorsSet = new Set<string>(
      initialData.variants.map((v: any) => v.color).filter((c: any) => c && c !== "Default" && c !== "-")
    );
    return Array.from(colorsSet);
  });
  const [customColorInput, setCustomColorInput] = useState("");

  const [simpleSku, setSimpleSku] = useState(() => {
    if (initialData?.variants && initialData.variants.length === 1) {
      const v = initialData.variants[0];
      if ((!v.size || v.size === "Default") && (!v.color || v.color === "Default")) {
        return v.sku || "";
      }
    }
    return "";
  });
  const [simpleStock, setSimpleStock] = useState(() => {
    if (initialData?.variants && initialData.variants.length === 1) {
      const v = initialData.variants[0];
      if ((!v.size || v.size === "Default") && (!v.color || v.color === "Default")) {
        return String(v.stocks?.[0]?.availableQuantity ?? v.stock ?? 0);
      }
    }
    return "0";
  });

  const [isUploading, setIsUploading] = useState(false);
  const [isFeatured, setIsFeatured] = useState(initialData?.isFeatured || false);
  const [featuredOrder, setFeaturedOrder] = useState<number>(initialData?.featuredOrder || 1);
  const [isPublished, setIsPublished] = useState(initialData?.isPublished ?? true);
  const [isCustomize, setIsCustomize] = useState(initialData?.isCustomize || false);
  const [trackStock, setTrackStock] = useState(initialData?.trackStock || false);
  const [slug, setSlug] = useState(initialData?.slug || "");
  const [isSlugEdited, setIsSlugEdited] = useState(!!initialData?.slug);

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setName(val);
    if (!isSlugEdited) {
      setSlug(slugify(val));
    }
  };

  useEffect(() => {
    if (!categoryId) {
      setMappedAttributes([]);
      setSizeOptions(["S", "M", "L", "XL", "XXL", "3XL"]);
      setColorOptions(["Black", "White", "Navy", "Red", "Royal Blue", "Maroon", "Grey"]);
      return;
    }
    let active = true;
    getCategoryMappings(categoryId).then(res => {
      if (!active) return;
      if (res.success && res.mappings) {
        const mappedAttrs = res.mappings.map(m => ({
          id: m.attribute.id,
          name: m.attribute.name,
          code: m.attribute.code,
          presets: Array.isArray(m.attribute.presets)
            ? m.attribute.presets
            : typeof m.attribute.presets === 'string'
              ? JSON.parse(m.attribute.presets || '[]')
              : []
        }));
        setMappedAttributes(mappedAttrs);

        if (mappedAttrs[0]) {
          const dbPresets = mappedAttrs[0].presets || [];
          if (dbPresets.length > 0) {
            setSizeOptions(dbPresets);
          } else {
            setSizeOptions(["S", "M", "L", "XL", "XXL", "3XL"]);
          }
        } else {
          setSizeOptions(["S", "M", "L", "XL", "XXL", "3XL"]);
        }

        if (mappedAttrs[1]) {
          const dbPresets = mappedAttrs[1].presets || [];
          if (dbPresets.length > 0) {
            setColorOptions(dbPresets);
          } else {
            setColorOptions(["Black", "White", "Navy", "Red", "Royal Blue", "Maroon", "Grey"]);
          }
        } else {
          setColorOptions(["Black", "White", "Navy", "Red", "Royal Blue", "Maroon", "Grey"]);
        }
      } else {
        setMappedAttributes([]);
        setSizeOptions(["S", "M", "L", "XL", "XXL", "3XL"]);
        setColorOptions(["Black", "White", "Navy", "Red", "Royal Blue", "Maroon", "Grey"]);
      }
    });
    return () => {
      active = false;
    };
  }, [categoryId]);

  useEffect(() => {
    if (mappedAttributes.length === 1) {
      setHasColor(false);
    }
  }, [mappedAttributes]);

  // Dynamic state arrays to handle inline additions seamlessly
  const [localBrands, setLocalBrands] = useState<any[]>(brands);
  const [localCategories, setLocalCategories] = useState<any[]>(categories);

  useEffect(() => {
    setLocalBrands(brands);
  }, [brands]);

  useEffect(() => {
    setLocalCategories(categories);
  }, [categories]);

  // Inline creation states
  const [isAddingBrand, setIsAddingBrand] = useState(false);
  const [newBrandName, setNewBrandName] = useState("");
  const [brandSubmitting, setBrandSubmitting] = useState(false);

  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [categorySubmitting, setCategorySubmitting] = useState(false);

  const [isAddingSubcategory, setIsAddingSubcategory] = useState(false);
  const [newSubcategoryName, setNewSubcategoryName] = useState("");
  const [subcategorySubmitting, setSubcategorySubmitting] = useState(false);

  const handleAddCategoryInline = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoryName.trim()) return;
    setCategorySubmitting(true);
    try {
      const res = await createCategory({ name: newCategoryName.trim() });
      if (res.success && res.category) {
        const newCategoryObj = { ...res.category, subcategories: [] };
        setLocalCategories((prev) => [...prev, newCategoryObj]);
        setCategoryId(res.category.id);
        setSubcategoryId("");
        setNewCategoryName("");
        setIsAddingCategory(false);
      } else {
        alert(res.error || "Failed to create category");
      }
    } catch (err) {
      console.error(err);
      alert("Failed to create category. Check console.");
    } finally {
      setCategorySubmitting(false);
    }
  };

  const handleAddBrandInline = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBrandName.trim()) return;
    setBrandSubmitting(true);
    try {
      const res = await createBrand({ name: newBrandName.trim() });
      if (res.success && res.brand) {
        setLocalBrands((prev) => [...prev, res.brand]);
        setBrandId(res.brand.id);
        setNewBrandName("");
        setIsAddingBrand(false);
      } else {
        alert(res.error || "Failed to create brand");
      }
    } catch (err) {
      console.error(err);
      alert("Failed to create brand. Check console.");
    } finally {
      setBrandSubmitting(false);
    }
  };

  const handleAddSubcategoryInline = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubcategoryName.trim()) return;
    if (!categoryId) return alert("Please select a parent category first.");
    setSubcategorySubmitting(true);
    try {
      const res = await createSubcategory({
        name: newSubcategoryName.trim(),
        categoryId: categoryId,
      });
      if (res.success && res.subcategory) {
        setLocalCategories((prev) =>
          prev.map((c) => {
            if (c.id === categoryId) {
              return {
                ...c,
                subcategories: [...(c.subcategories || []), res.subcategory],
              };
            }
            return c;
          })
        );
        setSubcategoryId(res.subcategory.id);
        setNewSubcategoryName("");
        setIsAddingSubcategory(false);
      } else {
        alert(res.error || "Failed to create subcategory");
      }
    } catch (err) {
      console.error(err);
      alert("Failed to create subcategory. Check console.");
    } finally {
      setSubcategorySubmitting(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const currentCount = images.length;
    if (currentCount >= 20) {
      alert("You can only upload a maximum of 20 images.");
      e.target.value = "";
      return;
    }

    const availableSlots = 20 - currentCount;
    let filesToUpload = Array.from(files);

    if (filesToUpload.length > availableSlots) {
      alert(`You can only upload up to 20 images. Only the first ${availableSlots} image(s) will be uploaded.`);
      filesToUpload = filesToUpload.slice(0, availableSlots);
    }

    const MAX_SIZE = 500 * 1024; // 500KB
    const oversized = filesToUpload.filter(f => f.size > MAX_SIZE);
    if (oversized.length > 0) {
      alert(`Image size must be 500KB or less. The following file(s) are too large:\n${oversized.map(f => `• ${f.name} (${(f.size / 1024).toFixed(0)}KB)`).join("\n")}`);
      e.target.value = "";
      return;
    }

    setIsUploading(true);

    try {
      const newImages: { url: string, boundAttributes: any }[] = [];
      for (const file of filesToUpload) {
        const formData = new FormData();
        formData.append("file", file);
        const url = await uploadImage(formData);

        // ✅ FIX 1: Shudhu valid url ashlei push korbe, undefined ashle korbe na
        if (url && typeof url === 'string') {
          newImages.push({ url, boundAttributes: {} });
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
      e.target.value = "";
    }
  };

  const removeImage = (index: number) => {
    setImages(images.filter((_, i) => i !== index));
  };

  const [variants, setVariants] = useState<{ id: string, size: string, color: string, colorCode: string, sku: string, stock: number, price?: number }[]>(
    initialData?.variants?.map((v: any, idx: number) => ({
      id: String(idx),
      size: v.size,
      color: v.color || "Default",
      colorCode: v.colorCode || "",
      sku: v.sku || "",
      stock: v.stock,
      price: v.price ?? (v.pricingMatrix?.basePrice ? Number(v.pricingMatrix.basePrice) : undefined)
    })) || []
  );

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
    const defaultPrice = price ? parseFloat(price) : 0;
    setVariants([...variants, { id: Date.now().toString(), size: "", color: "Default", colorCode: "", sku: "", stock: 0, price: defaultPrice }]);
  };

  const removeVariant = (id: string) => {
    setVariants(variants.filter(v => v.id !== id));
  };

  const updateVariant = (id: string, field: "size" | "stock" | "sku" | "color" | "colorCode" | "price", value: any) => {
    setVariants(variants.map(v => v.id === id ? { ...v, [field]: value } : v));
  };

  const setImageTag = (index: number, boundAttributes: any) => {
    setImages(images.map((img, i) => i === index ? { ...img, boundAttributes } : img));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return alert("Name is required.");
    if (!price || isNaN(Number(price))) return alert("Price must be a number.");

    if (isCombo) {
      if (!comboRequiredQty || comboRequiredQty < 1) return alert("Required Items Qty must be at least 1.");
      if (comboChildIds.length < comboRequiredQty) {
        return alert(`You must select at least ${comboRequiredQty} child product${comboRequiredQty > 1 ? 's' : ''} for this combo. Currently selected: ${comboChildIds.length}.`);
      }
    }

    if ((hasSize || hasColor) && variants.length === 0) {
      return alert("You must add or generate at least one Variant.");
    }

    setLoading(true);

    if (hasSize || hasColor) {
      // Check duplicate size & color combinations in UI
      const combinationsSet = new Set(variants.map(v => `${(hasSize ? v.size : "Default").trim().toLowerCase()}-${(hasColor ? v.color : "Default").trim().toLowerCase()}`));
      if (combinationsSet.size !== variants.length) {
        setLoading(false);
        return alert("Duplicate Size and Color combination found. Each variant must be unique.");
      }
    }

    // Filter out any invalid images
    const validImages = images.filter((img) => img && typeof img.url === 'string' && img.url.trim() !== "");

    const selectedCategoryObj = localCategories?.find(c => c.id === categoryId);
    const categoryName = selectedCategoryObj ? selectedCategoryObj.name : "Uncategorized";

    const productPayload = {
      name: name.trim(),
      slug: slug.trim(),
      description: description.trim(),
      price: parseFloat(price),
      images: validImages, // Send the cleaned array of objects { url, boundAttributes }
      brandId: brandId || null,
      categoryId: categoryId || null,
      subcategoryId: subcategoryId || null,
      sizeChartId: sizeChartId || null,
      discountId: discountId || null,
      isFeatured,
      featuredOrder: isFeatured ? featuredOrder : 0,
      isPublished,
      isCustomize,
      trackStock,
      isCombo,
      comboRequiredQty: isCombo ? Number(comboRequiredQty) : 0,
      comboChildIds: isCombo ? comboChildIds : [],
      comboDefaultChildIds: isCombo ? comboDefaultChildIds.filter(id => comboChildIds.includes(id)) : [],
      variants: (hasSize || hasColor)
        ? variants.map(({ size, color, sku, price: vPrice, stock }) => {
          const variantAttributes: Record<string, string> = {};
          if (mappedAttributes[0] && hasSize) {
            variantAttributes[mappedAttributes[0].code] = size;
          }
          if (mappedAttributes[1] && hasColor) {
            variantAttributes[mappedAttributes[1].code] = color;
          }
          return {
            size: hasSize ? size.trim() : "Default",
            color: hasColor ? color.trim() : "Default",
            colorCode: undefined,
            sku: sku.trim() || undefined,
            price: useDifferentPrices
              ? (vPrice !== undefined ? Number(vPrice) : parseFloat(price))
              : parseFloat(price),
            stock,
            attributes: variantAttributes
          };
        })
        : [{
          size: "Default",
          color: "Default",
          colorCode: undefined,
          sku: simpleSku.trim() || undefined,
          price: parseFloat(price),
          stock: parseInt(simpleStock) || 0,
          attributes: {}
        }]
    };

    try {
      if (initialData?.id) {
        const res = await updateProduct(initialData.id, productPayload);
        if (res && !res.success) {
          alert(`Failed to save product: ${res.error || "Unknown error"}`);
          setLoading(false);
        } else {
          router.refresh();
          alert("Product updated successfully!");
          setLoading(false);
        }
      } else {
        const res = await createProduct(productPayload);
        if (res && !res.success) {
          alert(`Failed to save product: ${res.error || "Unknown error"}`);
          setLoading(false);
        } else {
          router.push("/admin/products");
        }
      }
    } catch (error) {
      console.error("Failed to save product:", error);
      alert("Failed to save product. Check the server logs.");
      setLoading(false);
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
                  onChange={handleNameChange}
                  placeholder="e.g. Mystic Classic Jersey"
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-none focus:outline-none focus:border-slate-900 focus:ring-0 focus:border-slate-900 text-sm"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-900 mb-2">Product Slug *</label>
                <input
                  type="text"
                  value={slug}
                  onChange={(e) => {
                    setSlug(slugify(e.target.value));
                    setIsSlugEdited(true);
                  }}
                  placeholder="e.g. mystic-classic-jersey"
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-none focus:outline-none focus:border-slate-900 focus:ring-0 focus:border-slate-900 text-sm"
                  required
                />
                <p className="text-[11px] text-slate-500 mt-1">Used in URL: /product/{slug || 'slug'}</p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-900 mb-2">Description</label>
                <SimpleRichTextEditor value={description} onChange={setDescription} />
              </div>
            </div>
          </div>

          {/* Card 2: Gallery Images */}
          <div className="bg-white border border-slate-200 rounded-none p-6 shadow-none">
            <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-2">
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Media Gallery</h2>
              <span className={`text-xs font-semibold tabular-nums px-2 py-0.5 rounded bg-slate-100 text-slate-500`}>
                {images.length} / 20
              </span>
            </div>

            <div className="flex flex-col gap-6">
              {images.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6">
                  {images.map((img, idx) => (
                    <div key={idx} className="relative group border border-slate-200 rounded-none overflow-hidden bg-slate-50 shadow-none flex flex-col justify-between">
                      <div className="relative aspect-square w-full">
                        <img src={img.url} alt={`Uploaded ${idx}`} className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => removeImage(idx)}
                          className="absolute top-1 right-1 bg-red-600/80 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600 shadow z-10"
                          title="Remove Image"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <div className="p-2 border-t border-slate-100 bg-white">
                        <label className="block text-[9px] font-bold text-slate-500 uppercase mb-1">Variant Tag</label>
                        <select
                          value={img.boundAttributes?.color ? `color:${img.boundAttributes.color}` : (img.boundAttributes?.size ? `size:${img.boundAttributes.size}` : "All")}
                          onChange={(e) => {
                            const val = e.target.value;
                            if (val === "All") {
                              setImageTag(idx, {});
                            } else {
                              const [type, key] = val.split(":");
                              setImageTag(idx, { [type]: key });
                            }
                          }}
                          className="w-full text-[10px] p-1 border border-slate-200 focus:outline-none focus:border-slate-900 bg-slate-50 font-semibold"
                        >
                          <option value="All">All Variants (No tag)</option>
                          {hasColor && Array.from(new Set(variants.map(v => v.color).filter(c => c && c !== "Default"))).map(col => (
                            <option key={`color:${col}`} value={`color:${col}`}>{mappedAttributes[1]?.name || "Color"}: {col}</option>
                          ))}
                          {hasSize && Array.from(new Set(variants.map(v => v.size).filter(s => s && s !== "Default"))).map(sz => (
                            <option key={`size:${sz}`} value={`size:${sz}`}>{mappedAttributes[0]?.name || "Size"}: {sz}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className={`relative border-2 border-dashed ${images.length >= 20 ? 'border-slate-200 bg-slate-100 cursor-not-allowed' : 'border-slate-300 hover:border-indigo-500 bg-slate-50'} rounded-none p-8 transition-colors text-center flex flex-col items-center justify-center`}>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleImageUpload}
                  disabled={isUploading || images.length >= 20}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
                />
                {isUploading ? (
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-6 h-6 border-2 border-indigo-500/50 border-t-indigo-600 rounded-full animate-spin" />
                    <span className="text-xs text-slate-500 font-medium">Uploading images...</span>
                  </div>
                ) : images.length >= 20 ? (
                  <>
                    <span className="text-sm font-semibold text-slate-500">Maximum of 20 images uploaded</span>
                    <span className="text-xs text-slate-400 mt-1">Remove some images to upload new ones (Max 20 images)</span>
                  </>
                ) : (
                  <>
                    <Plus className="w-8 h-8 text-slate-400 mb-2" />
                    <span className="text-sm font-semibold text-slate-600">Click or drag images to upload</span>
                    <span className="text-xs text-slate-400 mt-1">PNG, JPG up to 500KB • Max 20 images</span>
                  </>
                )}
              </div>
            </div>
          </div>
          {/* Card 3: Combo Settings — left column, shown when isCombo */}
          {isCombo && (
            <div className="bg-white border border-slate-200 rounded-none p-6 shadow-none">
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4 border-b border-slate-100 pb-2">
                Combo Settings
              </h2>
              <div className="space-y-5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Required Items Qty *</label>
                  <input
                    type="number"
                    min={1}
                    value={comboRequiredQty}
                    onChange={(e) => setComboRequiredQty(parseInt(e.target.value) || 1)}
                    className="w-40 px-4 py-2 border border-slate-300 rounded-none focus:outline-none focus:border-slate-900 text-sm font-mono"
                    required
                  />
                </div>
                {/* Selected products preview */}
                {comboChildIds.length > 0 && (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                        Selected Products
                        <span className="ml-2 text-violet-600 font-mono normal-case">{comboChildIds.length} items</span>
                      </label>
                      <span className="text-[10px] text-slate-400">
                        Star = default pre-selected for customer &nbsp;·&nbsp; {comboDefaultChildIds.filter(id => comboChildIds.includes(id)).length}/{comboRequiredQty} defaults set
                      </span>
                    </div>
                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
                      {comboChildIds.map((cid) => {
                        const p = allProducts.find(p => p.id === cid);
                        if (!p) return null;
                        const thumbUrl = p.mediaAssets?.[0]?.url;
                        const isDefault = comboDefaultChildIds.includes(cid);
                        const defaultCount = comboDefaultChildIds.filter(id => comboChildIds.includes(id)).length;
                        return (
                          <div key={cid} className="relative flex flex-col">
                            {/* Image */}
                            <div className={`relative aspect-square w-full overflow-hidden bg-slate-100 border ${isDefault ? 'border-amber-400' : 'border-violet-300'}`}>
                              {thumbUrl ? (
                                <img src={thumbUrl} alt={p.name} className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full bg-slate-100 flex items-center justify-center text-[9px] text-slate-400">No img</div>
                              )}
                              {/* Star badge — default toggle */}
                              <button
                                type="button"
                                title={isDefault ? "Remove default" : "Set as default"}
                                onClick={() => {
                                  if (isDefault) {
                                    setComboDefaultChildIds(comboDefaultChildIds.filter(id => id !== cid));
                                  } else if (defaultCount < comboRequiredQty) {
                                    setComboDefaultChildIds([...comboDefaultChildIds, cid]);
                                  }
                                }}
                                className={`absolute top-1 left-1 w-5 h-5 rounded-full flex items-center justify-center shadow transition-colors ${isDefault ? 'bg-amber-400 text-white' : defaultCount >= comboRequiredQty ? 'bg-white/70 text-slate-300 cursor-not-allowed' : 'bg-white/70 text-slate-400 hover:text-amber-400'}`}
                              >
                                <svg className="w-2.5 h-2.5" viewBox="0 0 24 24" fill={isDefault ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2.5">
                                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                                </svg>
                              </button>
                              {/* Remove button */}
                              <button
                                type="button"
                                onClick={() => {
                                  setComboChildIds(comboChildIds.filter(id => id !== cid));
                                  setComboDefaultChildIds(comboDefaultChildIds.filter(id => id !== cid));
                                }}
                                className="absolute top-1 right-1 w-5 h-5 rounded-full bg-white/80 flex items-center justify-center text-slate-500 hover:text-red-500 hover:bg-white shadow"
                              >
                                <X className="w-2.5 h-2.5" />
                              </button>
                            </div>
                            {/* Name */}
                            <p className={`text-[10px] text-center mt-1 leading-tight line-clamp-2 px-0.5 ${isDefault ? 'text-amber-600 font-semibold' : 'text-violet-600 font-medium'}`}>
                              {p.name}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                    All Products
                  </label>

                  {/* Search + Category filter */}
                  <div className="flex flex-col sm:flex-row gap-2 mb-3">
                    <input
                      type="text"
                      value={comboSearch}
                      onChange={(e) => setComboSearch(e.target.value)}
                      placeholder="Search product..."
                      className="flex-1 px-3 py-1.5 border border-slate-200 text-xs focus:outline-none focus:border-slate-900 bg-white"
                    />
                    <select
                      value={comboFilterCategory}
                      onChange={(e) => setComboFilterCategory(e.target.value)}
                      className="px-3 py-1.5 border border-slate-200 text-xs focus:outline-none focus:border-slate-900 bg-white"
                    >
                      <option value="all">All Categories</option>
                      {Array.from(new Set(allProducts.map(p => p.categoryRel?.name).filter(Boolean))).sort().map(cat => (
                        <option key={cat} value={cat!}>{cat}</option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3 max-h-72 overflow-y-auto pr-1">
                    {allProducts.filter(p => {
                      const matchCat = comboFilterCategory === "all" || p.categoryRel?.name === comboFilterCategory;
                      const matchSearch = !comboSearch.trim() || p.name.toLowerCase().includes(comboSearch.toLowerCase());
                      return matchCat && matchSearch;
                    }).map((p) => {
                      const isChecked = comboChildIds.includes(p.id);
                      const thumbUrl = p.mediaAssets?.[0]?.url;
                      return (
                        <div
                          key={p.id}
                          onClick={() => {
                            if (isChecked) {
                              setComboChildIds(comboChildIds.filter((cid) => cid !== p.id));
                            } else {
                              setComboChildIds([...comboChildIds, p.id]);
                            }
                          }}
                          className={`relative flex flex-col cursor-pointer select-none group transition-all duration-150 ${isChecked ? '' : 'opacity-60 hover:opacity-100'}`}
                        >
                          <div className={`relative aspect-square w-full overflow-hidden bg-slate-100 border transition-all ${isChecked ? 'border-violet-500' : 'border-slate-200 group-hover:border-slate-400'}`}>
                            {thumbUrl ? (
                              <img src={thumbUrl} alt={p.name} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full bg-slate-100 flex items-center justify-center text-[9px] text-slate-400">No img</div>
                            )}
                            {isChecked && (
                              <div className="absolute top-1 right-1 w-5 h-5 rounded-full bg-violet-600 flex items-center justify-center shadow">
                                <svg className="w-2.5 h-2.5 text-white stroke-current" viewBox="0 0 24 24" fill="none" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                  <polyline points="20 6 9 17 4 12" />
                                </svg>
                              </div>
                            )}
                          </div>
                          <p className={`text-[10px] text-center mt-1 leading-tight line-clamp-2 px-0.5 ${isChecked ? 'text-violet-700 font-semibold' : 'text-slate-500'}`}>
                            {p.name}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}

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

              <div className="flex flex-col gap-2 p-2 rounded-none">
                <div className="flex items-center gap-3">
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
                {isFeatured && (
                  <div className="ml-8 flex flex-col gap-1">
                    <label className="text-[10px] font-semibold text-amber-800 uppercase tracking-wider">
                      Display Order
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={featuredOrder}
                      onChange={(e) => setFeaturedOrder(Number(e.target.value))}
                      className="w-24 border border-amber-300 bg-amber-50 text-amber-900 text-sm px-2 py-1 focus:outline-none focus:ring-1 focus:ring-amber-500"
                      placeholder="0"
                    />
                    <span className="text-[10px] text-amber-600">1 = first, 2 = second... 0 = last</span>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-3 p-2 rounded-none">
                <input
                  type="checkbox"
                  id="isCustomize"
                  checked={isCustomize}
                  onChange={(e) => setIsCustomize(e.target.checked)}
                  className="w-5 h-5 text-[#800020] border-[#800020]/30 rounded focus:ring-[#800020] cursor-pointer shrink-0"
                />
                <label htmlFor="isCustomize" className="flex flex-col cursor-pointer select-none">
                  <span className="text-sm font-bold text-[#800020]">Offer Customization (DTF Print)</span>
                  <span className="text-[10px] text-zinc-500 font-medium">Allow customers to add their custom Info on product.</span>
                </label>
              </div>

              <div className="flex items-center gap-3 p-2 rounded-none">
                <input
                  type="checkbox"
                  id="trackStock"
                  checked={trackStock}
                  onChange={(e) => setTrackStock(e.target.checked)}
                  className="w-5 h-5 text-indigo-600 border-indigo-300 rounded focus:ring-indigo-500 cursor-pointer shrink-0"
                />
                <label htmlFor="trackStock" className="flex flex-col cursor-pointer select-none">
                  <span className="text-sm font-bold text-indigo-900">Track Stock</span>
                  <span className="text-[10px] text-zinc-500 font-medium">Validate stock availability on storefront and during checkout.</span>
                </label>
              </div>

              <div className="flex items-center gap-3 p-2 rounded-none">
                <input
                  type="checkbox"
                  id="isCombo"
                  checked={isCombo}
                  onChange={(e) => {
                    setIsCombo(e.target.checked);
                    if (e.target.checked) {
                      setHasSize(false);
                      setHasColor(false);
                      setVariants([]);
                    }
                  }}
                  className="w-5 h-5 text-violet-600 border-violet-300 rounded focus:ring-violet-500 cursor-pointer shrink-0"
                />
                <label htmlFor="isCombo" className="flex flex-col cursor-pointer select-none">
                  <span className="text-sm font-bold text-violet-900">Is Combo / Box Set</span>
                  <span className="text-[10px] text-zinc-500 font-medium">Allow customers to select multiple child items.</span>
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
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">Brand</label>
                  {!isAddingBrand && (
                    <button
                      type="button"
                      onClick={() => setIsAddingBrand(true)}
                      className="text-[10px] font-bold text-[#800020] hover:underline flex items-center gap-0.5"
                    >
                      <Plus className="w-3 h-3" /> Add New
                    </button>
                  )}
                </div>
                {isAddingBrand ? (
                  <div className="flex gap-2 items-center bg-slate-50 p-2 border border-slate-200">
                    <input
                      type="text"
                      value={newBrandName}
                      onChange={(e) => setNewBrandName(e.target.value)}
                      placeholder="Enter brand name..."
                      className="flex-1 px-3 py-1.5 border border-slate-300 rounded-none focus:outline-none focus:border-slate-900 text-xs bg-white"
                      disabled={brandSubmitting}
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={handleAddBrandInline}
                      disabled={brandSubmitting || !newBrandName.trim()}
                      className="px-3 py-1.5 bg-[#800020] text-white text-xs font-bold rounded-none hover:bg-opacity-95 transition-all disabled:opacity-50"
                    >
                      {brandSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Save"}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsAddingBrand(false);
                        setNewBrandName("");
                      }}
                      disabled={brandSubmitting}
                      className="p-1.5 bg-slate-200 text-slate-700 hover:bg-slate-300 transition-colors rounded-none"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <CustomFormSelect
                    options={[
                      { value: "", label: "No Brand" },
                      ...localBrands.map((b) => ({ value: b.id, label: b.name })),
                    ]}
                    value={brandId}
                    onChange={(val) => setBrandId(val)}
                    placeholder="No Brand"
                    searchable={true}
                  />
                )}
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">Category *</label>
                  {!isAddingCategory && (
                    <button
                      type="button"
                      onClick={() => setIsAddingCategory(true)}
                      className="text-[10px] font-bold text-[#800020] hover:underline flex items-center gap-0.5"
                    >
                      <Plus className="w-3 h-3" /> Add New
                    </button>
                  )}
                </div>
                {isAddingCategory ? (
                  <div className="flex gap-2 items-center bg-slate-50 p-2 border border-slate-200">
                    <input
                      type="text"
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                      placeholder="Enter category name..."
                      className="flex-1 px-3 py-1.5 border border-slate-300 rounded-none focus:outline-none focus:border-slate-900 text-xs bg-white"
                      disabled={categorySubmitting}
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={handleAddCategoryInline}
                      disabled={categorySubmitting || !newCategoryName.trim()}
                      className="px-3 py-1.5 bg-[#800020] text-white text-xs font-bold rounded-none hover:bg-opacity-95 transition-all disabled:opacity-50"
                    >
                      {categorySubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Save"}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsAddingCategory(false);
                        setNewCategoryName("");
                      }}
                      disabled={categorySubmitting}
                      className="p-1.5 bg-slate-200 text-slate-700 hover:bg-slate-300 transition-colors rounded-none"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <CustomFormSelect
                    options={[
                      { value: "", label: "Select Category" },
                      ...localCategories.map((c) => ({ value: c.id, label: c.name })),
                    ]}
                    value={categoryId}
                    onChange={(val) => {
                      setCategoryId(val);
                      setSubcategoryId("");
                    }}
                    placeholder="Select Category"
                    searchable={true}
                  />
                )}
              </div>

              {categoryId && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">Subcategory</label>
                    {!isAddingSubcategory && (
                      <button
                        type="button"
                        onClick={() => setIsAddingSubcategory(true)}
                        className="text-[10px] font-bold text-[#800020] hover:underline flex items-center gap-0.5"
                      >
                        <Plus className="w-3 h-3" /> Add New
                      </button>
                    )}
                  </div>
                  {isAddingSubcategory ? (
                    <div className="flex gap-2 items-center bg-slate-50 p-2 border border-slate-200">
                      <input
                        type="text"
                        value={newSubcategoryName}
                        onChange={(e) => setNewSubcategoryName(e.target.value)}
                        placeholder="Enter subcategory name..."
                        className="flex-1 px-3 py-1.5 border border-slate-300 rounded-none focus:outline-none focus:border-slate-900 text-xs bg-white"
                        disabled={subcategorySubmitting}
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={handleAddSubcategoryInline}
                        disabled={subcategorySubmitting || !newSubcategoryName.trim()}
                        className="px-3 py-1.5 bg-[#800020] text-white text-xs font-bold rounded-none hover:bg-opacity-95 transition-all disabled:opacity-50"
                      >
                        {subcategorySubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Save"}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setIsAddingSubcategory(false);
                          setNewSubcategoryName("");
                        }}
                        disabled={subcategorySubmitting}
                        className="p-1.5 bg-slate-200 text-slate-700 hover:bg-slate-300 transition-colors rounded-none"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <CustomFormSelect
                      options={[
                        { value: "", label: "None" },
                        ...(localCategories.find((c: any) => c.id === categoryId)?.subcategories || []).map((sc: any) => ({ value: sc.id, label: sc.name })),
                      ]}
                      value={subcategoryId}
                      onChange={(val) => setSubcategoryId(val)}
                      placeholder="None"
                      searchable={true}
                    />
                  )}
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Size Chart Reference</label>
                <CustomFormSelect
                  options={[
                    { value: "", label: "None Assigned (Ad-hoc sizing)" },
                    ...sizeCharts.map(chart => ({ value: chart.id, label: chart.category })),
                  ]}
                  value={sizeChartId}
                  onChange={(val) => setSizeChartId(val)}
                  placeholder="None Assigned (Ad-hoc sizing)"
                  searchable={true}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Discount</label>
                <CustomFormSelect
                  options={[
                    { value: "", label: "No Active Promotion" },
                    ...discounts.map(disc => ({
                      value: disc.id,
                      label: `${disc.name} (${disc.discountType === "PERCENTAGE" ? `${disc.value}% OFF` : `৳${disc.value} OFF`})`
                    })),
                  ]}
                  value={discountId}
                  onChange={(val) => setDiscountId(val)}
                  placeholder="No Active Promotion"
                  searchable={true}
                />
              </div>
            </div>
          </div>


        </div>
      </div>
      {/* Card 5: Size Variants & Stock */}
      <div className="bg-white border border-slate-200 rounded-none p-6 shadow-none">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4 border-b border-slate-100 pb-3">
          <div className="flex flex-col gap-1">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
              {(!hasSize && !hasColor)
                ? "Pricing & Inventory (Simple Product)"
                : mappedAttributes.length > 0
                  ? `${mappedAttributes.map(a => a.name).join(" & ")} Variants & Stock`
                  : "Size Variants & Stock"
              }
            </h2>
            {initialData?.id ? (
              <span className="text-[9px] font-bold text-orange-600 bg-orange-50 border border-orange-100 px-2 py-1 rounded-none w-fit">
                🔒 Stock managed by Purchases & Orders
              </span>
            ) : (
              <span className="text-[10px] text-slate-500 font-medium">Configure options, inventory levels and custom price</span>
            )}
          </div>

          {!isCombo && (
            <div className="flex flex-wrap items-center gap-6">
              {(!mappedAttributes || mappedAttributes.length === 0 || mappedAttributes[0]) && (
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="hasSize"
                    checked={hasSize}
                    onChange={(e) => {
                      setHasSize(e.target.checked);
                      if (!e.target.checked && !hasColor) {
                        setVariants([]);
                      }
                    }}
                    className="w-4 h-4 text-[#800020] border-slate-300 rounded focus:ring-[#800020] cursor-pointer"
                  />
                  <label htmlFor="hasSize" className="text-xs font-bold text-slate-700 cursor-pointer select-none">
                    Enable {mappedAttributes[0]?.name || "Sizes"}
                  </label>
                </div>
              )}

              {(!mappedAttributes || mappedAttributes.length === 0 || mappedAttributes[1]) && (
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="hasColor"
                    checked={hasColor}
                    onChange={(e) => {
                      setHasColor(e.target.checked);
                      if (!hasSize && !e.target.checked) {
                        setVariants([]);
                      }
                    }}
                    className="w-4 h-4 text-[#800020] border-slate-300 rounded focus:ring-[#800020] cursor-pointer"
                  />
                  <label htmlFor="hasColor" className="text-xs font-bold text-slate-700 cursor-pointer select-none">
                    Enable {mappedAttributes[1]?.name || "Colors"}
                  </label>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Option A: Simple Product (No variants) */}
        {!hasSize && !hasColor ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Product SKU</label>
              <input
                type="text"
                value={simpleSku}
                onChange={(e) => setSimpleSku(e.target.value)}
                placeholder="e.g. MTS-CLASSIC-JERSEY"
                className="w-full px-4 py-2 border border-slate-300 rounded-none focus:outline-none focus:border-slate-900 text-sm font-mono uppercase"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Initial Stock</label>
              {initialData?.id ? (
                <input
                  type="number"
                  value={simpleStock}
                  readOnly
                  className="w-full px-4 py-2 border border-slate-200 bg-slate-50 rounded-none text-sm font-mono cursor-not-allowed text-slate-500"
                />
              ) : (
                <input
                  type="number"
                  min="0"
                  value={simpleStock}
                  onChange={(e) => setSimpleStock(e.target.value)}
                  placeholder="0"
                  className="w-full px-4 py-2 border border-slate-300 rounded-none focus:outline-none focus:border-slate-900 text-sm font-mono"
                />
              )}
            </div>
          </div>
        ) : (
          /* Option B: Product with Size or Color Variants */
          <div className="space-y-6">
            {/* Batch Generator Panel */}
            <div className="bg-slate-50 border border-slate-200 p-4 space-y-4">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider font-semibold">Quick Variant Builder</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Size / Attribute 1 Tags Trigger & Preview */}
                {hasSize && (
                  <div className="space-y-2">
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Select {mappedAttributes[0]?.name || "Sizes"}
                    </label>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setIsSizeModalOpen(true)}
                        className="px-4 py-2 bg-white border border-slate-300 hover:border-slate-800 text-xs font-bold transition-all flex items-center gap-2"
                      >
                        Choose {mappedAttributes[0]?.name || "Sizes"}
                        <span className="bg-slate-100 text-slate-800 px-2 py-0.5 rounded-full text-[10px] font-mono">
                          {selectedSizes.length}
                        </span>
                      </button>
                      {selectedSizes.length > 0 && (
                        <button
                          type="button"
                          onClick={() => setSelectedSizes([])}
                          className="text-xs text-slate-500 hover:text-red-650 transition-colors"
                        >
                          Clear
                        </button>
                      )}
                    </div>
                    {selectedSizes.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-2 max-h-[100px] overflow-y-auto p-2 bg-white border border-slate-200">
                        {selectedSizes.map(sz => (
                          <span key={sz} className="inline-flex items-center gap-1 bg-[#800020]/10 text-[#800020] px-2 py-0.5 text-xs font-semibold">
                            {sz}
                            <button
                              type="button"
                              onClick={() => setSelectedSizes(selectedSizes.filter(s => s !== sz))}
                              className="hover:text-red-700 text-[10px] font-bold"
                            >
                              ×
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Color / Attribute 2 Tags Trigger & Preview */}
                {hasColor && (
                  <div className="space-y-2">
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Select {mappedAttributes[1]?.name || "Colors"}
                    </label>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setIsColorModalOpen(true)}
                        className="px-4 py-2 bg-white border border-slate-300 hover:border-slate-800 text-xs font-bold transition-all flex items-center gap-2"
                      >
                        Choose {mappedAttributes[1]?.name || "Colors"}
                        <span className="bg-slate-100 text-slate-800 px-2 py-0.5 rounded-full text-[10px] font-mono">
                          {selectedColors.length}
                        </span>
                      </button>
                      {selectedColors.length > 0 && (
                        <button
                          type="button"
                          onClick={() => setSelectedColors([])}
                          className="text-xs text-slate-500 hover:text-red-650 transition-colors"
                        >
                          Clear
                        </button>
                      )}
                    </div>
                    {selectedColors.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-2 max-h-[100px] overflow-y-auto p-2 bg-white border border-slate-200">
                        {selectedColors.map(col => (
                          <span key={col} className="inline-flex items-center gap-1 bg-[#800020]/10 text-[#800020] px-2 py-0.5 text-xs font-semibold">
                            {col}
                            <button
                              type="button"
                              onClick={() => setSelectedColors(selectedColors.filter(c => c !== col))}
                              className="hover:text-red-700 text-[10px] font-bold"
                            >
                              ×
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Generate Trigger */}
              <div className="pt-2 border-t border-slate-200 flex justify-between items-center">
                <p className="text-[11px] text-slate-500 font-medium">
                  Generates all combinations of the selected options.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    const defaultPrice = price ? parseFloat(price) : 0;
                    const newVariants: any[] = [];
                    const sizes = hasSize ? (selectedSizes.length > 0 ? selectedSizes : ["Default"]) : ["Default"];
                    const colors = hasColor ? (selectedColors.length > 0 ? selectedColors : ["Default"]) : ["Default"];

                    let index = 0;
                    for (const size of sizes) {
                      for (const color of colors) {
                        newVariants.push({
                          id: String(Date.now() + index++),
                          size: size.toUpperCase(),
                          color: color,
                          colorCode: "",
                          sku: generateSKUCode({
                            brandName: localBrands?.find(b => b.id === brandId)?.name,
                            categoryName: localCategories?.find(c => c.id === categoryId)?.name,
                            productName: name,
                            color,
                            size
                          }),
                          stock: 0,
                          price: defaultPrice
                        });
                      }
                    }
                    setVariants(newVariants);
                  }}
                  className="px-4 py-2 bg-[#800020] text-white hover:bg-opacity-90 text-xs font-bold uppercase tracking-wider"
                >
                  Generate Variant Grid ({hasSize ? (selectedSizes.length || 1) : 1} × {hasColor ? (selectedColors.length || 1) : 1})
                </button>
              </div>
            </div>

            {/* Checkbox for custom unit prices */}
            <div className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-200 mb-4">
              <input
                type="checkbox"
                id="useDifferentPrices"
                checked={useDifferentPrices}
                onChange={(e) => setUseDifferentPrices(e.target.checked)}
                className="w-4 h-4 text-[#800020] border-slate-300 rounded focus:ring-[#800020] cursor-pointer"
              />
              <label htmlFor="useDifferentPrices" className="flex flex-col cursor-pointer select-none">
                <span className="text-xs font-bold text-slate-900">Use different unit price for variants</span>
                <span className="text-[10px] text-slate-500 font-medium">Enable custom price inputs for each variant row. Otherwise, they will default to the main Selling Price.</span>
              </label>
            </div>

            {/* Variants Grid Table */}
            <div className="overflow-hidden border border-slate-200 rounded-none">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="w-8 py-2 text-center"></th>
                    {hasSize && <th className="px-3 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">{mappedAttributes[0]?.name || "Size"}</th>}
                    {hasColor && <th className="px-3 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">{mappedAttributes[1]?.name || "Color"}</th>}
                    <th className="px-3 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">SKU</th>
                    <th className="px-3 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">Salling Price (৳)</th>
                    <th className="px-3 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">Stock</th>
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
                      {hasSize && (
                        <td className="px-3 py-2">
                          <input
                            type="text"
                            value={v.size}
                            onChange={(e) => updateVariant(v.id, "size", e.target.value.toUpperCase())}
                            placeholder={`e.g. ${mappedAttributes[0]?.name || "Size"}`}
                            className="w-full px-2 py-1.5 border border-slate-200 rounded-none text-xs focus:outline-none focus:border-slate-900 uppercase font-semibold"
                            required
                          />
                        </td>
                      )}
                      {hasColor && (
                        <td className="px-3 py-2">
                          <input
                            type="text"
                            value={v.color}
                            onChange={(e) => updateVariant(v.id, "color", e.target.value)}
                            placeholder={`e.g. ${mappedAttributes[1]?.name || "Color"}`}
                            className="w-full px-2 py-1.5 border border-slate-200 rounded-none text-xs focus:outline-none focus:border-slate-900 font-semibold"
                            required
                          />
                        </td>
                      )}
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
                        <input
                          type="number"
                          value={useDifferentPrices ? (v.price ?? (price ? parseFloat(price) : 0)) : (price ? parseFloat(price) : 0)}
                          onChange={(e) => updateVariant(v.id, "price", parseFloat(e.target.value) || 0)}
                          placeholder="Price"
                          disabled={!useDifferentPrices}
                          className="w-full px-2 py-1.5 border border-slate-200 rounded-none text-xs focus:outline-none focus:border-slate-900 font-mono disabled:bg-slate-50 disabled:text-slate-500 disabled:cursor-not-allowed"
                          required
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
                  Add {mappedAttributes[0]?.name || "Size"} Row
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Lightbox Modals for Sizes / Attribute 1 Selection */}
      {isSizeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm transition-all duration-300">
          <div className="bg-white border border-slate-200 shadow-2xl max-w-lg w-full p-6 space-y-4 rounded-none relative animate-in fade-in-50 zoom-in-95 duration-150">
            <button
              type="button"
              onClick={() => setIsSizeModalOpen(false)}
              className="absolute top-4 right-4 p-1.5 hover:bg-slate-100 text-slate-500 hover:text-slate-950 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div>
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                Choose {mappedAttributes[0]?.name || "Sizes"}
              </h3>
              <p className="text-xs text-slate-500">Select from presets or add custom options for your product variants.</p>
            </div>

            <div className="space-y-4">
              {/* Presets */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Presets</label>
                  <button
                    type="button"
                    onClick={() => {
                      const allSelected = Array.from(new Set([...selectedSizes, ...sizeOptions]));
                      setSelectedSizes(allSelected);
                    }}
                    className="text-[10px] font-bold text-[#800020] hover:underline uppercase tracking-wider"
                  >
                    Select All
                  </button>
                </div>
                <div className="flex flex-wrap gap-2 max-h-[150px] overflow-y-auto p-1 border border-slate-100 bg-slate-50">
                  {sizeOptions.map(sz => {
                    const isSelected = selectedSizes.includes(sz);
                    return (
                      <button
                        key={sz}
                        type="button"
                        onClick={() => {
                          if (isSelected) setSelectedSizes(selectedSizes.filter(s => s !== sz));
                          else setSelectedSizes([...selectedSizes, sz]);
                        }}
                        className={`px-3 py-1.5 text-xs font-semibold border transition-all ${isSelected
                            ? "bg-[#800020] text-white border-[#800020]"
                            : "bg-white text-slate-700 border-slate-300 hover:bg-slate-100 hover:border-slate-400"
                          }`}
                      >
                        {sz}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Custom entry */}
              <div className="space-y-2">
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Add Custom Value</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={customSizeInput}
                    onChange={(e) => setCustomSizeInput(e.target.value)}
                    placeholder={`e.g. 5ml, Large, Red/White`}
                    className="px-3 py-2 border border-slate-300 text-sm focus:outline-none focus:border-slate-900 flex-1 bg-white"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        if (customSizeInput.trim() && !selectedSizes.includes(customSizeInput.trim())) {
                          setSelectedSizes([...selectedSizes, customSizeInput.trim()]);
                          setCustomSizeInput("");
                        }
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (customSizeInput.trim() && !selectedSizes.includes(customSizeInput.trim())) {
                        setSelectedSizes([...selectedSizes, customSizeInput.trim()]);
                        setCustomSizeInput("");
                      }
                    }}
                    className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold uppercase tracking-wider"
                  >
                    Add
                  </button>
                </div>
              </div>

              {/* Active Selection Summary */}
              {selectedSizes.length > 0 && (
                <div className="space-y-2">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Selected ({selectedSizes.length})</label>
                  <div className="flex flex-wrap gap-1.5 p-2 bg-slate-50 border border-slate-200 max-h-[100px] overflow-y-auto">
                    {selectedSizes.map(sz => (
                      <span key={sz} className="inline-flex items-center gap-1 bg-[#800020] text-white px-2 py-0.5 text-xs font-semibold">
                        {sz}
                        <button
                          type="button"
                          onClick={() => setSelectedSizes(selectedSizes.filter(s => s !== sz))}
                          className="hover:text-red-200 text-[10px] font-bold ml-1"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="pt-4 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={() => setIsSizeModalOpen(false)}
                className="px-4 py-2 bg-slate-900 text-white hover:bg-slate-800 text-xs font-bold uppercase tracking-wider"
              >
                Apply Selection
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lightbox Modals for Colors / Attribute 2 Selection */}
      {isColorModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm transition-all duration-300">
          <div className="bg-white border border-slate-200 shadow-2xl max-w-lg w-full p-6 space-y-4 rounded-none relative animate-in fade-in-50 zoom-in-95 duration-150">
            <button
              type="button"
              onClick={() => setIsColorModalOpen(false)}
              className="absolute top-4 right-4 p-1.5 hover:bg-slate-100 text-slate-500 hover:text-slate-950 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div>
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                Choose {mappedAttributes[1]?.name || "Colors"}
              </h3>
              <p className="text-xs text-slate-500">Select from presets or add custom options for your product variants.</p>
            </div>

            <div className="space-y-4">
              {/* Presets */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Presets</label>
                  <button
                    type="button"
                    onClick={() => {
                      const allSelected = Array.from(new Set([...selectedColors, ...colorOptions]));
                      setSelectedColors(allSelected);
                    }}
                    className="text-[10px] font-bold text-[#800020] hover:underline uppercase tracking-wider"
                  >
                    Select All
                  </button>
                </div>
                <div className="flex flex-wrap gap-2 max-h-[150px] overflow-y-auto p-1 border border-slate-100 bg-slate-50">
                  {colorOptions.map(col => {
                    const isSelected = selectedColors.includes(col);
                    return (
                      <button
                        key={col}
                        type="button"
                        onClick={() => {
                          if (isSelected) setSelectedColors(selectedColors.filter(c => c !== col));
                          else setSelectedColors([...selectedColors, col]);
                        }}
                        className={`px-3 py-1.5 text-xs font-semibold border transition-all ${isSelected
                            ? "bg-[#800020] text-white border-[#800020]"
                            : "bg-white text-slate-700 border-slate-300 hover:bg-slate-100 hover:border-slate-400"
                          }`}
                      >
                        {col}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Custom entry */}
              <div className="space-y-2">
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Add Custom Value</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={customColorInput}
                    onChange={(e) => setCustomColorInput(e.target.value)}
                    placeholder={`e.g. Red, Blue, Cotton`}
                    className="px-3 py-2 border border-slate-300 text-sm focus:outline-none focus:border-slate-900 flex-1 bg-white"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        if (customColorInput.trim() && !selectedColors.includes(customColorInput.trim())) {
                          setSelectedColors([...selectedColors, customColorInput.trim()]);
                          setCustomColorInput("");
                        }
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (customColorInput.trim() && !selectedColors.includes(customColorInput.trim())) {
                        setSelectedColors([...selectedColors, customColorInput.trim()]);
                        setCustomColorInput("");
                      }
                    }}
                    className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold uppercase tracking-wider"
                  >
                    Add
                  </button>
                </div>
              </div>

              {/* Active Selection Summary */}
              {selectedColors.length > 0 && (
                <div className="space-y-2">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Selected ({selectedColors.length})</label>
                  <div className="flex flex-wrap gap-1.5 p-2 bg-slate-50 border border-slate-200 max-h-[100px] overflow-y-auto">
                    {selectedColors.map(col => (
                      <span key={col} className="inline-flex items-center gap-1 bg-[#800020] text-white px-2 py-0.5 text-xs font-semibold">
                        {col}
                        <button
                          type="button"
                          onClick={() => setSelectedColors(selectedColors.filter(c => c !== col))}
                          className="hover:text-red-200 text-[10px] font-bold ml-1"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="pt-4 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={() => setIsColorModalOpen(false)}
                className="px-4 py-2 bg-slate-900 text-white hover:bg-slate-800 text-xs font-bold uppercase tracking-wider"
              >
                Apply Selection
              </button>
            </div>
          </div>
        </div>
      )}
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

interface FormOption {
  value: string;
  label: string;
}

interface CustomFormSelectProps {
  options: FormOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  searchable?: boolean;
}

function CustomFormSelect({
  options,
  value,
  onChange,
  placeholder = "Select Option",
  searchable = false
}: CustomFormSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((opt) => opt.value === value);

  const filteredOptions = options.filter((opt) =>
    opt.label.toLowerCase().includes(search.toLowerCase())
  );

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative w-full" ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full h-[38px] flex items-center justify-between px-4 py-2 border border-slate-300 rounded-none bg-white text-sm focus:outline-none focus:border-slate-900 text-slate-800"
      >
        <span className="truncate">{selectedOption ? selectedOption.label : placeholder}</span>
        <ChevronDown className={`w-4 h-4 text-slate-500 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {isOpen && (
        <div className="absolute left-0 right-0 z-50 mt-1 bg-white border border-slate-300 rounded-none shadow-none max-h-60 overflow-hidden flex flex-col">
          {searchable && (
            <div className="p-2 border-b border-slate-200 bg-slate-50">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search..."
                className="w-full px-2.5 py-1 border border-slate-300 rounded-none focus:outline-none focus:border-slate-900 text-xs bg-white"
                autoFocus
              />
            </div>
          )}
          <div className="overflow-y-auto max-h-48 custom-scrollbar">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    onChange(opt.value);
                    setIsOpen(false);
                    setSearch("");
                  }}
                  className={`w-full text-left px-4 py-2 text-xs transition-colors flex items-center justify-between ${value === opt.value
                    ? "bg-[#800020] text-white font-bold"
                    : "hover:bg-slate-100 text-slate-700"
                    }`}
                >
                  <span>{opt.label}</span>
                </button>
              ))
            ) : (
              <div className="px-4 py-3 text-center text-xs text-slate-400 italic">
                No options found
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
