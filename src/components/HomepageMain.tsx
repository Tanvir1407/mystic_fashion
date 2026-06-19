"use client";

import { useState } from "react";
import Link from "next/link";
import UploadedImage from "./UploadedImage";
import ProductCard from "./ProductCard";

// DB category type passed from the server
interface CategoryData {
  id: string;
  name: string;
  image: string | null;
  sortOrder: number;
}

interface HomepageMainProps {
  initialNewArrivalsProducts: any[];
  showroomProducts: any[];
  categories: CategoryData[];
}

// Fallback images for categories that don't have a custom image uploaded
const FALLBACK_IMAGES: Record<string, string> = {
  Jersey: "/images/jersey_category.png",
  Shoes: "/images/shoes_category.png",
  Perfume: "/images/perfume_category.png",
  "T-shirt": "/images/tshirt_category.png",
  Polo: "/images/polo_category.png",
  Watch: "/images/watch_category.png",
};

// Tailored luxury subtitles per category for the editorial banner
const SUBTITLES: Record<string, string> = {
  Jersey: "Pitch Pride & Premium Wear",
  "T-shirt": "Everyday Luxury Cotton Essentials",
  Perfume: "Olfactory Art & Timeless Scents",
  Polo: "Refined Comfort & Classic Detailing",
  Shoes: "Step in Premium Designer Sneakers",
  Watch: "Timeless Precision & Masterful Craft",
};

// Convert a category name to a plural display label
function getCategoryLabel(name: string): string {
  const labels: Record<string, string> = {
    Jersey: "JERSEYS",
    Shoes: "SHOES",
    Perfume: "PERFUMES",
    "T-shirt": "T-SHIRTS",
    Polo: "POLOS",
    Watch: "WATCHES",
  };
  return labels[name] || name.toUpperCase() + "S";
}

export default function HomepageMain({
  initialNewArrivalsProducts,
  showroomProducts,
  categories,
}: HomepageMainProps) {
  // Tabs: "All" + each category name in DB sort order
  const tabNames = ["All", ...categories.map((c) => c.name)];
  const [selectedTab, setSelectedTab] = useState("All");

  // Filter products for the New Arrivals section dynamically
  const getNewArrivals = () => {
    const sortedByRecent = [...initialNewArrivalsProducts].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    if (selectedTab === "All") {
      // 'All' tab: 4 recent products, each from a unique category
      const selected: any[] = [];
      const seenCategories = new Set<string>();
      for (const p of sortedByRecent) {
        if (selected.length >= 4) break;
        const cat = (p.category || "Uncategorized").toLowerCase();
        if (!seenCategories.has(cat)) {
          seenCategories.add(cat);
          selected.push(p);
        }
      }
      return selected;
    } else {
      return sortedByRecent
        .filter((p) => p.category?.toLowerCase() === selectedTab.toLowerCase())
        .slice(0, 4);
    }
  };

  const newArrivalsProducts = getNewArrivals();

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

          {/* Categories Flex: DB-driven, sorted by sortOrder, always centered */}
          <div className="flex flex-wrap justify-center gap-4 md:gap-6">
            {categories.map((cat) => {
              const image = cat.image || FALLBACK_IMAGES[cat.name] || null;
              const label = getCategoryLabel(cat.name);
              return (
                <Link
                  key={cat.name}
                  href={`/products?category=${cat.name}`}
                  className="group relative block aspect-square overflow-hidden bg-neutral-100 shadow-xs hover:shadow-md transition-all duration-300 w-[calc(50%-8px)] sm:w-[calc(33.333%-11px)] lg:w-44 flex-none"
                >
                  {image ? (
                    <UploadedImage
                      src={image}
                      alt={label}
                      fill
                      sizes="(max-width: 640px) calc(50vw - 8px), (max-width: 1024px) calc(33vw - 11px), 176px"
                      className="object-cover transition-transform duration-700 ease-out group-hover:scale-110"
                    />
                  ) : (
                    <div className="absolute inset-0 bg-neutral-200 flex items-center justify-center">
                      <span className="text-neutral-400 text-xs font-medium">{cat.name}</span>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/10 group-hover:bg-black/20 transition-colors duration-300"></div>
                  <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/60 to-transparent flex flex-col justify-end">
                    <span className="text-white text-xs md:text-sm font-bold tracking-widest text-center uppercase block group-hover:text-amber-100 transition-colors">
                      {label}
                    </span>
                  </div>
                </Link>
              );
            })}
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

          {/* Interactive Editorial Tabs — DB-driven order */}
          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-3 mb-12 border-b border-neutral-200/60 pb-4 max-w-2xl mx-auto">
            {tabNames.map((tab) => (
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

          {/* Product Grid */}
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

      {/* 3. DYNAMIC CATEGORY SHOWCASE SHOWROOMS */}
      <section className="py-24 px-4 bg-white border-t border-neutral-100">
        <div className="container mx-auto">
          <div className="text-center mb-20">
            <h2 className="font-serif text-3xl md:text-4xl text-neutral-900 tracking-widest font-light uppercase">
              The Collection Editorial
            </h2>
            <div className="w-12 h-[1px] bg-[#800020] mx-auto mt-4"></div>
          </div>

          <div className="space-y-12 md:space-y-28">
            {categories.map((cat, idx) => {
              // Get top 4 products — 3 for desktop, 4 for mobile
              const catProducts = showroomProducts
                .filter((p) => p.category?.toLowerCase() === cat.name.toLowerCase())
                .slice(0, 4);

              if (catProducts.length === 0) return null;

              const isEven = idx % 2 === 0;
              const catImage = cat.image || FALLBACK_IMAGES[cat.name] || "/images/placeholder.png";
              const catLabel = getCategoryLabel(cat.name);

              // Shared banner inner content
              const bannerInner = (
                <>
                  <UploadedImage
                    src={catImage}
                    alt={catLabel}
                    fill
                    sizes="(max-width: 768px) 100vw, 50vw"
                    className="object-cover opacity-65 transition-transform duration-700 ease-out group-hover/banner:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-neutral-950 via-neutral-900/35 to-transparent z-10"></div>
                  <div className="relative z-20 flex flex-col">
                    <span className="text-[9px] uppercase tracking-widest text-[#FFD700] font-bold mb-1">
                      Exclusive Release
                    </span>
                    <h3 className="font-serif text-2xl text-white tracking-widest uppercase font-light leading-tight">
                      {catLabel}
                    </h3>
                    <p className="text-[10px] text-neutral-300 font-sans tracking-wide mt-2">
                      {SUBTITLES[cat.name] || "Premium Collection"}
                    </p>
                    <Link
                      href={`/products?category=${cat.name}`}
                      className="mt-6 bg-[#800020] hover:bg-[#990026] text-white text-[10px] font-bold tracking-widest uppercase py-3 px-4 text-center transition-all active:scale-95 shadow-md shadow-black/20"
                    >
                      Shop Collection
                    </Link>
                  </div>
                </>
              );

              return (
                <div key={cat.name} className="border-b border-neutral-100 pb-12 md:pb-20 last:border-0 last:pb-0">

                  {/* ── MOBILE LAYOUT: banner always on top, 4 products below ── */}
                  <div className="md:hidden space-y-4">
                    {/* Banner — full width, fixed height on mobile */}
                    <div className="relative w-full h-56 overflow-hidden bg-neutral-950 group/banner">
                      {bannerInner}
                    </div>
                    {/* 4 products in 2-col grid */}
                    <div className="grid grid-cols-2 gap-4">
                      {catProducts.map((product) => (
                        <ProductCard key={product.id} product={product} />
                      ))}
                    </div>
                  </div>

                  {/* ── DESKTOP LAYOUT: alternating banner + 3 products ── */}
                  <div className="hidden md:grid md:grid-cols-3 lg:grid-cols-4 gap-6 items-stretch">
                    {isEven ? (
                      <>
                        {/* Banner left */}
                        <div className="relative overflow-hidden bg-neutral-950 shadow-xs h-full min-h-[360px] flex flex-col justify-end p-6 group/banner">
                          {bannerInner}
                        </div>
                        {/* 3 products right */}
                        {catProducts.slice(0, 3).map((product, i) => (
                          <div key={product.id} className={`h-full ${i === 2 ? "hidden lg:block" : ""}`}>
                            <ProductCard product={product} />
                          </div>
                        ))}
                      </>
                    ) : (
                      <>
                        {/* 3 products left */}
                        {catProducts.slice(0, 3).map((product, i) => (
                          <div key={product.id} className={`h-full ${i === 2 ? "hidden lg:block" : ""}`}>
                            <ProductCard product={product} />
                          </div>
                        ))}
                        {/* Banner right */}
                        <div className="relative overflow-hidden bg-neutral-950 shadow-xs h-full min-h-[360px] flex flex-col justify-end p-6 group/banner">
                          {bannerInner}
                        </div>
                      </>
                    )}
                  </div>

                </div>
              );
            })}
          </div>
        </div>
      </section>

    </div>
  );
}
