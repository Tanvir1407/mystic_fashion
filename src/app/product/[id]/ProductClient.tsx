"use client";

import Image from "next/image";
import { useState } from "react";
import { useCartStore } from "@/store/cartStore";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { Check, ShoppingCart, ShoppingBag, Plus, Minus, ChevronLeft, ChevronRight, Play } from "lucide-react";

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  images: string[];
  team: string;
  category: string;
  variants: { size: string, stock: number }[];
  discount?: {
    active: boolean;
    discountType: "PERCENTAGE" | "FLAT";
    value: number;
  } | null;
}

export default function ProductClient({ product, sizeChartData, deliveryData }: { product: Product, sizeChartData?: any, deliveryData?: { insideDhaka: number, outsideDhaka: number } }) {
  const router = useRouter();
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const selectedImage = product.images[selectedImageIndex] || "";

  const handlePrevImage = () => {
    setSelectedImageIndex((prev) => (prev > 0 ? prev - 1 : product.images.length - 1));
  };

  const handleNextImage = () => {
    setSelectedImageIndex((prev) => (prev < product.images.length - 1 ? prev + 1 : 0));
  };
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);

  const [addedEffect, setAddedEffect] = useState(false);

  const addItem = useCartStore((state) => state.addItem);

  const formatBDT = (price: number) => {
    return `৳${price.toLocaleString("en-IN")}`;
  };

  const totalStock = product.variants.reduce((acc, v) => acc + v.stock, 0);

  const selectedVariantStock = selectedSize
    ? product.variants.find(v => v.size === selectedSize)?.stock || 0
    : 0;

  let finalPrice = product.price;
  let isDiscounted = false;

  if (product.discount && product.discount.active) {
    isDiscounted = true;
    if (product.discount.discountType === "PERCENTAGE") {
      finalPrice = product.price - (product.price * (product.discount.value / 100));
    } else {
      finalPrice = Math.max(0, product.price - product.discount.value);
    }
  }

  const handleAddToCart = () => {
    if (!selectedSize) return;

    addItem({
      id: product.id,
      name: product.name,
      price: finalPrice,
      image: product.images[0] || "",
      category: product.team,
    }, selectedSize, quantity);

    setAddedEffect(true);
    setTimeout(() => setAddedEffect(false), 2000);
  };

  const handleBuyNow = () => {
    if (!selectedSize) return;
    handleAddToCart();
    router.push('/checkout');
  };

  const incrementQuantity = () => {
    if (selectedSize) {
      if (quantity < selectedVariantStock) setQuantity(q => q + 1);
    } else {
      setQuantity(q => q + 1); // allow guessing before size select
    }
  };

  const decrementQuantity = () => {
    if (quantity > 1) {
      setQuantity(q => q - 1);
    }
  };

  return (
    <div className="bg-white min-h-screen pb-16">
      <div className="container mx-auto px-4 py-8 md:py-16">

        {/* Top Product Section */}
        <div className="flex flex-col lg:flex-row items-start gap-12 lg:gap-24 mb-24">

          {/* Left: Product Images */}
          <div className="w-full lg:w-1/2 flex flex-col gap-4">
            {/* Main Image */}
            <div className="relative w-full aspect-[4/5] bg-[#F9F9F9] flex items-center justify-center group overflow-hidden rounded-md shadow-sm border border-slate-100">
              {selectedImage ? (
                <Image
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
                <div className="absolute top-4 left-4 z-20 bg-red-600 text-white text-xs font-black uppercase tracking-widest px-3 py-1.5 rounded-sm shadow-md">
                  {product.discount!.discountType === "PERCENTAGE" 
                    ? `${product.discount!.value}% OFF` 
                    : `৳${product.discount!.value} OFF`}
                </div>
              )}
            </div>

            {/* Thumbnails Row */}
            <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide w-full">
              {product.images.map((img, idx) => (
                <button
                  key={idx}
                  onClick={() => setSelectedImageIndex(idx)}
                  className={`relative w-24 h-32 flex-shrink-0 bg-[#F9F9F9] rounded-md overflow-hidden transition-all box-border ${selectedImageIndex === idx
                    ? 'opacity-100 border-[3px] border-[#800020] shadow-sm'
                    : 'opacity-70 hover:opacity-100 border border-slate-200 hover:border-[#FFD700]'
                    }`}
                >
                  <Image src={img} alt={`${product.name} view ${idx + 1}`} fill className="object-cover" />
                </button>
              ))}
            </div>
          </div>

          {/* Right: Product Details */}
          <div className="w-full lg:w-1/2 flex flex-col justify-center">

            <div className="flex items-center gap-4 mb-3">
              {totalStock > 0 ? (
                <span className="bg-green-50 text-green-700 text-[10px] font-black uppercase px-2 py-1 rounded-sm tracking-widest">
                  In Stock
                </span>
              ) : (
                <span className="bg-red-50 text-red-700 text-[10px] font-black uppercase px-2 py-1 rounded-sm tracking-widest">
                  Out of Stock
                </span>
              )}
            </div>

            <h1 className="text-2xl font-black text-zinc-900 mb-2 tracking-tight leading-[1.1] uppercase">
              {product.name}
            </h1>
            <p className="text-slate-500 font-medium mb-6 uppercase tracking-wider text-sm">{product.category} &bull; {product.team}</p>

            <div className="flex items-end gap-4 mb-8">
              <p className="text-3xl md:text-4xl font-black text-[#800020]">{formatBDT(finalPrice)}</p>
              {isDiscounted ? (
                <p className="text-lg font-bold text-zinc-400 line-through mb-1.5">{formatBDT(product.price)}</p>
              ) : null}
            </div>

            <div className="w-12 h-1 bg-[#800020] mb-8"></div>

            {/* Size Selector */}
            <div className="mb-8">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-zinc-900 text-sm uppercase tracking-widest">Select Size</h3>
              </div>

              {product.variants.length === 0 ? (
                <p className="text-red-500 font-bold">Size map not configured yet.</p>
              ) : (
                <div className="flex flex-wrap gap-3">
                  {product.variants.map((v) => (
                    <button
                      key={v.size}
                      onClick={() => {
                        setSelectedSize(v.size);
                        setQuantity(1); // Reset qty constraint when switching sizes
                      }}
                      disabled={v.stock <= 0}
                      className={`w-14 h-14 rounded-md flex flex-col items-center justify-center font-bold text-lg transition-all ${v.stock <= 0
                        ? 'bg-slate-50 text-slate-300 border-2 border-slate-200 cursor-not-allowed'
                        : selectedSize === v.size
                          ? 'bg-[#800020] text-[#FFD700] border-2 border-[#FFD700] shadow-md'
                          : 'bg-white text-zinc-900 border-2 border-slate-200 hover:border-zinc-900'
                        }`}
                    >
                      <span>{v.size}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Quantity Selector */}
            <div className="mb-10">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-zinc-900 text-sm uppercase tracking-widest">Quantity</h3>
                {selectedSize && (
                  <span className="text-xs font-semibold text-slate-500">{selectedVariantStock} units available</span>
                )}
              </div>
              <div className="flex items-center inline-flex border-2 border-slate-200 rounded-md bg-white">
                <button
                  onClick={decrementQuantity}
                  className="w-12 h-12 flex items-center justify-center text-zinc-500 hover:text-zinc-900 transition-colors"
                >
                  <Minus className="w-4 h-4" strokeWidth={3} />
                </button>
                <div className="w-12 h-12 flex items-center justify-center font-bold text-lg text-zinc-900">
                  {quantity}
                </div>
                <button
                  onClick={incrementQuantity}
                  className="w-12 h-12 flex items-center justify-center text-zinc-500 hover:text-zinc-900 transition-colors"
                >
                  <Plus className="w-4 h-4" strokeWidth={3} />
                </button>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 mb-2">
              <button
                onClick={handleAddToCart}
                disabled={!selectedSize || totalStock <= 0}
                className={`flex-1 h-14 font-black text-sm uppercase tracking-widest flex items-center justify-center gap-3 transition-all duration-300 border-2 rounded-md ${(!selectedSize || totalStock <= 0)
                  ? 'border-slate-200 bg-slate-50 text-slate-400 cursor-not-allowed'
                  : addedEffect
                    ? 'border-green-600 bg-green-50 text-green-700'
                    : 'border-[#800020] bg-white text-[#800020] hover:bg-[#800020] hover:text-white active:scale-[0.98]'
                  }`}
              >
                {addedEffect ? (
                  <>
                    <Check className="w-5 h-5" strokeWidth={3} />
                    Added
                  </>
                ) : (
                  <>
                    <ShoppingCart className="w-5 h-5" />
                    {selectedSize ? 'Add to Bag' : 'Select Size'}
                  </>
                )}
              </button>

              <button
                onClick={handleBuyNow}
                disabled={!selectedSize || totalStock <= 0}
                className={`flex-1 h-14 font-black text-sm uppercase tracking-widest flex items-center justify-center gap-3 transition-all duration-300 rounded-md ${(!selectedSize || totalStock <= 0)
                  ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                  : 'bg-[#800020] text-[#FFD700] hover:bg-[#600018] active:scale-[0.98] shadow-md'
                  }`}
              >
                <ShoppingBag className="w-5 h-5" />
                Buy Now
              </button>
            </div>
            {!selectedSize && totalStock > 0 && <p className="text-xs text-red-500 font-bold uppercase tracking-widest px-1 mt-2">Please select a size to continue</p>}

            {/* Size Chart Data Table */}
            {sizeChartData && Array.isArray(sizeChartData.data) && sizeChartData.data.length > 0 && (
              <div className="mt-10 pt-8 border-t border-slate-100">
                <h3 className="font-bold text-zinc-900 text-sm uppercase tracking-widest mb-4">Size Chart</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse border border-slate-200">
                    <thead>
                      <tr className="bg-slate-50 uppercase text-xs tracking-widest text-zinc-900">
                        <th className="p-3 border border-slate-200 font-bold">Size</th>
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
              <h3 className="text-xl font-black text-zinc-900 uppercase tracking-tight mb-4">Masterclass Design</h3>
              <p>{product.description}</p>
            </div>
            <div>
              <h3 className="text-lg font-black text-zinc-900 uppercase tracking-tight mb-4">Why You'll Love It</h3>
              <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-4">
                <li className="flex gap-3">
                  <Check className="w-5 h-5 text-[#800020] flex-shrink-0" />
                  <span><strong>Fabric:</strong> High-performance Dry-fit</span>
                </li>
                <li className="flex gap-3">
                  <Check className="w-5 h-5 text-[#800020] flex-shrink-0" />
                  <span><strong>Pattern:</strong> Sublimation printing</span>
                </li>
                <li className="flex gap-3">
                  <Check className="w-5 h-5 text-[#800020] flex-shrink-0" />
                  <span><strong>Fit:</strong> Athletic slim fit</span>
                </li>
                <li className="flex gap-3">
                  <Check className="w-5 h-5 text-[#800020] flex-shrink-0" />
                  <span><strong>Care:</strong> Machine wash cold</span>
                </li>
              </ul>
            </div>
          </div>
          <div className="space-y-6 text-zinc-600 leading-relaxed">
            <h3 className="text-xl font-black text-zinc-900 uppercase tracking-tight mb-2">Delivery Details</h3>
            <div className="bg-slate-50 p-6 rounded-md border border-slate-200">
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

      </div>
    </div>
  );
}
