"use client";

import { useCartStore } from "@/store/cartStore";
import { useState } from "react";

interface AddToBagButtonProps {
  product: {
    id: number | string;
    name: string;
    price: number;
    team: string;
    image: string;
  };
}

export default function AddToBagButton({ product }: AddToBagButtonProps) {
  const addItem = useCartStore((state) => state.addItem);
  const toggleCart = useCartStore((state) => state.toggleCart);
  const isOpen = useCartStore((state) => state.isOpen);
  const [added, setAdded] = useState(false);

  const handleAdd = (e: React.MouseEvent) => {
    e.preventDefault(); // Prevent navigating if this is wrapped in a Link
    e.stopPropagation();

    // The cartStore addItem expects (product, size)
    addItem({
      id: product.id,
      name: product.name,
      price: product.price,
      image: product.image,
      category: product.team
    }, "M"); // Default size since it's the homepage quick add

    setAdded(true);
    setTimeout(() => setAdded(false), 2000);

    // Open cart if it isn't open
    if (!isOpen) {
      toggleCart();
    }
  };

  return (
    <button 
      onClick={handleAdd}
      className={`w-full text-white py-2.5 rounded-lg font-bold text-sm uppercase tracking-wider transition-all duration-300 flex items-center justify-center gap-2 active:scale-[0.97] ${added ? 'bg-green-600 text-white' : 'bg-primary text-gold hover:bg-[#600018]'}`}
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
          <svg className="w-4 h-4" viewBox="0 0 21 22" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path fillRule="evenodd" clipRule="evenodd" d="M6.48626 20.5H14.8341C17.9004 20.5 20.2528 19.3924 19.5847 14.9348L18.8066 8.89359C18.3947 6.66934 16.976 5.81808 15.7311 5.81808H5.55262C4.28946 5.81808 2.95308 6.73341 2.4771 8.89359L1.69907 14.9348C1.13157 18.889 3.4199 20.5 6.48626 20.5Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M6.34902 5.5984C6.34902 3.21232 8.28331 1.27803 10.6694 1.27803C11.8184 1.27316 12.922 1.72619 13.7362 2.53695C14.5504 3.3477 15.0081 4.44939 15.0081 5.5984" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Add to Bag
        </>
      )}
    </button>
  );
}
