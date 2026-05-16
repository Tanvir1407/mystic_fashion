"use client";

import Image from "next/image";
import UploadedImage from "@/components/UploadedImage";
import { useState } from "react";
import { useCartStore } from "@/store/cartStore";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatBDT, roundPrice } from "@/utils/formatPrice";

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



  const totalStock = product.variants.reduce((acc, v) => acc + v.stock, 0);

  const selectedVariantStock = selectedSize
    ? product.variants.find(v => v.size === selectedSize)?.stock || 0
    : 0;

  let finalPrice = product.price;
  let isDiscounted = false;

  if (product.discount && product.discount.active) {
    isDiscounted = true;
    if (product.discount.discountType === "PERCENTAGE") {
      finalPrice = roundPrice(product.price - (product.price * (product.discount.value / 100)));
    } else {
      finalPrice = roundPrice(Math.max(0, product.price - product.discount.value));
    }
  }

  const handleAddToCart = () => {
    if (!selectedSize) return;

    addItem({
      id: product.id,
      name: product.name,
      price: finalPrice,
      originalPrice: isDiscounted ? product.price : undefined,
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

        {/* Top Product Section */}
        <div className="flex flex-col lg:flex-row items-start gap-12 lg:gap-24 mb-24">

          {/* Left: Product Images */}
          <div className="w-full lg:w-1/2 flex flex-col gap-4">
            {/* Main Image */}
            <div className="relative w-full aspect-[4/5] bg-[#F9F9F9] flex items-center justify-center group overflow-hidden rounded-md shadow-sm border border-slate-100">
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
                  <UploadedImage src={img} alt={`${product.name} view ${idx + 1}`} fill className="object-cover" />
                </button>
              ))}
            </div>
          </div>

          {/* Right: Product Details */}
          <div className="w-full lg:w-1/2 flex flex-col justify-center">

            <div className="flex items-center gap-4 mb-3">
            </div>

            <h1 className="text-2xl font-black text-zinc-900 mb-2  leading-[1.1] ">
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
              <div className="flex justify-between items-center mb-3">
                <h3 className="font-semibold text-zinc-900 text-sm uppercase tracking-widest">Select Size</h3>
              </div>

              {product.variants.length === 0 ? (
                <p className="text-red-500 font-medium text-sm">Size map not configured yet.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {product.variants.map((v) => (
                    <button
                      key={v.size}
                      onClick={() => {
                        setSelectedSize(v.size);
                        setQuantity(1);
                      }}
                      className={`h-12 px-6 flex items-center justify-center font-semibold text-sm transition-colors border ${selectedSize === v.size
                        ? 'bg-primary text-white border-primary'
                        : 'bg-white text-zinc-900 border-zinc-200 hover:border-primary hover:text-primary'
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
              <div className="flex justify-between items-center mb-3">
                <h3 className="font-semibold text-zinc-900 text-sm uppercase tracking-widest">Quantity</h3>
              </div>
              <div className="inline-flex border border-zinc-200 h-12">
                <button
                  onClick={decrementQuantity}
                  className="w-12 h-full flex items-center justify-center text-zinc-500 hover:text-zinc-900 hover:bg-zinc-50 transition-colors"
                >
                  <Minus className="w-4 h-4" strokeWidth={1.5} />
                </button>
                <div className="w-12 h-full flex items-center justify-center font-medium text-sm text-zinc-900 border-l border-r border-zinc-200">
                  {quantity}
                </div>
                <button
                  onClick={incrementQuantity}
                  className="w-12 h-full flex items-center justify-center text-zinc-500 hover:text-zinc-900 hover:bg-zinc-50 transition-colors"
                >
                  <Plus className="w-4 h-4" strokeWidth={1.5} />
                </button>
              </div>
            </div>


            {!selectedSize && <p className="text-xs text-red-500 font-medium mt-3">Please select a size to continue</p>}

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 mt-8">
              <button
                onClick={handleAddToCart}
                disabled={!selectedSize}
                className={`md:flex-1 h-14 font-semibold text-xs md:text-sm uppercase tracking-[0.1em] flex items-center justify-center gap-2 transition-colors border ${(!selectedSize)
                  ? 'border-zinc-200 bg-zinc-50 text-zinc-400 cursor-not-allowed'
                  : addedEffect
                    ? 'border-green-600 bg-white text-green-600'
                    : 'border-primary bg-white text-primary hover:bg-primary hover:text-white'
                  }`}
              >
                {addedEffect ? (
                  <>
                    <Check className="w-4 h-4" />
                    Added to Bag
                  </>
                ) : (
                  <>
                    <ShoppingBag className="w-4 h-4" />
                    {selectedSize ? 'Add to Bag' : 'Select Size'}
                  </>
                )}
              </button>

              <button
                onClick={handleBuyNow}
                disabled={!selectedSize}
                className={`md:flex-1 h-14 font-semibold text-xs md:text-sm uppercase tracking-[0.1em] flex items-center justify-center gap-2 transition-colors border ${(!selectedSize)
                  ? 'border-zinc-200 bg-zinc-200 text-zinc-400 cursor-not-allowed'
                  : 'border-primary bg-primary text-white hover:bg-primary/90 hover:border-primary/90'
                  }`}
              >
                <ShoppingCart className="w-4 h-4" />
                Buy it Now
              </button>
            </div>

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

      </div>
    </div>
  );
}
