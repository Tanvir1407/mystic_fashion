"use client";

import Link from "next/link";
import { useCartStore } from "@/store/cartStore";
import { useEffect, useState } from "react";

export default function Header() {
  const [mounted, setMounted] = useState(false);
  const getTotalItems = useCartStore((state) => state.getTotalItems);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <header className="sticky top-0 w-full z-50 bg-background/80 backdrop-blur-lg border-b border-maroon/10 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-8 h-20 flex justify-between items-center">
        <Link
          href="/"
          className="font-extrabold text-2xl tracking-tighter text-maroon flex items-center gap-2 group"
        >
          <span className="group-hover:text-gold transition-colors duration-300">
            Mystic
          </span>
          <span className="text-foreground">Fashion</span>
          <div className="w-2 h-2 rounded-full bg-gold ml-1"></div>
        </Link>
        
        <nav className="hidden md:flex gap-8 text-sm font-semibold tracking-wide text-foreground/80">
          <Link
            href="/"
            className="hover:text-maroon transition-colors duration-300"
          >
            Home
          </Link>
          <Link
            href="/shop"
            className="text-maroon transition-colors duration-300"
          >
            Shop Jerseys
          </Link>
        </nav>

        <div className="flex items-center gap-6">
          <button className="relative p-2 text-foreground hover:text-maroon transition-colors group">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
              className="w-6 h-6"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007zM8.625 10.5a.375.375 0 11-.75 0 .375.375 0 01.75 0zm5.932 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z"
              />
            </svg>
            <span className="absolute top-0 right-0 w-4 h-4 rounded-full bg-gold text-xs font-bold text-foreground flex items-center justify-center transform translate-x-1 -translate-y-1">
              {mounted ? getTotalItems() : 0}
            </span>
          </button>
        </div>
      </div>
    </header>
  );
}
