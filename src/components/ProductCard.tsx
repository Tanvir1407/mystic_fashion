import Link from "next/link";
import { memo, useMemo } from "react";
import UploadedImage from "./UploadedImage";
import AddToBagButton from "./AddToBagButton";
import { formatBDT, roundPrice, parsePrice } from "@/utils/formatPrice";

interface ProductCardProps {
  product: {
    id: string;
    slug?: string | null;
    name: string;
    price: number;
    images?: string[];
    team: string;
    variants: any[];
    trackStock?: boolean | null;
    discount?: {
      active: boolean;
      discountType: string;
      value: number;
    } | null;
  };
}

const ProductCard = memo(function ProductCard({ product }: ProductCardProps) {
  const derived = useMemo(() => {
    const productPrice = parsePrice(product.price);
    let finalPrice = productPrice;
    let isDiscounted = false;

    if (product.discount && product.discount.active) {
      isDiscounted = true;
      if (product.discount.discountType === "PERCENTAGE") {
        finalPrice = roundPrice(productPrice - (productPrice * (product.discount.value / 100)));
      } else {
        finalPrice = roundPrice(Math.max(0, productPrice - product.discount.value));
      }
    }

    let hasMultiplePrices = false;
    let minPrice = finalPrice;
    let maxPrice = finalPrice;
    let originalMinPrice = productPrice;
    let originalMaxPrice = productPrice;

    if (product.variants && product.variants.length > 0) {
      const variantPrices = product.variants.map((v: any) => {
        let vPrice = productPrice;
        if (v.price !== undefined) {
          vPrice = parsePrice(v.price);
        } else if (v.pricingMatrix?.basePrice !== undefined) {
          vPrice = parsePrice(v.pricingMatrix.basePrice);
        }
        return vPrice;
      });

      const vMin = Math.min(...variantPrices);
      const vMax = Math.max(...variantPrices);

      if (vMax > vMin) {
        hasMultiplePrices = true;
        originalMinPrice = vMin;
        originalMaxPrice = vMax;
        minPrice = vMin;
        maxPrice = vMax;

        if (product.discount && product.discount.active) {
          if (product.discount.discountType === "PERCENTAGE") {
            minPrice = roundPrice(vMin - (vMin * (product.discount.value / 100)));
            maxPrice = roundPrice(vMax - (vMax * (product.discount.value / 100)));
          } else {
            minPrice = roundPrice(Math.max(0, vMin - product.discount.value));
            maxPrice = roundPrice(Math.max(0, vMax - product.discount.value));
          }
        }
      } else if (vMin > 0) {
        originalMinPrice = vMin;
        finalPrice = vMin;
        if (product.discount && product.discount.active) {
          if (product.discount.discountType === "PERCENTAGE") {
            finalPrice = roundPrice(vMin - (vMin * (product.discount.value / 100)));
          } else {
            finalPrice = roundPrice(Math.max(0, vMin - product.discount.value));
          }
        }
      }
    }

    const totalStock = product.variants
      ? product.variants.reduce((acc: number, v: any) => acc + (v.stock ?? 0), 0)
      : 0;
    const isOutOfStock = !!(product.trackStock && totalStock <= 0);

    return { finalPrice, isDiscounted, hasMultiplePrices, minPrice, maxPrice, originalMinPrice, originalMaxPrice, totalStock, isOutOfStock };
  }, [product.id, product.price, product.discount?.active, product.discount?.value, product.discount?.discountType, product.variants, product.trackStock]);

  const { finalPrice, isDiscounted, hasMultiplePrices, minPrice, maxPrice, originalMinPrice, originalMaxPrice, isOutOfStock } = derived;
  const productImages = product.images || [];

  return (
    <Link href={`/product/${product.slug || product.id}`} className="group">
      <div className="flex flex-col bg-white overflow-hidden transition-all duration-300 shadow-sm border border-transparent h-full relative">

        {/* Sold Out / Discount Badge */}
        {isOutOfStock ? (
          <div className="absolute top-3 right-3 z-10 bg-zinc-400 text-white text-[10px] font-black px-2 py-1 uppercase tracking-wider shadow-sm">
            Sold Out
          </div>
        ) : (
          isDiscounted && (
            <div className="absolute top-3 right-3 z-10 bg-primary text-white text-[10px] font-black px-2 py-1 shadow-sm">
              {product.discount!.discountType === "PERCENTAGE"
                ? `${product.discount!.value}% OFF`
                : `৳${product.discount!.value} OFF`}
            </div>
          )
        )}

        {/* Image Section */}
        <div className="relative w-full aspect-[3/4] bg-[#F5F5F5] dark:bg-zinc-800 overflow-hidden">
          {productImages[0] ? (
            <UploadedImage
              src={productImages[0]}
              alt={product.name}
              fill
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
              className="object-cover transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-slate-400 text-sm font-medium">
              View Product
            </div>
          )}
        </div>

        {/* Product Info */}
        <div className="px-3 pb-4 pt-3 flex flex-col gap-1.5 flex-1">
          <div className="flex items-baseline gap-2 mt-auto">
            {isDiscounted && (
              <span className="text-zinc-400 dark:text-zinc-500  text-sm line-through">
                {hasMultiplePrices ? `${formatBDT(originalMinPrice)} - ${formatBDT(originalMaxPrice)}` : formatBDT(originalMinPrice)}
              </span>
            )}
            <span className="text-[#800020] font-semibold text-sm md:text-base">
              {hasMultiplePrices ? `${formatBDT(minPrice)} - ${formatBDT(maxPrice)}` : formatBDT(finalPrice)}
            </span>
          </div>
          <h3 className="text-xs mm:text-sm md:text-[13px] font-medium text-zinc-800 dark:text-zinc-100 leading-snug line-clamp-2 group-hover:text-[#800020] transition-colors duration-300">
            {product.name}
          </h3>
        </div>
      </div>
    </Link>
  );
});

export default ProductCard;
