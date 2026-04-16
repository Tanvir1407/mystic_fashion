import Link from "next/link";
import Image from "next/image";
import AddToBagButton from "./AddToBagButton";

interface ProductCardProps {
  product: {
    id: string;
    name: string;
    price: number;
    images: string[];
    team: string;
    variants: any[];
    discount?: {
      active: boolean;
      discountType: string;
      value: number;
    } | null;
  };
}

function formatBDT(price: number) {
  return `৳${price.toLocaleString("en-IN")}`;
}

export default function ProductCard({ product }: ProductCardProps) {
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

  return (
    <Link href={`/product/${product.id}`} className="group">
      <div className="flex flex-col bg-white dark:bg-zinc-900 rounded-xl overflow-hidden transition-all duration-300 shadow border border-transparent hover:border-slate-200 dark:hover:border-zinc-700 h-full relative">

        {/* Discount Badge */}
        {isDiscounted && (
          <div className="absolute top-3 right-3 z-10 bg-red-600 text-white text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-sm shadow-md">
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
              className="object-cover transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-slate-400 text-sm font-medium">
              View Product
            </div>
          )}
        </div>

        {/* Product Info */}
        <div className="p-3 md:p-4 flex flex-col gap-1.5 flex-1">
          <h3 className="text-xs mm:text-sm md:text-[15px] font-bold text-zinc-800 dark:text-zinc-100 leading-snug line-clamp-2 group-hover:text-[#800020] transition-colors duration-300">
            {product.name}
          </h3>
          <div className="flex items-baseline gap-2 mt-auto pt-2">
            {isDiscounted && (
              <span className="text-zinc-400 dark:text-zinc-500 font-medium text-sm line-through">
                {formatBDT(product.price)}
              </span>
            )}
            <span className="text-[#800020] font-black text-base md:text-lg">
              {formatBDT(finalPrice)}
            </span>
          </div>
        </div>

        {/* Add to Bag */}
        <div className="px-3 pb-3 md:px-4 md:pb-4 mt-auto">
          <AddToBagButton product={{
            id: product.id,
            name: product.name,
            price: finalPrice,
            originalPrice: isDiscounted ? product.price : undefined,
            team: product.team,
            image: product.images[0] || "",
            variants: product.variants
          }} />
        </div>
      </div>
    </Link>
  );
}
