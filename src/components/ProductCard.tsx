import Link from "next/link";
import Image from "next/image";
import { getFinalPrice, formatPrice } from "@/lib/priceUtils";

interface ProductCardProps {
  product: {
    id: string;
    slug?: string | null;
    name: string;
    images: string[];
    team: string;
    variants: {
      size: string;
      stock: number;
      pricingMatrix?: { basePrice?: number | string } | null;
    }[];
    trackStock?: boolean | null;
    discount?: {
      active: boolean;
      discountType: string;
      value: number;
    } | null;
  };
}

export default function ProductCard({ product }: ProductCardProps) {
  // --- Stock Calculation ---
  const totalStock =
    product.variants?.reduce((acc, v) => acc + (v.stock || 0), 0) || 0;
  const isOutOfStock = !!(product.trackStock && totalStock <= 0);
  const hasDiscount = !!product.discount?.active;

  // --- Variant Price Extraction ---
  const variantPrices =
    product.variants
      ?.map((v) =>
        v.pricingMatrix?.basePrice ? Number(v.pricingMatrix.basePrice) : null,
      )
      .filter((p): p is number => p !== null) ?? [];

  const hasVariantPricing = variantPrices.length > 0;

  // --- Price Display Logic ---
  let displayPrice: string | null = null;
  let isRange = false;
  let originalPrice: number | null = null;
  let originalMinPrice: number | null = null;
  let originalMaxPrice: number | null = null;

  if (hasVariantPricing) {
    // Original prices (before discount)
    const originalMin = Math.min(...variantPrices);
    const originalMax = Math.max(...variantPrices);
    originalMinPrice = originalMin;
    originalMaxPrice = originalMax;

    // Apply discount to each variant price
    const finalPrices = variantPrices.map((p) =>
      getFinalPrice(p, product.discount),
    );
    const minPrice = Math.min(...finalPrices);
    const maxPrice = Math.max(...finalPrices);

    isRange = minPrice !== maxPrice;

    if (isRange) {
      displayPrice = `${formatPrice(minPrice)} – ${formatPrice(maxPrice)}`;
    } else {
      displayPrice = formatPrice(minPrice);
      originalPrice = Math.min(...variantPrices);
    }
  } else {
    displayPrice = null;
    isRange = false;
    originalPrice = null;
    originalMinPrice = null;
    originalMaxPrice = null;
  }

  // Show strikethrough conditions:
  // 1. Single price → show originalPrice with strikethrough
  const showSingleStrikethrough =
    hasDiscount && !isRange && originalPrice !== null && displayPrice !== null;

  // 2. Range → show original range with strikethrough
  const showRangeStrikethrough =
    hasDiscount &&
    isRange &&
    originalMinPrice !== null &&
    originalMaxPrice !== null &&
    displayPrice !== null;

  return (
    <Link href={`/product/${product.slug || product.id}`} className="group">
      <div className="flex flex-col bg-white overflow-hidden transition-all duration-300 shadow-sm border border-transparent h-full relative">
        {/* Discount Badge */}
        {hasDiscount && !isOutOfStock && (
          <div className="absolute top-3 right-3 z-10 bg-primary text-white text-[10px] font-black px-2 py-1">
            {product.discount!.discountType === "PERCENTAGE"
              ? `${product.discount!.value}% OFF`
              : `৳${product.discount!.value} OFF`}
          </div>
        )}

        {/* Image Section */}
        <div className="relative w-full aspect-[3/4] bg-[#F5F5F5] dark:bg-zinc-800 overflow-hidden">
          {product.images[0] ? (
            <Image
              src={product.images[0]}
              alt={product.name}
              unoptimized
              fill
              className={`object-cover transition-transform duration-500 group-hover:scale-105 ${
                isOutOfStock ? "opacity-60" : ""
              }`}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-slate-400 text-sm font-medium">
              View Product
            </div>
          )}

          {/* Out of Stock Overlay */}
          {isOutOfStock && (
            <div className="absolute inset-0 bg-black/30 backdrop-blur-[1px] flex items-center justify-center z-10">
              <span className="bg-white/95 text-[#800020] text-[10px] font-black uppercase tracking-widest px-3 py-1.5 shadow-sm border border-rose-100 dark:border-rose-900/20">
                Stock Out
              </span>
            </div>
          )}
        </div>

        {/* Product Info */}
        <div className="px-3 pb-4 pt-3 flex flex-col gap-1.5 flex-1">
          <div className="flex flex-wrap items-center gap-2 mt-auto min-h-[28px]">
            {isOutOfStock ? (
              <span className="text-rose-600 dark:text-rose-400 font-black text-xs uppercase tracking-wider bg-rose-50 dark:bg-rose-950/30 px-2.5 py-0.5 rounded-sm border border-rose-100 dark:border-rose-900/40">
                Stock Out
              </span>
            ) : (
              <>
                {/* Strikethrough for SINGLE price */}
                {showSingleStrikethrough && (
                  <span className="text-zinc-400 dark:text-zinc-500 font-medium text-sm line-through">
                    {formatPrice(originalPrice!)}
                  </span>
                )}

                {/* Strikethrough for RANGE price */}
                {showRangeStrikethrough && (
                  <span className="text-zinc-400 dark:text-zinc-500 font-medium text-xs line-through">
                    {formatPrice(originalMinPrice!)} –{" "}
                    {formatPrice(originalMaxPrice!)}
                  </span>
                )}

                {/* Main Display Price */}
                {displayPrice ? (
                  <span className="text-[#800020] font-black text-base md:text-lg">
                    {displayPrice}
                  </span>
                ) : (
                  <span className="text-zinc-400 text-sm font-medium">N/A</span>
                )}
              </>
            )}
          </div>

          <h3 className="text-xs mm:text-sm md:text-[13px] font-medium text-zinc-800 dark:text-zinc-100 leading-snug line-clamp-2 group-hover:text-[#800020] transition-colors duration-300">
            {product.name}
          </h3>

          {/* AddToBagButton was here — removed, see src/components/AddToBagButton.tsx if needed */}
        </div>
      </div>
    </Link>
  );
}
