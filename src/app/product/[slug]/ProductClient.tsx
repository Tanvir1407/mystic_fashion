"use client";

import Image from "next/image";
import UploadedImage from "@/components/UploadedImage";
import { useState, useEffect } from "react";
import { useCartStore } from "@/store/cartStore";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatBDT, roundPrice } from "@/utils/formatPrice";
import ProductCard from "@/components/ProductCard";

import { Check, ShoppingCart, ShoppingBag, Plus, Minus, ChevronLeft, ChevronRight, Play, Home } from "lucide-react";

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
}

export default function ProductClient({ product, sizeChartData, deliveryData, relatedProducts }: { product: Product, sizeChartData?: any, deliveryData?: { insideDhaka: number, outsideDhaka: number }, relatedProducts?: any[] }) {
  const router = useRouter();

  // Dynamic variant names based on PIM category attribute mapping
  const sizeAttributeName = product.categoryRel?.attributeMappings?.[0]?.attribute?.name || "Size";
  const colorAttributeName = product.categoryRel?.attributeMappings?.[1]?.attribute?.name || "Color";
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const selectedImage = product.images[selectedImageIndex] || "";

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

  // Auto-select size on mount if it's size-less
  useEffect(() => {
    if (product.variants.length > 0) {
      if (isSizeLess) {
        setSelectedSize(product.variants[0].size);
      }
    }
  }, [product.variants, isSizeLess]);

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
  const isSelectionComplete = !!selectedSize && (!isColorSelectionRequired || !!selectedColor);

  const getButtonText = () => {
    if (addedEffect) return 'Added To Cart';
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
    const matchesColor = selectedColor ? v.color === selectedColor : true;
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
    }, selectedSize!, quantity, selectedColor || undefined);

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
      <div className="container mx-auto px-4 py-8 md:py-16">

        {/* Breadcrumb */}
        <nav className="flex items-center gap-1.5 text-xs text-slate-400 mb-6">
          <Link href="/" className="flex items-center gap-1 hover:text-slate-600 transition-colors">
            <Home className="w-3 h-3" />
            <span>Home</span>
          </Link>
          <span>/</span>
          <Link
            href={`/products?category=${encodeURIComponent(product.category)}`}
            className="hover:text-slate-600 transition-colors capitalize"
          >
            {product.category}
          </Link>
          <span>/</span>
          <span className="text-slate-500 line-clamp-1">{product.name}</span>
        </nav>

        {/* Top Product Section */}
        <div className="flex flex-col lg:flex-row items-start gap-8 lg:gap-12 mb-8">

          {/* Left: Product Images */}
          <div className="w-full lg:w-1/2 flex flex-col lg:flex-row gap-4">
            {/* Thumbnails Row/Column */}
            <div className="flex flex-row lg:flex-col gap-3 overflow-auto scrollbar-hide w-full lg:w-24 flex-shrink-0 order-2 lg:order-1">
              {product.images.map((img, idx) => (
                <button
                  key={idx}
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
            <div className="relative flex-1 aspect-[4/5] bg-[#F9F9F9] flex items-center justify-center group overflow-hidden shadow-sm border border-slate-100 order-1 lg:order-2">
              {selectedImage ? (
                <UploadedImage
                  src={selectedImage}
                  alt={product.name}
                  fill
                  className="object-cover transition-transform duration-700"
                  priority
                />
              ) : (
                <span className="text-slate-400 font-medium">No Image</span>
              )}
              {/* Navigation Arrows */}
              {product.images.length > 1 && (
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
                <p className="text-xs text-red-500 font-medium mt-3">
                  Please select a {
                    !selectedSize && isColorSelectionRequired && !selectedColor
                      ? `${sizeAttributeName.toLowerCase()} and ${colorAttributeName.toLowerCase()}`
                      : !selectedSize
                        ? sizeAttributeName.toLowerCase()
                        : colorAttributeName.toLowerCase()
                  } to continue
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
          <div className="space-y-6 text-zinc-600 leading-relaxed">
            <h3 className="text-lg font-semibold text-zinc-900 uppercase tracking-tight mb-2">Delivery Details</h3>
            <div className=" p-6 ">
              <ul className="space-y-4">
                <li className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-[#800020] flex-shrink-0 mt-0.5" />
                  <div>
                    <strong className="block text-zinc-900 mb-1">Inside Dhaka</strong>
                    <p>Delivery in 2-3 working days. Charge: {deliveryData?.insideDhaka === 0 ? "Free" : `৳${deliveryData?.insideDhaka || 80}`}</p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-[#800020] flex-shrink-0 mt-0.5" />
                  <div>
                    <strong className="block text-zinc-900 mb-1">Outside Dhaka</strong>
                    <p>Delivery in 3-5 working days. Charge: {deliveryData?.outsideDhaka === 0 ? "Free" : `৳${deliveryData?.outsideDhaka || 150}`}</p>
                  </div>
                </li>
              </ul>
            </div>
            <p className="text-sm">Please make sure to record an unboxing video to claim any damages or missing items.</p>
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
