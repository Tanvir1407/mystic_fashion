"use client";

import { useCartStore } from "@/store/cartStore";
import { useState } from "react";
import { X } from "lucide-react";

interface AddToBagButtonProps {
  product: {
    id: number | string;
    name: string;
    price: number;
    team: string;
    image: string;
    originalPrice?: number;
    variants?: { size: string, stock: number }[];
  };
}

export default function AddToBagButton({ product }: AddToBagButtonProps) {
  const addItem = useCartStore((state) => state.addItem);
  const [added, setAdded] = useState(false);
  const [selectingSize, setSelectingSize] = useState(false);

  const availableVariants = product.variants?.filter(v => v.stock > 0) || [];

  const handleAddClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // If we have sizes to choose from
    if (availableVariants.length > 0) {
      if (availableVariants.length === 1) {
        // Just add the only available size
        addToCartConfirmed(availableVariants[0].size);
      } else {
        // Open size selector inline
        setSelectingSize(true);
      }
    } else {
      // Fallback if no sizes configured
      addToCartConfirmed("M");
    }
  };

  const addToCartConfirmed = (size: string) => {
    addItem({
      id: product.id,
      name: product.name,
      price: product.price,
      originalPrice: product.originalPrice,
      image: product.image,
      category: product.team
    }, size);

    setSelectingSize(false);
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  if (selectingSize) {
    return (
      <div
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
        /* Removed flex items-center to allow the box to grow vertically 
           if sizes wrap to a second line.
        */
        className="w-full flex justify-between bg-zinc-100 rounded-lg p-2 animate-in fade-in zoom-in duration-200 min-h-[44px]"
      >
        {/* 1. flex-wrap: The magic fix for the XXL problem.
          2. gap-1.5: Adds space between rows and columns.
          3. flex-1: Takes up the available space before the 'X' button.
      */}
        <div className="flex flex-wrap flex-1 items-center justify-start gap-1.5">
          {availableVariants.map((v) => (
            <button
              key={v.size}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                addToCartConfirmed(v.size);
              }}
              /* w-9 h-9 is a better tap target for mobile thumbs */
              className="flex-shrink-0 w-9 h-9 rounded-md bg-white border border-slate-200 text-xs font-bold text-zinc-900 hover:bg-primary hover:text-gold hover:border-primary transition-all active:scale-90"
            >
              {v.size}
            </button>
          ))}
        </div>

        {/* Close Button: 
          h-full and self-start ensures it stays aligned correctly 
          even if the size list grows to 2 or 3 rows.
      */}
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setSelectingSize(false);
          }}
          className="w-8 h-9 flex items-center justify-center text-zinc-400 hover:text-red-500 transition-colors flex-shrink-0 border-l border-slate-200 ml-2"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    );
  }

  // if (selectingSize) {
  //   return (
  //     <div
  //       onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
  //       className="w-full flex items-center justify-between bg-zinc-100 rounded-lg p-1 animate-in fade-in zoom-in duration-200"
  //     >
  //       <div className="flex flex-1 items-center justify-start gap-1  scrollbar-hide px-1">
  //         {availableVariants.map(v => (
  //           <button
  //             key={v.size}
  //             onClick={(e) => { e.preventDefault(); e.stopPropagation(); addToCartConfirmed(v.size); }}
  //             className="flex-shrink-0 w-8 h-8 rounded-md bg-white border border-slate-200 text-xs font-bold text-zinc-900 hover:bg-primary hover:text-gold hover:border-primary transition-colors"
  //           >
  //             {v.size}
  //           </button>
  //         ))}
  //       </div>
  //       <button
  //         onClick={(e) => { e.preventDefault(); e.stopPropagation(); setSelectingSize(false); }}
  //         className="w-8 h-8 flex items-center justify-center text-zinc-400 hover:text-red-500 transition-colors flex-shrink-0 border-l border-slate-200 ml-1"
  //       >
  //         <X className="w-4 h-4" />
  //       </button>
  //     </div>
  //   );
  // }

  return (
    <button
      onClick={handleAddClick}
      className={`w-full text-white py-2.5 rounded-lg font-bold text-xs md:text-sm uppercase tracking-wider transition-all duration-300 flex items-center justify-center gap-2 active:scale-[0.97] ${added ? 'bg-green-600 text-white' : 'bg-primary text-gold hover:bg-[#600018]'}`}
    >
      {added ? (
        <>
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth="3" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
          </svg>
          Added!
        </>
      ) : (
        <>
          <svg className="hidden ml:block w-4 h-4" viewBox="0 0 21 22" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path fillRule="evenodd" clipRule="evenodd" d="M6.48626 20.5H14.8341C17.9004 20.5 20.2528 19.3924 19.5847 14.9348L18.8066 8.89359C18.3947 6.66934 16.976 5.81808 15.7311 5.81808H5.55262C4.28946 5.81808 2.95308 6.73341 2.4771 8.89359L1.69907 14.9348C1.13157 18.889 3.4199 20.5 6.48626 20.5Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M6.34902 5.5984C6.34902 3.21232 8.28331 1.27803 10.6694 1.27803C11.8184 1.27316 12.922 1.72619 13.7362 2.53695C14.5504 3.3477 15.0081 4.44939 15.0081 5.5984" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Add to Bag
        </>
      )}
    </button>
  );
}
