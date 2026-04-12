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
  
  // Use addItem as expected from the updated store
  const addItem = useCartStore((state) => state.addItem);
  const toggleCart = useCartStore((state) => state.toggleCart);
  const isOpen = useCartStore((state) => state.isOpen);

  const formatBDT = (price: number) => {
    return `৳${price.toLocaleString("en-IN")}`;
  };

  const handleAddToCart = () => {
    if (!selectedSize) return;
    
    addItem({
      id: product.id,
      name: product.name,
      price: product.price,
      image: product.images[0],
      category: product.team, // Map team to category if needed by cart store
    }, selectedSize);

    // trigger brief visual feedback
    setAddedEffect(true);
    setTimeout(() => setAddedEffect(false), 2000);
    
    // Auto-open cart just like AddToBagButton used to do, or maybe leave closed?
    // User requested "only open sideCart when click cart button", so we do NOT open cart here!
  };

  return (
    <div className="bg-white min-h-screen">
      <div className="container mx-auto px-4 py-8 md:py-16">
        
        <Link href="/" className="inline-flex items-center gap-2 text-sm font-bold text-zinc-400 hover:text-primary transition-colors mb-8 md:mb-12 uppercase tracking-widest">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" /></svg>
          Back to Collections
        </Link>
        
        <div className="flex flex-col lg:flex-row gap-12 lg:gap-24">
          
          {/* Left: Product Images */}
          <div className="w-full lg:w-1/2 flex flex-col gap-6">
            <div className="relative w-full aspect-[4/5] bg-[#F9F9F9] flex items-center justify-center p-8 group overflow-hidden">
              <Image 
                src={selectedImage}
                alt={product.name}
                fill
                className="object-contain p-8 md:p-16 transition-transform duration-700 group-hover:scale-105"
                priority
              />
              <div className="absolute top-6 left-6 bg-primary text-gold text-[10px] font-black uppercase px-4 py-1.5 tracking-widest">
                Official
              </div>
            </div>
            
            {/* Thumbnails */}
            {product.images.length > 1 && (
              <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
                {product.images.map((img, idx) => (
                  <button 
                    key={idx}
                    onClick={() => setSelectedImage(img)}
                    className={`relative w-24 h-32 flex-shrink-0 bg-[#F9F9F9] transition-all ${selectedImage === img ? 'opacity-100 ring-2 ring-primary ring-offset-2' : 'opacity-60 hover:opacity-100'}`}
                  >
                    <Image src={img} alt={`${product.name} view ${idx+1}`} fill className="object-contain p-3" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Right: Product Details */}
          <div className="w-full lg:w-1/2 flex flex-col justify-center">
            
            <p className="text-zinc-500 font-bold tracking-widest text-xs uppercase mb-3">{product.team}</p>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-black text-zinc-900 mb-6 tracking-tight leading-[1.1] uppercase">
              {product.name}
            </h1>
            
            <div className="flex items-end gap-4 mb-8">
              <p className="text-3xl md:text-4xl font-black text-primary">{formatBDT(product.price)}</p>
              <p className="text-lg font-bold text-zinc-400 line-through mb-1.5">{formatBDT(Math.round(product.price * 1.15))}</p>
            </div>
            
            <div className="w-12 h-1 bg-primary mb-8"></div>
            
            <p className="text-zinc-500 text-lg leading-relaxed mb-10 max-w-xl">
              {product.description}
            </p>

            {/* Size Selector */}
            <div className="mb-10">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-zinc-900 text-sm uppercase tracking-widest">Select Size</h3>
                <button className="text-zinc-500 hover:text-primary text-xs font-bold transition-colors underline underline-offset-4 uppercase tracking-widest">Size Guide</button>
              </div>
              
              {product.sizes.length === 0 ? (
                <p className="text-red-500 font-bold">Out of stock in all sizes</p>
              ) : (
                <div className="flex flex-wrap gap-3">
                  {product.sizes.map((s) => (
                    <button
                      key={s}
                      onClick={() => setSelectedSize(s)}
                      className={`w-14 h-14 flex items-center justify-center font-bold text-lg transition-all ${selectedSize === s ? 'bg-primary text-gold border-2 border-primary' : 'bg-white text-zinc-900 border-2 border-slate-200 hover:border-zinc-900'}`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 mb-16">
              <button 
                onClick={handleAddToCart}
                disabled={!selectedSize}
                className={`flex-1 h-16 font-black text-sm uppercase tracking-widest flex items-center justify-center gap-3 transition-all duration-300 ${!selectedSize ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : addedEffect ? 'bg-green-600 text-white' : 'bg-primary text-gold hover:bg-[#600018] active:scale-[0.98]'}`}
              >
                {addedEffect ? (
                  <>
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                    </svg>
                    Added to Bag!
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" viewBox="0 0 21 22" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path fillRule="evenodd" clipRule="evenodd" d="M6.48626 20.5H14.8341C17.9004 20.5 20.2528 19.3924 19.5847 14.9348L18.8066 8.89359C18.3947 6.66934 16.976 5.81808 15.7311 5.81808H5.55262C4.28946 5.81808 2.95308 6.73341 2.4771 8.89359L1.69907 14.9348C1.13157 18.889 3.4199 20.5 6.48626 20.5Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      <path d="M6.34902 5.5984C6.34902 3.21232 8.28331 1.27803 10.6694 1.27803C11.8184 1.27316 12.922 1.72619 13.7362 2.53695C14.5504 3.3477 15.0081 4.44939 15.0081 5.5984" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    {selectedSize ? 'Add to Bag' : 'Select a Size'}
                  </>
                )}
              </button>
            </div>

            {/* Product Meta Details */}
            <div className="border-t border-slate-100 pt-8 space-y-4">
               <div className="flex justify-between items-center py-2 border-b border-slate-50">
                 <span className="text-zinc-500 font-bold uppercase tracking-widest text-xs">Authentication</span>
                 <span className="font-bold text-zinc-900 text-sm">100% Genuine</span>
               </div>
               <div className="flex justify-between items-center py-2 border-b border-slate-50">
                 <span className="text-zinc-500 font-bold uppercase tracking-widest text-xs">Category</span>
                 <span className="font-bold text-zinc-900 text-sm">{product.category}</span>
               </div>
               <div className="flex justify-between items-center py-2">
                 <span className="text-zinc-500 font-bold uppercase tracking-widest text-xs">Shipping</span>
                 <span className="font-bold text-primary text-sm flex items-center gap-2">
                   <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.498 17.498 0 00-3.213-9.193 2.25 2.25 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" /></svg>
                   Fast Delivery
                 </span>
               </div>
            </div>
            
          </div>
        </div>
      </div>
    </div>
  );
}
