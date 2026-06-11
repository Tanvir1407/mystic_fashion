import Link from "next/link";
import Image from "next/image";
import AddToBagButton from "./AddToBagButton";
import { formatBDT, roundPrice } from "@/utils/formatPrice";

interface ProductCardProps {
  product: {
    id: string;
    slug?: string | null;
    name: string;
    price: number;
    images: string[];
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



export default function ProductCard({ product }: ProductCardProps) {
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

  const totalStock = product.variants ? product.variants.reduce((acc, v) => acc + (v.stock || 0), 0) : 0;
  const isOutOfStock = !!(product.trackStock && totalStock <= 0);

  return (
    <Link href={`/product/${product.slug || product.id}`} className="group">
      <div className="flex flex-col bg-white overflow-hidden transition-all duration-300 shadow-sm border border-transparent h-full relative">

        {/* Discount Badge */}
        {isDiscounted && !isOutOfStock && (
          <div className="absolute top-3 right-3 z-10 bg-primary text-white text-[10px] font-black  px-2 py-1 ">
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
              unoptimized={true}
              fill
              className={`object-cover transition-transform duration-500 group-hover:scale-105 ${isOutOfStock ? "opacity-60" : ""}`}
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
          <div className="flex items-center gap-2 mt-auto min-h-[28px]">
            {isOutOfStock ? (
              <span className="text-rose-600 dark:text-rose-400 font-black text-xs uppercase tracking-wider bg-rose-50 dark:bg-rose-950/30 px-2.5 py-0.5 rounded-sm border border-rose-100 dark:border-rose-900/40">
                Stock Out
              </span>
            ) : (
              <>
                {isDiscounted && (
                  <span className="text-zinc-400 dark:text-zinc-500 font-medium text-sm line-through">
                    {formatBDT(product.price)}
                  </span>
                )}
                <span className="text-[#800020] font-black text-base md:text-lg">
                  {formatBDT(finalPrice)}
                </span>
              </>
            )}
          </div>
          <h3 className="text-xs mm:text-sm md:text-[13px] font-medium text-zinc-800 dark:text-zinc-100 leading-snug line-clamp-2 group-hover:text-[#800020] transition-colors duration-300">
            {product.name}
          </h3>

        </div>

        {/* Add to Bag */}
        {/* <div className="px-3 pb-3 md:px-4 md:pb-4 mt-auto">
          <AddToBagButton product={{
            id: product.id,
            name: product.name,
            price: finalPrice,
            originalPrice: isDiscounted ? product.price : undefined,
            team: product.team,
            image: product.images[0] || "",
            variants: product.variants
          }} />
        </div> */}
      </div>
    </Link>
  );
}
