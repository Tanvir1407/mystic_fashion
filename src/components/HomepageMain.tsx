"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import ProductCard from "./ProductCard";

interface HomepageMainProps {
  products: any[];
}

const CATEGORIES = [
  { name: "Jersey", image: "/images/jersey_category.png", label: "JERSEYS" },
  { name: "T-shirt", image: "/images/tshirt_category.png", label: "T-SHIRTS" },
  { name: "Perfume", image: "/images/perfume_category.png", label: "PERFUMES" },
  { name: "Polo", image: "/images/polo_category.png", label: "POLOS" },
  { name: "Shoes", image: "/images/shoes_category.png", label: "SHOES" },
  { name: "Watch", image: "/images/watch_category.png", label: "WATCHES" },
];

const TABS = ["All", "Jersey", "T-shirt", "Perfume", "Polo", "Shoes", "Watch"];

export default function HomepageMain({ products }: HomepageMainProps) {
  const [selectedTab, setSelectedTab] = useState("All");

  // Filter products for the New Arrivals section (limit to 4 products)
  const newArrivalsProducts = products
    .filter((product) => {
      if (selectedTab === "All") return true;
      return product.category?.toLowerCase() === selectedTab.toLowerCase();
    })
    .slice(0, 4);

  // Filter products for Trending Collections (Shoes and Watches)
  const trendingProducts = products
    .filter((product) => {
      const cat = product.category?.toLowerCase();
      return cat === "shoes" || cat === "watch";
    })
    .slice(0, 8); // Top 8 items for a balanced grid

  return (
    <div className="bg-[#FAFAFA] min-h-screen text-neutral-800 antialiased font-sans">
      
      {/* 1. SHOP BY CATEGORY SECTION */}
      <section className="py-24 px-4 bg-white border-b border-neutral-100">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <h2 className="font-serif text-3xl md:text-4xl text-neutral-900 tracking-widest font-light uppercase">
              Shop By Category
            </h2>
            <div className="w-12 h-[1px] bg-[#800020] mx-auto mt-4"></div>
          </div>

          {/* Categories Grid: 6-column on desktop, 3x2 on mobile */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 md:gap-6">
            {CATEGORIES.map((cat) => (
              <Link
                key={cat.name}
                href={`/products?category=${cat.name}`}
                className="group relative block aspect-square overflow-hidden bg-neutral-100 shadow-xs hover:shadow-md transition-all duration-300"
              >
                {/* Backdrop image */}
                <Image
                  src={cat.image}
                  alt={cat.label}
                  unoptimized={true}
                  fill
                  className="object-cover transition-transform duration-700 ease-out group-hover:scale-110"
                />
                
                {/* Subtle soft backdrop overlay for depth */}
                <div className="absolute inset-0 bg-black/10 group-hover:bg-black/20 transition-colors duration-300"></div>

                {/* Flat design overlay text at bottom */}
                <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/60 to-transparent flex flex-col justify-end">
                  <span className="text-white text-xs md:text-sm font-bold tracking-widest text-center uppercase block group-hover:text-amber-100 transition-colors">
                    {cat.label}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* 2. THE NEW ARRIVALS SECTION */}
      <section className="py-24 px-4 bg-[#FAFAFA]">
        <div className="container mx-auto">
          <div className="text-center mb-12">
            <h2 className="font-serif text-3xl md:text-4xl text-neutral-900 tracking-widest font-light uppercase">
              The New Arrivals
            </h2>
            <p className="text-[10px] md:text-xs tracking-widest text-neutral-400 uppercase mt-3 font-medium">
              Crafted for comfort, styled for presence.
            </p>
            <div className="w-12 h-[1px] bg-[#800020] mx-auto mt-4"></div>
          </div>

          {/* Interactive Editorial Tabs */}
          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-3 mb-12 border-b border-neutral-200/60 pb-4 max-w-2xl mx-auto">
            {TABS.map((tab) => (
              <button
                key={tab}
                onClick={() => setSelectedTab(tab)}
                className={`pb-2 text-[11px] md:text-xs uppercase tracking-widest font-medium transition-all duration-300 relative ${
                  selectedTab === tab
                    ? "text-[#800020]"
                    : "text-neutral-400 hover:text-neutral-950"
                }`}
              >
                {tab}
                {selectedTab === tab && (
                  <span className="absolute bottom-[-1px] left-0 right-0 h-[2px] bg-[#800020] animate-in fade-in slide-in-from-bottom-1 duration-300"></span>
                )}
              </button>
            ))}
          </div>

          {/* Product Grid: 4 columns on desktop, 2 columns on mobile */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6 lg:gap-8">
            {newArrivalsProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}

            {newArrivalsProducts.length === 0 && (
              <div className="col-span-full py-24 text-center text-neutral-400 font-serif text-sm tracking-widest italic">
                No items currently available in {selectedTab}.
              </div>
            )}
          </div>

          {/* View Category Link */}
          {newArrivalsProducts.length > 0 && (
            <div className="flex justify-center mt-16">
              <Link
                href={selectedTab === "All" ? "/products" : `/products?category=${selectedTab}`}
                className="inline-flex items-center gap-2 border border-neutral-300 hover:border-neutral-800 text-neutral-800 hover:text-neutral-900 transition-colors px-8 py-3.5 text-xs font-bold uppercase tracking-widest bg-white"
              >
                View All {selectedTab === "All" ? "Products" : selectedTab}
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* 3. PREMIUM EDITORIAL BANNER SECTION */}
      <section className="relative w-full h-[50vh] min-h-[400px] md:h-[65vh] flex items-center justify-center overflow-hidden">
        {/* Background Image */}
        <Image
          src="/images/editorial_banner.png"
          alt="Luxury Editorial Lookbook"
          unoptimized={true}
          fill
          className="object-cover"
          priority
        />
        
        {/* Dark aesthetic contrast overlay */}
        <div className="absolute inset-0 bg-black/55 backdrop-blur-[2px]"></div>

        {/* Content Box */}
        <div className="relative z-10 text-center px-6 max-w-3xl">
          <span className="text-[10px] md:text-xs uppercase tracking-widest text-[#FFD700] font-bold block mb-4">
            Mystic Lookbook 2026
          </span>
          <h2 className="font-serif text-2xl sm:text-3xl md:text-5xl text-white tracking-wide leading-tight uppercase mb-8">
            Precision in Every Thread.<br />Elegance in Every Note.
          </h2>
          
          <Link
            href="/products"
            className="inline-block bg-[#800020] hover:bg-[#990026] text-white font-bold text-xs uppercase tracking-widest py-4 px-10 transition-all duration-300 active:scale-95 shadow-lg shadow-black/30 rounded-full"
          >
            ORDER NOW
          </Link>
        </div>
      </section>

      {/* 4. TRENDING COLLECTIONS SECTION */}
      <section className="py-24 px-4 bg-white">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <h2 className="font-serif text-3xl md:text-4xl text-neutral-900 tracking-widest font-light uppercase">
              Trending Collections
            </h2>
            <p className="text-[10px] md:text-xs tracking-widest text-neutral-400 uppercase mt-3 font-medium">
              Curated luxury timepieces and designer sneakers.
            </p>
            <div className="w-12 h-[1px] bg-[#800020] mx-auto mt-4"></div>
          </div>

          {/* Product Grid: 4 columns on desktop, 2 columns on mobile */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6 lg:gap-8">
            {trendingProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}

            {trendingProducts.length === 0 && (
              <div className="col-span-full py-24 text-center text-neutral-400 font-serif text-sm tracking-widest italic">
                Trending items will be featured here.
              </div>
            )}
          </div>

          <div className="flex justify-center mt-16">
            <Link
              href="/products?sort=popular"
              className="inline-flex items-center gap-2 border border-neutral-300 hover:border-neutral-800 text-neutral-800 hover:text-neutral-950 transition-colors px-8 py-3.5 text-xs font-bold uppercase tracking-widest bg-white"
            >
              Explore Trending
            </Link>
          </div>
        </div>
      </section>

    </div>
  );
}
