"use client";

import Image from "next/image";
import UploadedImage from "@/components/UploadedImage";
import { useState, useEffect, useRef } from "react";
import { useCartStore } from "@/store/cartStore";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatBDT, roundPrice } from "@/utils/formatPrice";
import ProductCard from "@/components/ProductCard";

import { ShoppingCart, ShoppingBag, Plus, Minus, ChevronLeft, ChevronRight, Play } from "lucide-react";
import Breadcrumb from "@/components/Breadcrumb";

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  images: string[];
  team: string;
  category: string;
  isCustomize?: boolean | null;
  trackStock?: boolean;
  isCombo?: boolean;
  comboRequiredQty?: number;
  mediaAssets?: { url: string; boundAttributes?: any }[];
  variants: {
    id: string;
    size: string;
    color: string;
    sku?: string;
    stock: number;
    price?: number;
  }[];
  discount?: {
    active: boolean;
    discountType: "PERCENTAGE" | "FLAT";
    value: number;
  } | null;
  categoryRel?: any;
  comboChildOptions?: {
    id: string;
    parentProductId: string;
    childProductId: string;
    maxQuantity: number;
    isDefault?: boolean;
    childProduct: {
      id: string;
      name: string;
      description: string;
      price: number;
      images: string[];
      team: string;
      category: string;
      trackStock?: boolean;
      variants: {
        id: string;
        size: string;
        color: string;
        stock: number;
        price?: number;
      }[];
    };
  }[];
}

export default function ProductClient({ product, sizeChartData, relatedProducts }: { product: Product, sizeChartData?: any, relatedProducts?: any[] }) {
  const router = useRouter();

  // Combo states — initialize with admin-set defaults
  const [selectedComboItems, setSelectedComboItems] = useState<{ productId: string; name: string; quantity: number }[]>(() => {
    if (!product.isCombo || !product.comboChildOptions) return [];
    return product.comboChildOptions
      .filter(o => o.isDefault)
      .map(o => ({ productId: o.childProduct.id, name: o.childProduct.name, quantity: 1 }));
  });
  const totalSelectedComboQty = selectedComboItems.reduce((sum, item) => sum + item.quantity, 0);

  const getChildStock = (childProduct: any) => {
    if (!childProduct.trackStock) return Infinity;
    return childProduct.variants?.reduce((sum: number, v: any) => sum + (v.stock ?? 0), 0) ?? 0;
  };

  const handleAddChild = (productId: string, name: string) => {
    setSelectedComboItems(prev => {
      const existing = prev.find(item => item.productId === productId);
      if (existing) return prev;
      return [...prev, { productId, name, quantity: 1 }];
    });
  };

  const handleRemoveChild = (productId: string) => {
    setSelectedComboItems(prev => prev.filter(item => item.productId !== productId));
  };

  const handleIncrementChild = (productId: string) => {
    setSelectedComboItems(prev => prev.map(item => 
      item.productId === productId ? { ...item, quantity: item.quantity + 1 } : item
    ));
  };

  const handleDecrementChild = (productId: string) => {
    setSelectedComboItems(prev => {
      const existing = prev.find(item => item.productId === productId);
      if (existing && existing.quantity > 1) {
        return prev.map(item => 
          item.productId === productId ? { ...item, quantity: item.quantity - 1 } : item
        );
      }
      return prev.filter(item => item.productId !== productId);
    });
  };

  // Dynamic variant names based on PIM category attribute mapping
  const sizeAttributeName = product.categoryRel?.attributeMappings?.[0]?.attribute?.name || "Size";
  const colorAttributeName = product.categoryRel?.attributeMappings?.[1]?.attribute?.name || "Color";
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const selectedImage = product.images[selectedImageIndex] || "";

  const [isZoomed, setIsZoomed] = useState(false);
  const [zoomOrigin, setZoomOrigin] = useState({ x: 50, y: 50 });

  const thumbnailScrollRef = useRef<HTMLDivElement>(null);
  const thumbnailRefs = useRef<(HTMLButtonElement | null)[]>([]);

  useEffect(() => {
    const activeThumb = thumbnailRefs.current[selectedImageIndex];
    if (activeThumb && thumbnailScrollRef.current) {
      activeThumb.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
  }, [selectedImageIndex]);

  const handleImageMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setZoomOrigin({ x, y });
  };

  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [addedEffect, setAddedEffect] = useState(false);

  const addItem = useCartStore((state) => state.addItem);

  const handlePrevImage = () => {
    setSelectedImageIndex((prev) => (prev > 0 ? prev - 1 : product.images.length - 1));
  };

  const handleNextImage = () => {
    setSelectedImageIndex((prev) => (prev < product.images.length - 1 ? prev + 1 : 0));
  };

  // Determine if product is size-less (e.g. only contains size "Default" or "-")
  const isSizeLess = product.variants.length === 0 ||
    (product.variants.length === 1 &&
      (product.variants[0].size.toLowerCase() === "default" ||
        product.variants[0].size === "-" ||
        product.variants[0].size === ""));

  // Unique sizes list
  const uniqueSizes = Array.from(new Set(product.variants.map((v) => v.size)));

  // Auto-select size on mount if it's size-less or if it is a combo product
  useEffect(() => {
    if (product.isCombo) {
      setSelectedSize("Default");
      setSelectedColor("Default");
    } else if (product.variants.length > 0) {
      if (isSizeLess) {
        setSelectedSize(product.variants[0].size);
      }
    }
  }, [product.variants, isSizeLess, product.isCombo]);

  // Unique colors list
  const availableColors = Array.from(
    new Set(
      product.variants
        .map((v) => v.color)
        .filter((c) => c && c.toLowerCase() !== "default" && c.toLowerCase() !== "all" && c.toLowerCase() !== "")
    )
  );

  // Auto-select color on mount if there's only one option
  useEffect(() => {
    if (availableColors.length === 1) {
      setSelectedColor(availableColors[0]);
    }
  }, [availableColors]);

  const isColorSelectionRequired = availableColors.length > 0;
  const isSelectionComplete = product.isCombo
    ? (totalSelectedComboQty === (product.comboRequiredQty ?? 0))
    : (!!selectedSize && (!isColorSelectionRequired || !!selectedColor));

  const getButtonText = () => {
    if (addedEffect) return 'Added To Cart';
    if (product.isCombo) {
      const required = product.comboRequiredQty ?? 0;
      if (totalSelectedComboQty < required) {
        return `Select ${required - totalSelectedComboQty} More Item${required - totalSelectedComboQty > 1 ? 's' : ''}`;
      }
      if (totalSelectedComboQty > required) {
        return `Remove ${totalSelectedComboQty - required} Item${totalSelectedComboQty - required > 1 ? 's' : ''}`;
      }
      return 'Add To Cart';
    }
    if (!selectedSize && isColorSelectionRequired && !selectedColor) {
      return `Select ${sizeAttributeName} & ${colorAttributeName}`;
    }
    if (!selectedSize) {
      return `Select ${sizeAttributeName}`;
    }
    if (isColorSelectionRequired && !selectedColor) {
      return `Select ${colorAttributeName}`;
    }
    return 'Add To Cart';
  };

  const syncImageFromAttributes = (color: string | null, size: string | null) => {
    if (!product.mediaAssets) return;
    // 1. Try to match both color and size (if both are selected and have tags)
    if (color && size) {
      const idx = product.mediaAssets.findIndex(
        (asset) =>
          asset.boundAttributes &&
          typeof asset.boundAttributes === "object" &&
          asset.boundAttributes.color === color &&
          asset.boundAttributes.size === size
      );
      if (idx !== -1) {
        setSelectedImageIndex(idx);
        return;
      }
    }

    // 2. Try to match color only
    if (color) {
      const idx = product.mediaAssets.findIndex(
        (asset) =>
          asset.boundAttributes &&
          typeof asset.boundAttributes === "object" &&
          asset.boundAttributes.color === color
      );
      if (idx !== -1) {
        setSelectedImageIndex(idx);
        return;
      }
    }

    // 3. Try to match size only
    if (size) {
      const idx = product.mediaAssets.findIndex(
        (asset) =>
          asset.boundAttributes &&
          typeof asset.boundAttributes === "object" &&
          asset.boundAttributes.size === size
      );
      if (idx !== -1) {
        setSelectedImageIndex(idx);
        return;
      }
    }
  };

  const handleColorSelect = (color: string) => {
    setSelectedColor(color);
    syncImageFromAttributes(color, selectedSize);
  };

  const handleSizeSelect = (size: string) => {
    setSelectedSize(size);
    setQuantity(1);
    syncImageFromAttributes(selectedColor, size);
  };

  const handleThumbnailClick = (idx: number) => {
    setSelectedImageIndex(idx);
    const asset = product.mediaAssets?.[idx];
    if (asset && asset.boundAttributes && typeof asset.boundAttributes === "object") {
      const colorTag = asset.boundAttributes.color;
      const sizeTag = asset.boundAttributes.size;
      if (colorTag && colorTag !== "All" && colorTag !== "Default") {
        // If color exists in variants, select it
        if (product.variants.some(v => v.color === colorTag)) {
          setSelectedColor(colorTag);
        }
      }
      if (sizeTag && sizeTag !== "All" && sizeTag !== "Default") {
        // If size exists in variants, select it
        if (product.variants.some(v => v.size === sizeTag)) {
          setSelectedSize(sizeTag);
        }
      }
    }
  };

  // Find active variant matching selected size and color
  const activeVariant = product.variants.find((v) => {
    const matchesSize = selectedSize ? v.size === selectedSize : true;
    
    let colorToMatch = selectedColor;
    if (!colorToMatch && product.mediaAssets && product.mediaAssets[selectedImageIndex]) {
      const asset = product.mediaAssets[selectedImageIndex];
      if (asset.boundAttributes && typeof asset.boundAttributes === "object") {
        const colorTag = asset.boundAttributes.color;
        if (colorTag && colorTag !== "All" && colorTag !== "Default") {
          colorToMatch = colorTag;
        }
      }
    }

    const matchesColor = colorToMatch ? v.color === colorToMatch : true;
    return matchesSize && matchesColor;
  }) || product.variants[0];

  const totalStock = product.variants.reduce((acc, v) => acc + v.stock, 0);

  const selectedVariantStock = activeVariant?.stock || 0;

  const variantPrice = activeVariant?.price ?? product.price;

  let finalPrice = variantPrice;
  let isDiscounted = false;

  if (product.discount && product.discount.active) {
    isDiscounted = true;
    if (product.discount.discountType === "PERCENTAGE") {
      finalPrice = roundPrice(variantPrice - (variantPrice * (product.discount.value / 100)));
    } else {
      finalPrice = roundPrice(Math.max(0, variantPrice - product.discount.value));
    }
  }

  const handleAddToCart = () => {
    if (!isSelectionComplete) return;

    addItem({
      id: product.id,
      name: product.name,
      price: finalPrice,
      originalPrice: isDiscounted ? variantPrice : undefined,
      image: selectedImage || product.images[0] || "",
      category: product.team,
      isCustomize: product.isCustomize ?? false,
      sizeAttributeName,
      colorAttributeName,
    }, selectedSize!, quantity, selectedColor || undefined, product.isCombo ? selectedComboItems : undefined);

    setAddedEffect(true);
    setTimeout(() => setAddedEffect(false), 2000);
  };

  const handleBuyNow = () => {
    if (!isSelectionComplete) return;
    handleAddToCart();
    router.push('/checkout');
  };

  const incrementQuantity = () => {
    if (!isSelectionComplete) return;
    if (product.trackStock) {
      if (quantity >= selectedVariantStock) {
        return;
      }
    }
    setQuantity(q => q + 1);
  };

  const decrementQuantity = () => {
    if (quantity > 1) {
      setQuantity(q => q - 1);
    }
  };

  return (
    <div className="bg-white min-h-screen pb-16">
      <div className="container mx-auto px-2 md:px-4 py-6 md:py-16">

        {/* Breadcrumb */}
        <div className="mb-6">
          <Breadcrumb items={[
            { label: product.category, href: `/products?category=${encodeURIComponent(product.category)}` },
            { label: product.name },
          ]} />
        </div>

        {/* Top Product Section */}
        <div className="flex flex-col lg:flex-row items-start gap-8 lg:gap-12 mb-8">

          {/* Left: Product Images */}
          <div className="w-full lg:w-1/2 flex flex-col lg:flex-row gap-4">
            {/* Thumbnails Row/Column — mobile: horizontal scroll, desktop: 5 visible + vertical scroll */}
            <div
              ref={thumbnailScrollRef}
              className="flex flex-row lg:flex-col gap-3 overflow-x-auto lg:overflow-x-hidden lg:overflow-y-auto scrollbar-hide w-full lg:w-24 flex-shrink-0 order-2 lg:order-1 lg:max-h-[688px]"
            >
              {product.images.map((img, idx) => (
                <button
                  key={idx}
                  ref={(el) => { thumbnailRefs.current[idx] = el; }}
                  onClick={() => handleThumbnailClick(idx)}
                  className={`relative w-20 h-24 lg:w-full lg:h-32 flex-shrink-0 bg-[#F9F9F9] overflow-hidden transition-all box-border ${selectedImageIndex === idx
                    ? 'opacity-100 border-[2px] border-[#800020] shadow-sm'
                    : 'opacity-70 hover:opacity-100 border border-slate-200 hover:border-[#FFD700]'
                    }`}
                >
                  <UploadedImage src={img} alt={`${product.name} view ${idx + 1}`} fill className="object-cover" />
                </button>
              ))}
            </div>

            {/* Main Image */}
            <div
              className="relative flex-1 aspect-[4/5] bg-[#F9F9F9] flex items-center justify-center group overflow-hidden shadow-sm border border-slate-100 order-1 lg:order-2 select-none"
              onMouseEnter={() => setIsZoomed(true)}
              onMouseLeave={() => setIsZoomed(false)}
              onMouseMove={handleImageMouseMove}
            >
              {selectedImage ? (
                <UploadedImage
                  src={selectedImage}
                  alt={product.name}
                  fill
                  className="object-cover"
                  style={{
                    transition: isZoomed ? "transform 0.1s ease-out" : "transform 0.3s ease-out",
                    transform: isZoomed ? "scale(2.2)" : "scale(1)",
                    transformOrigin: `${zoomOrigin.x}% ${zoomOrigin.y}%`,
                    cursor: isZoomed ? "crosshair" : "zoom-in",
                  }}
                  priority
                />
              ) : (
                <span className="text-slate-400 font-medium">No Image</span>
              )}
              {/* Navigation Arrows */}
              {product.images.length > 1 && !isZoomed && (
                <>
                  <button
                    onClick={handlePrevImage}
                    className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/80 hover:bg-[#800020] text-zinc-800 hover:text-[#FFD700] rounded-full flex items-center justify-center shadow-md transition-colors z-10"
                  >
                    <ChevronLeft className="w-6 h-6" />
                  </button>
                  <button
                    onClick={handleNextImage}
                    className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/80 hover:bg-[#800020] text-zinc-800 hover:text-[#FFD700] rounded-full flex items-center justify-center shadow-md transition-colors z-10"
                  >
                    <ChevronRight className="w-6 h-6" />
                  </button>
                </>
              )}
              {/* Discount Badge on Main Image */}
              {isDiscounted && (
                <div className="absolute top-4 left-4 z-20 bg-red-600 text-white text-xs font-black uppercase tracking-widest px-3 py-1.5 shadow-md">
                  {product.discount!.discountType === "PERCENTAGE"
                    ? `${product.discount!.value}% OFF`
                    : `৳${product.discount!.value} OFF`}
                </div>
              )}
            </div>
          </div>

          {/* Right: Product Details */}
          <div className="w-full lg:w-1/2 flex flex-col justify-center">

            <div className="flex items-center gap-4 mb-3">
            </div>

            <h1 className="text-xl md:text-2xl font-semibold text-zinc-900 mb-1.5 leading-snug">
              {product.name}
            </h1>
            <p className="text-slate-400 text-xs uppercase tracking-widest mb-5">{product.category} &bull; {product.team}</p>

            <div className="flex items-baseline gap-3 mb-7">
              <p className="text-2xl md:text-3xl font-semibold text-[#800020]">{formatBDT(finalPrice)}</p>
              {isDiscounted ? (
                <p className="text-sm text-zinc-400 line-through">{formatBDT(variantPrice)}</p>
              ) : null}
            </div>

            {/* Combo Box Customizer */}
            {product.isCombo ? (
              <div className="mb-6">
                {/* Header */}
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs text-zinc-400 uppercase tracking-widest">Choose {product.comboRequiredQty} items</p>
                  <span className={`text-xs font-semibold tabular-nums ${
                    totalSelectedComboQty === (product.comboRequiredQty ?? 0) ? 'text-emerald-600' : 'text-zinc-400'
                  }`}>
                    {totalSelectedComboQty} / {product.comboRequiredQty} selected
                  </span>
                </div>

                {/* Thin progress line */}
                <div className="w-full h-px bg-slate-100 mb-4 overflow-hidden">
                  <div
                    className="h-full bg-[#800020] transition-all duration-300"
                    style={{ width: `${Math.min(100, (totalSelectedComboQty / (product.comboRequiredQty || 1)) * 100)}%` }}
                  />
                </div>

                {/* Item count hint */}
                {(product.comboChildOptions?.length ?? 0) > 0 && (
                  <p className="text-[10px] text-zinc-400 mb-3">
                    {product.comboChildOptions!.length} items available — pick any {product.comboRequiredQty}
                  </p>
                )}

                {/* Image grid — no height cap, show all */}
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5">
                  {product.comboChildOptions?.map((option) => {
                    const child = option.childProduct;
                    const childStock = getChildStock(child);
                    const isOutOfStock = childStock <= 0;

                    const selection = selectedComboItems.find(item => item.productId === child.id);
                    const isSelected = !!selection;
                    const currentQty = selection ? selection.quantity : 0;

                    return (
                      <div
                        key={child.id}
                        onClick={() => {
                          if (isOutOfStock) return;
                          if (isSelected && option.maxQuantity === 1) {
                            handleRemoveChild(child.id);
                          } else if (!isSelected) {
                            if (totalSelectedComboQty < (product.comboRequiredQty ?? 0)) {
                              handleAddChild(child.id, child.name);
                            }
                          }
                        }}
                        className={`relative flex flex-col cursor-pointer select-none transition-all duration-150 group ${
                          isOutOfStock ? 'opacity-35 cursor-not-allowed' : ''
                        }`}
                      >
                        {/* Image card */}
                        <div className={`relative aspect-square w-full overflow-hidden bg-slate-50 border transition-all duration-150 ${
                          isSelected
                            ? 'border-[#800020]'
                            : 'border-slate-100 group-hover:border-slate-300'
                        }`}>
                          {child.images && child.images[0] ? (
                            <Image src={child.images[0]} alt={child.name} fill className="object-cover" />
                          ) : (
                            <div className="w-full h-full bg-slate-100" />
                          )}

                          {/* Selected checkmark badge */}
                          {isSelected && (
                            <div className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-[#800020] flex items-center justify-center shadow-sm">
                              <svg className="w-2.5 h-2.5 text-white stroke-current" viewBox="0 0 24 24" fill="none" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="20 6 9 17 4 12" />
                              </svg>
                            </div>
                          )}

                          {/* Out of stock overlay */}
                          {isOutOfStock && (
                            <div className="absolute inset-0 bg-white/60 flex items-end justify-center pb-1">
                              <span className="text-[9px] text-red-400 font-medium">Out of stock</span>
                            </div>
                          )}


                          {/* Quantity stepper overlay for maxQty > 1 */}
                          {!isOutOfStock && option.maxQuantity > 1 && isSelected && (
                            <div
                              onClick={(e) => e.stopPropagation()}
                              className="absolute bottom-0 left-0 right-0 flex items-center justify-between bg-white/90 border-t border-slate-100 px-1 py-0.5"
                            >
                              <button
                                type="button"
                                onClick={() => handleDecrementChild(child.id)}
                                className="w-5 h-5 flex items-center justify-center text-slate-500 hover:text-rose-600"
                              >
                                <Minus className="w-2.5 h-2.5" />
                              </button>
                              <span className="text-[10px] font-bold text-zinc-800">{currentQty}</span>
                              <button
                                type="button"
                                onClick={() => {
                                  if (totalSelectedComboQty < (product.comboRequiredQty ?? 0) && currentQty < Math.min(option.maxQuantity, childStock)) {
                                    handleIncrementChild(child.id);
                                  }
                                }}
                                disabled={totalSelectedComboQty >= (product.comboRequiredQty ?? 0) || currentQty >= Math.min(option.maxQuantity, childStock)}
                                className="w-5 h-5 flex items-center justify-center text-slate-500 hover:text-[#800020] disabled:opacity-30"
                              >
                                <Plus className="w-2.5 h-2.5" />
                              </button>
                            </div>
                          )}
                        </div>

                        {/* Name below image */}
                        <p className={`text-[10px] text-center mt-1.5 leading-tight truncate px-0.5 ${
                          isSelected ? 'text-zinc-900 font-medium' : 'text-zinc-500'
                        }`}>
                          {child.name}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <>
                {/* Color Selector */}
                {availableColors.length > 0 && (
                  <div className="mb-6">
                    <h3 className="font-medium text-zinc-500 text-xs uppercase tracking-widest mb-3">Select {colorAttributeName}</h3>
                    <div className="flex flex-wrap gap-2">
                      {availableColors.map((col) => {
                        const isAvailableForSelectedSize = selectedSize
                          ? product.variants.some(v => v.color === col && v.size === selectedSize && (!product.trackStock || v.stock > 0))
                          : product.variants.some(v => v.color === col && (!product.trackStock || v.stock > 0));

                        return (
                          <button
                            key={col}
                            type="button"
                            onClick={() => handleColorSelect(col)}
                            disabled={!isAvailableForSelectedSize}
                            className={`h-12 px-6 flex items-center justify-center font-bold text-xs uppercase tracking-wider transition-colors border ${!isAvailableForSelectedSize
                              ? 'opacity-20 border-slate-200 cursor-not-allowed select-none bg-slate-50 text-slate-400'
                              : selectedColor === col
                                ? 'bg-primary text-white border-primary'
                                : 'bg-white text-zinc-900 border-zinc-200 hover:border-primary hover:text-primary'
                              }`}
                          >
                            <span>{col}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Size Selector */}
                {!isSizeLess && (
                  <div className="mb-8">
                    <div className="flex justify-between items-center mb-3">
                      <h3 className="font-medium text-zinc-500 text-xs uppercase tracking-widest">Select {sizeAttributeName}</h3>
                    </div>

                    {product.variants.length === 0 ? (
                      <p className="text-red-500 font-medium text-sm">Size map not configured yet.</p>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {uniqueSizes.map((sz) => {
                          const matchingVariants = product.variants.filter(v => v.size === sz);
                          const isOutOfStock = product.trackStock && !matchingVariants.some(v => v.stock > 0);
                          const isAvailableForSelectedColor = selectedColor
                            ? matchingVariants.some(v => v.color === selectedColor)
                            : true;

                          return (
                            <button
                              key={sz}
                              type="button"
                              onClick={() => {
                                if (isOutOfStock) return;
                                handleSizeSelect(sz);
                              }}
                              disabled={isOutOfStock || !isAvailableForSelectedColor}
                              className={`h-12 px-6 flex items-center justify-center font-semibold text-sm transition-colors border ${isOutOfStock
                                ? 'border-dashed border-slate-300 text-slate-400 bg-slate-50/50 cursor-not-allowed select-none'
                                : !isAvailableForSelectedColor
                                  ? 'opacity-20 border-slate-200 cursor-not-allowed text-slate-400 bg-slate-50'
                                  : selectedSize === sz
                                    ? 'bg-primary text-white border-primary'
                                    : 'bg-white text-zinc-900 border-zinc-200 hover:border-primary hover:text-primary'
                                }`}
                              style={{
                                background: isOutOfStock
                                  ? 'linear-gradient(135deg, transparent 50%, #cbd5e1 50%, #cbd5e1 52%, transparent 52%)'
                                  : undefined
                              }}
                            >
                              <span>{sz}</span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </>
            )}

            {/* Quantity and Action Buttons */}
            <div className="mb-10">
              <h3 className="font-medium text-zinc-500 text-xs uppercase tracking-widest mb-3">Quantity</h3>

              <div className="flex flex-col gap-2.5">
                <div className="flex items-center gap-2.5">
                  {/* Quantity Selector */}
                  <div className="flex items-center border border-slate-200 h-12 px-1 w-28 justify-between">
                    <button
                      onClick={decrementQuantity}
                      disabled={!isSelectionComplete}
                      className="w-9 h-full flex items-center justify-center text-zinc-400 hover:text-zinc-800 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <div className="flex-1 flex items-center justify-center font-medium text-sm text-zinc-800">
                      {quantity}
                    </div>
                    <button
                      onClick={incrementQuantity}
                      disabled={!isSelectionComplete}
                      className="w-9 h-full flex items-center justify-center text-zinc-400 hover:text-zinc-800 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Add to Cart Button */}
                  <button
                    onClick={handleAddToCart}
                    disabled={!isSelectionComplete || (product.trackStock && selectedVariantStock <= 0)}
                    className={`flex-1 h-12 font-medium text-sm transition-all flex items-center justify-center ${(!isSelectionComplete || (product.trackStock && selectedVariantStock <= 0))
                      ? 'bg-slate-50 text-slate-300 cursor-not-allowed border border-slate-100'
                      : addedEffect
                        ? 'bg-green-600 text-white'
                        : 'bg-primary text-white hover:opacity-90 active:scale-[0.98]'
                      }`}
                  >
                    {getButtonText()}
                  </button>
                </div>

                {/* Buy Now Button */}
                <button
                  onClick={handleBuyNow}
                  disabled={!isSelectionComplete || (product.trackStock && selectedVariantStock <= 0)}
                  className={`w-full h-12 font-medium text-sm transition-all flex items-center justify-center ${(!isSelectionComplete || (product.trackStock && selectedVariantStock <= 0))
                    ? 'bg-slate-50 text-slate-300 cursor-not-allowed border border-slate-100'
                    : 'bg-zinc-900 text-white hover:bg-zinc-800 active:scale-[0.98]'
                    }`}
                >
                  Buy Now
                </button>
              </div>

              {!isSelectionComplete && (
                <p className="text-xs text-zinc-400 mt-3">
                  {product.isCombo ? (
                    `Select ${(product.comboRequiredQty ?? 0) - totalSelectedComboQty} more item${(product.comboRequiredQty ?? 0) - totalSelectedComboQty > 1 ? 's' : ''} to continue`
                  ) : (
                    `Please select a ${
                      !selectedSize && isColorSelectionRequired && !selectedColor
                        ? `${sizeAttributeName.toLowerCase()} and ${colorAttributeName.toLowerCase()}`
                        : !selectedSize
                          ? sizeAttributeName.toLowerCase()
                          : colorAttributeName.toLowerCase()
                    } to continue`
                  )}
                </p>
              )}
            </div>

            {/* Size Chart Data Table */}
            {sizeChartData && Array.isArray(sizeChartData.data) && sizeChartData.data.length > 0 && (
              <div className="mt-10 pt-8 border-t border-slate-100">
                <h3 className="font-bold text-zinc-900 text-sm uppercase tracking-widest mb-4">Size Chart</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse border border-slate-200">
                    <thead>
                      <tr className="bg-slate-50 uppercase text-xs tracking-widest text-zinc-900">
                        <th className="p-3 border border-slate-200 font-bold">{sizeAttributeName}</th>
                        {Object.keys(sizeChartData.data[0])
                          .filter(k => k !== 'size')
                          .map((h: string, idx: number) => (
                            <th key={idx} className="p-3 border border-slate-200 font-bold capitalize">{h} (inches)</th>
                          ))}
                      </tr>
                    </thead>
                    <tbody className="text-zinc-600 text-sm">
                      {sizeChartData.data.map((row: any, i: number) => (
                        <tr key={i} className={i % 2 !== 0 ? "bg-slate-50" : ""}>
                          <td className="p-3 border border-slate-200 font-bold text-zinc-900 uppercase">{row.size}</td>
                          {Object.keys(sizeChartData.data[0])
                            .filter(k => k !== 'size')
                            .map((h: string, idx: number) => (
                              <td key={idx} className="p-3 border border-slate-200">{row[h]}</td>
                            ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="text-xs text-zinc-500 mt-3">* Measurements may vary by 0.5 inches due to the manufacturing process.</p>
              </div>
            )}

          </div>
        </div>

        {/* Content Section */}
        <div className="container mx-auto grid grid-cols-1 md:grid-cols-2 gap-12 border-t border-slate-200 pt-16 mt-16 pb-16">
          <div className="space-y-8 text-zinc-600 leading-relaxed">
            <div>
              <h3 className="text-lg font-semibold text-zinc-900 uppercase tracking-tight mb-4">Product Details</h3>
              <div
                className="prose max-w-none text-zinc-600 leading-relaxed whitespace-pre-wrap"
                dangerouslySetInnerHTML={{ __html: product.description || "" }}
              />
            </div>

          </div>
        </div>

        {/* Related Products Section */}
        {relatedProducts && relatedProducts.length > 0 && (
          <div className="container mx-auto pb-16 pt-8 border-t border-slate-200">
            <h2 className="text-2xl font-medium text-zinc-900 mb-8 text-center">You may also like</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
              {relatedProducts.map((rp, idx) => (
                <ProductCard key={rp.id || idx} product={rp} />
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
