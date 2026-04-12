"use client";

import Image from "next/image";
import { useState } from "react";
import { useCartStore } from "@/store/cartStore";
import Link from "next/link";
// Assuming generated type product exists, but we'll use a local interface to avoid import hassle
interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  images: string[];
  sizes: string[];
  team: string;
  stock: number;
  category: string;
}

export default function ProductClient({ product }: { product: Product }) {
  const [selectedImage, setSelectedImage] = useState(product.images[0]);
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [addedEffect, setAddedEffect] = useState(false);
  const addToCart = useCartStore((state) => state.addToCart);

  const formatBDT = (price: number) => {
    return `৳${price.toLocaleString("en-IN")}`;
  };

  const handleAddToCart = () => {
    if (!selectedSize) return;
    
    addToCart({
      id: product.id,
      name: product.name,
      price: product.price,
      image: product.images[0],
      size: selectedSize,
      team: product.team,
    });

    // trigger brief visual feedback
    setAddedEffect(true);
    setTimeout(() => setAddedEffect(false), 2000);
  };

  return (
    <div>
      <Link href="/shop" className="inline-flex items-center gap-2 text-sm font-bold text-foreground/50 hover:text-maroon transition-colors mb-8">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" /></svg>
        Back to Shop
      </Link>
      
      <div className="flex flex-col lg:flex-row gap-12 lg:gap-20">
        {/* Left: Image Gallery */}
        <div className="w-full lg:w-1/2 flex flex-col gap-4">
          <div className="relative w-full aspect-[4/5] sm:aspect-square bg-slate-50 dark:bg-zinc-900/50 rounded-3xl flex items-center justify-center p-8 border border-slate-100 dark:border-zinc-800">
            <Image 
              src={selectedImage}
              alt={product.name}
              fill
              className="object-contain p-8 drop-shadow-2xl"
              priority
            />
          </div>
          {/* Thumbnails (For demo, we map the same array if it only has 1) */}
          {product.images.length > 1 && (
            <div className="flex gap-4 overflow-x-auto pb-2">
              {product.images.map((img, idx) => (
                <button 
                  key={idx}
                  onClick={() => setSelectedImage(img)}
                  className={`relative w-24 h-24 rounded-xl flex-shrink-0 bg-slate-50 border-2 transition-all ${selectedImage === img ? 'border-maroon' : 'border-transparent hover:border-gold'}`}
                >
                  <Image src={img} alt={`${product.name} view ${idx+1}`} fill className="object-contain p-2" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right: Product Details */}
        <div className="w-full lg:w-1/2 flex flex-col pt-4 lg:pt-10">
          <p className="text-gold font-extrabold tracking-widest text-sm uppercase mb-2">{product.team}</p>
          <h1 className="text-4xl sm:text-5xl font-black text-foreground mb-4 tracking-tight leading-none">{product.name}</h1>
          <p className="text-3xl font-black text-maroon mb-6">{formatBDT(product.price)}</p>
          
          <p className="text-foreground/70 text-lg leading-relaxed mb-10 max-w-xl">
            {product.description}
          </p>

          <div className="mb-10">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-foreground text-sm uppercase tracking-widest">Select Size</h3>
              <button className="text-maroon hover:text-gold text-xs font-bold transition-colors underline underline-offset-4">Size Guide</button>
            </div>
            {product.sizes.length === 0 ? (
              <p className="text-red-500 font-bold">Out of stock in all sizes</p>
            ) : (
              <div className="flex flex-wrap gap-3">
                {product.sizes.map((s) => (
                  <button
                    key={s}
                    onClick={() => setSelectedSize(s)}
                    className={`w-14 h-14 rounded-2xl flex items-center justify-center font-black text-lg transition-all border-2 ${selectedSize === s ? 'border-maroon bg-maroon text-white shadow-xl shadow-maroon/20 -translate-y-1' : 'border-slate-200 dark:border-zinc-800 text-foreground hover:border-gold hover:text-gold bg-white dark:bg-zinc-900'}`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Add to Cart Actions */}
          <div className="flex gap-4 mb-12">
            <button 
              onClick={handleAddToCart}
              disabled={!selectedSize}
              className={`flex-1 h-16 rounded-2xl font-black text-lg uppercase tracking-wider flex items-center justify-center gap-3 transition-all duration-300 ${!selectedSize ? 'bg-slate-100 text-slate-400 cursor-not-allowed dark:bg-zinc-800 dark:text-zinc-600' : addedEffect ? 'bg-green-600 text-white' : 'bg-foreground text-background hover:bg-gold hover:text-black hover:shadow-2xl hover:shadow-gold/20 active:scale-95'}`}
            >
              {addedEffect ? (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>
                  Added!
                </>
              ) : (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007zM8.625 10.5a.375.375 0 11-.75 0 .375.375 0 01.75 0zm5.932 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" /></svg>
                  {selectedSize ? 'Add to Cart' : 'Select a Size'}
                </>
              )}
            </button>
            <button className="w-16 h-16 rounded-2xl border-2 border-slate-200 dark:border-zinc-800 flex items-center justify-center text-foreground hover:border-maroon hover:text-maroon transition-all">
               <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" /></svg>
            </button>
          </div>

          {/* Details */}
          <div className="border-t border-slate-200 dark:border-zinc-800 pt-8 space-y-4">
             <div className="flex justify-between items-center py-2 border-b border-slate-100 dark:border-zinc-800/50">
               <span className="text-foreground/60 font-medium">Authentication</span>
               <span className="font-bold text-foreground">100% Genuine</span>
             </div>
             <div className="flex justify-between items-center py-2 border-b border-slate-100 dark:border-zinc-800/50">
               <span className="text-foreground/60 font-medium">Category</span>
               <span className="font-bold text-foreground">{product.category}</span>
             </div>
             <div className="flex justify-between items-center py-2">
               <span className="text-foreground/60 font-medium">Shipping</span>
               <span className="font-bold text-foreground text-green-600">Free Next Day</span>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}
