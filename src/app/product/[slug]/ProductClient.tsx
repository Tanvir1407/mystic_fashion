"use client";

import Image from "next/image";
import UploadedImage from "@/components/UploadedImage";
import { useState } from "react";
import { useCartStore } from "@/store/cartStore";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getFinalPrice, formatPrice } from "@/lib/priceUtils";

import {
  Check,
  ShoppingCart,
  ShoppingBag,
  Plus,
  Minus,
  ChevronLeft,
  ChevronRight,
  Play,
} from "lucide-react";
import ProductCard from "@/components/ProductCard";

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
  variants: {
    size: string;
    stock: number;
    pricingMatrix?: { basePrice?: number | string } | null;
  }[];
  discount?: {
    active: boolean;
    discountType: "PERCENTAGE" | "FLAT";
    value: number;
  } | null;
}

export default function ProductClient({
  product,
  sizeChartData,
  deliveryData,
  relatedProducts,
}: {
  product: Product;
  sizeChartData?: any;
  deliveryData?: { insideDhaka: number; outsideDhaka: number };
  relatedProducts: any[];
}) {
  const router = useRouter();
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const selectedImage = product.images[selectedImageIndex] || "";

  const handlePrevImage = () => {
    setSelectedImageIndex((prev) =>
      prev > 0 ? prev - 1 : product.images.length - 1,
    );
  };

  const handleNextImage = () => {
    setSelectedImageIndex((prev) =>
      prev < product.images.length - 1 ? prev + 1 : 0,
    );
  };

  // for enable the button and also selected the first size if available
  const [selectedSize, setSelectedSize] = useState<string | null>(() => {
    const first = product.variants.find(
      (v) => !product.trackStock || v.stock > 0,
    );
    return first?.size || product.variants[0]?.size || null;
  });
  const [quantity, setQuantity] = useState(1);

  const [addedEffect, setAddedEffect] = useState(false);

  const addItem = useCartStore((state) => state.addItem);

  const totalStock = product.variants.reduce((acc, v) => acc + v.stock, 0);

  const selectedVariantStock = selectedSize
    ? product.variants.find((v) => v.size === selectedSize)?.stock || 0
    : 0;

  const selectedVariant = selectedSize
    ? product.variants.find((v) => v.size === selectedSize)
    : undefined;
  const basePrice = selectedVariant?.pricingMatrix?.basePrice
    ? Number(selectedVariant.pricingMatrix.basePrice)
    : undefined;

  const finalPrice = basePrice !== undefined
    ? getFinalPrice(basePrice, product.discount)
    : undefined;
  const isDiscounted = !!(product.discount?.active && basePrice !== undefined);

  const handleAddToCart = () => {
    if (!selectedSize || finalPrice === undefined) return;

    addItem(
      {
        id: product.id,
        name: product.name,
        price: finalPrice,
        originalPrice: isDiscounted ? basePrice : undefined,
        image: product.images[0] || "",
        category: product.team,
        isCustomize: product.isCustomize ?? false,
      },
      selectedSize,
      quantity,
    );

    setAddedEffect(true);
    setTimeout(() => setAddedEffect(false), 2000);
  };

  const handleBuyNow = () => {
    if (!selectedSize) return;
    handleAddToCart();
    router.push("/checkout");
  };

  const incrementQuantity = () => {
    if (product.trackStock && selectedSize) {
      const maxStock =
        product.variants.find((v) => v.size === selectedSize)?.stock || 0;
      if (quantity >= maxStock) {
        return;
      }
    }
    setQuantity((q) => q + 1);
  };

  const decrementQuantity = () => {
    if (quantity > 1) {
      setQuantity((q) => q - 1);
    }
  };

  return (
    <div className="bg-white min-h-screen pb-16">
      <div className="container mx-auto px-4 py-8 md:py-16">
        {/* Top Product Section */}
        <div className="flex flex-col lg:flex-row items-start gap-8 lg:gap-12 mb-8">
          {/* Left: Product Images */}
          <div className="w-full lg:w-1/2 flex flex-col lg:flex-row gap-4">
            {/* Thumbnails Row/Column */}
            <div className="flex flex-row lg:flex-col gap-3 overflow-auto scrollbar-hide w-full lg:w-24 flex-shrink-0 order-2 lg:order-1">
              {product.images.map((img, idx) => (
                <button
                  key={idx}
                  onClick={() => setSelectedImageIndex(idx)}
                  className={`relative w-20 h-24 lg:w-full lg:h-32 flex-shrink-0 bg-[#F9F9F9] overflow-hidden transition-all box-border ${
                    selectedImageIndex === idx
                      ? "opacity-100 border-[2px] border-[#800020] shadow-sm"
                      : "opacity-70 hover:opacity-100 border border-slate-200 hover:border-[#FFD700]"
                  }`}
                >
                  <UploadedImage
                    src={img}
                    alt={`${product.name} view ${idx + 1}`}
                    fill
                    className="object-cover"
                  />
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
            <div className="flex items-center gap-4 mb-3"></div>

            <h1 className="text-2xl font-semibold text-zinc-900 mb-2  leading-[1.1] ">
              {product.name}
            </h1>
            <p className="text-slate-500 font-medium mb-6 uppercase tracking-wider text-sm">
              {product.category} &bull; {product.team}
            </p>

            <div className="flex items-end gap-4 mb-8">
              {basePrice !== undefined ? (
                <>
                  <p className="text-3xl md:text-4xl font-black text-[#800020]">
                    {formatPrice(finalPrice!)}
                  </p>
                  {isDiscounted && (
                    <p className="text-lg font-bold text-zinc-400 line-through mb-1.5">
                      {formatPrice(basePrice)}
                    </p>
                  )}
                </>
              ) : (
                <p className="text-3xl md:text-4xl font-black text-zinc-300">
                  Price not available
                </p>
              )}
            </div>

            {/* Size Selector */}
            <div className="mb-8">
              <div className="flex justify-between items-center mb-3">
                <h3 className="font-semibold text-zinc-900 text-sm uppercase tracking-widest">
                  Select Size
                </h3>
              </div>

              {product.variants.length === 0 ? (
                <p className="text-red-500 font-medium text-sm">
                  Size map not configured yet.
                </p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {product.variants.map((v) => {
                    const isOutOfStock = product.trackStock && v.stock <= 0;
                    return (
                      <button
                        key={v.size}
                        onClick={() => {
                          if (isOutOfStock) return;
                          setSelectedSize(v.size);
                          setQuantity(1);
                        }}
                        disabled={isOutOfStock}
                        className={`h-12 px-6 flex items-center justify-center font-semibold text-sm transition-colors border ${
                          isOutOfStock
                            ? "border-dashed border-slate-300 text-slate-400 bg-slate-50/50 cursor-not-allowed select-none"
                            : selectedSize === v.size
                              ? "bg-primary text-white border-primary"
                              : "bg-white text-zinc-900 border-zinc-200 hover:border-primary hover:text-primary"
                        }`}
                        style={{
                          background: isOutOfStock
                            ? "linear-gradient(135deg, transparent 50%, #cbd5e1 50%, #cbd5e1 52%, transparent 52%)"
                            : undefined,
                        }}
                      >
                        <span>{v.size}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Quantity and Action Buttons */}
            <div className="mb-10">
              <h3 className="font-bold text-zinc-900 text-sm mb-3">Quantity</h3>

              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-3">
                  {/* Quantity Selector */}
                  <div className="flex items-center bg-zinc-100 h-14 px-2 w-32 justify-between">
                    <button
                      onClick={decrementQuantity}
                      className="w-10 h-full flex items-center justify-center text-zinc-600 hover:text-zinc-900 transition-colors"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <div className="flex-1 flex items-center justify-center font-bold text-sm text-zinc-900">
                      {quantity}
                    </div>
                    <button
                      onClick={incrementQuantity}
                      className="w-10 h-full flex items-center justify-center text-zinc-600 hover:text-zinc-900 transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Add to Cart Button */}
                  <button
                    onClick={handleAddToCart}
                    disabled={
                      !selectedSize ||
                      finalPrice === undefined ||
                      (product.trackStock && selectedVariantStock <= 0)
                    }
                    className={`flex-1 h-14 font-bold text-sm transition-all flex items-center justify-center ${
                      !selectedSize ||
                      finalPrice === undefined ||
                      (product.trackStock && selectedVariantStock <= 0)
                        ? "bg-zinc-100 text-zinc-400 cursor-not-allowed"
                        : addedEffect
                          ? "bg-green-600 text-white"
                          : "bg-primary text-white hover:opacity-95 active:scale-[0.98]"
                    }`}
                  >
                    {addedEffect
                      ? "Added To Cart"
                      : selectedSize
                        ? "Add To Cart"
                        : "Select Size"}
                  </button>
                </div>

                {/* Buy Now Button */}
                <button
                  onClick={handleBuyNow}
                    disabled={
                      !selectedSize ||
                      finalPrice === undefined ||
                      (product.trackStock && selectedVariantStock <= 0)
                    }
                    className={`w-full h-14 font-bold text-sm transition-all flex items-center justify-center ${
                      !selectedSize ||
                      finalPrice === undefined ||
                      (product.trackStock && selectedVariantStock <= 0)
                        ? "bg-zinc-100 text-zinc-400 cursor-not-allowed"
                        : "bg-primary text-white hover:opacity-95 active:scale-[0.98]"
                  }`}
                >
                  Buy Now
                </button>
              </div>

              {!selectedSize && (
                <p className="text-xs text-red-500 font-medium mt-3">
                  Please select a size to continue
                </p>
              )}
              {selectedSize && finalPrice === undefined && (
                <p className="text-xs text-amber-600 font-medium mt-3">
                  Pricing not configured for this size
                </p>
              )}
            </div>

            {/* Size Chart Data Table */}
            {sizeChartData &&
              Array.isArray(sizeChartData.data) &&
              sizeChartData.data.length > 0 && (
                <div className="mt-10 pt-8 border-t border-slate-100">
                  <h3 className="font-bold text-zinc-900 text-sm uppercase tracking-widest mb-4">
                    Size Chart
                  </h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse border border-slate-200">
                      <thead>
                        <tr className="bg-slate-50 uppercase text-xs tracking-widest text-zinc-900">
                          <th className="p-3 border border-slate-200 font-bold">
                            Size
                          </th>
                          {Object.keys(sizeChartData.data[0])
                            .filter((k) => k !== "size")
                            .map((h: string, idx: number) => (
                              <th
                                key={idx}
                                className="p-3 border border-slate-200 font-bold capitalize"
                              >
                                {h} (inches)
                              </th>
                            ))}
                        </tr>
                      </thead>
                      <tbody className="text-zinc-600 text-sm">
                        {sizeChartData.data.map((row: any, i: number) => (
                          <tr
                            key={i}
                            className={i % 2 !== 0 ? "bg-slate-50" : ""}
                          >
                            <td className="p-3 border border-slate-200 font-bold text-zinc-900 uppercase">
                              {row.size}
                            </td>
                            {Object.keys(sizeChartData.data[0])
                              .filter((k) => k !== "size")
                              .map((h: string, idx: number) => (
                                <td
                                  key={idx}
                                  className="p-3 border border-slate-200"
                                >
                                  {row[h]}
                                </td>
                              ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <p className="text-xs text-zinc-500 mt-3">
                    * Measurements may vary by 0.5 inches due to the
                    manufacturing process.
                  </p>
                </div>
              )}
          </div>
        </div>

        {/* Content Section */}
        <div className="container mx-auto grid grid-cols-1 md:grid-cols-2 gap-12 border-t border-slate-200 pt-16 mt-16 pb-16">
          <div className="space-y-8 text-zinc-600 leading-relaxed">
            <div>
              <h3 className="text-lg font-semibold text-zinc-900 uppercase tracking-tight mb-4">
                Product Details
              </h3>
              <div
                className="prose max-w-none text-zinc-600 leading-relaxed whitespace-pre-wrap"
                dangerouslySetInnerHTML={{ __html: product.description || "" }}
              />
            </div>
          </div>
          <div className="space-y-6 text-zinc-600 leading-relaxed">
            <h3 className="text-lg font-semibold text-zinc-900 uppercase tracking-tight mb-2">
              Delivery Details
            </h3>
            <div className=" p-6 ">
              <ul className="space-y-4">
                <li className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-[#800020] flex-shrink-0 mt-0.5" />
                  <div>
                    <strong className="block text-zinc-900 mb-1">
                      Inside Dhaka
                    </strong>
                    <p>
                      Delivery in 2-3 working days. Charge:{" "}
                      {deliveryData?.insideDhaka === 0
                        ? "Free"
                        : `৳${deliveryData?.insideDhaka || 80}`}
                    </p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-[#800020] flex-shrink-0 mt-0.5" />
                  <div>
                    <strong className="block text-zinc-900 mb-1">
                      Outside Dhaka
                    </strong>
                    <p>
                      Delivery in 3-5 working days. Charge:{" "}
                      {deliveryData?.outsideDhaka === 0
                        ? "Free"
                        : `৳${deliveryData?.outsideDhaka || 150}`}
                    </p>
                  </div>
                </li>
              </ul>
            </div>
            <p className="text-sm">
              Please make sure to record an unboxing video to claim any damages
              or missing items.
            </p>
          </div>
        </div>

        {/* Related Products Section */}
        {relatedProducts && relatedProducts.length > 0 && (
          <section className="border-t border-slate-200 pt-16 mt-8">
            <div className="container mx-auto">
              <div className="text-center mb-12">
                <h2 className="font-serif text-2xl md:text-3xl text-neutral-900 tracking-widest font-light uppercase">
                  You may like this
                </h2>
                <div className="w-12 h-[1px] bg-[#800020] mx-auto mt-4"></div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6 lg:gap-8">
                {relatedProducts.map((p) => (
                  <ProductCard key={p.id} product={p} />
                ))}
              </div>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
