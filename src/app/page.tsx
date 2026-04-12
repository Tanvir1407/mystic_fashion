import Header from "@/components/Header";
import HeroCarousel from "@/components/HeroCarousel";
import SidebarCart from "@/components/SidebarCart";
import Link from "next/link";
import Image from "next/image";

// Cute empty product placeholder SVG
function EmptyProductIcon() {
  return (
    <svg className="w-24 h-24 text-primary" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* T-shirt shape */}
      <path
        d="M30 25L20 35L30 45V75C30 77 31.5 78.5 33.5 78.5H66.5C68.5 78.5 70 77 70 75V45L80 35L70 25H60C60 30.5 55.5 35 50 35C44.5 35 40 30.5 40 25H30Z"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="currentColor"
        fillOpacity="0.06"
      />
      {/* Hanger */}
      <path
        d="M50 15V20"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <circle cx="50" cy="13" r="3" stroke="currentColor" strokeWidth="2" fill="none" />
      {/* Sparkle left */}
      <path d="M18 20L20 22M16 22L22 20" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.5" />
      {/* Sparkle right */}
      <path d="M78 55L80 57M76 57L82 55" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.5" />
    </svg>
  );
}

// Format price in BDT
function formatBDT(price: number) {
  return `৳${price.toLocaleString("en-IN")}`;
}

// All mystic product images from public/images
const products = [
  { id: 1, name: "Mystic Classic Jersey", team: "Mystic FC", price: 4500, image: "/images/mystic.jpg" },
  { id: 2, name: "Mystic Home Kit", team: "Mystic FC", price: 3800, image: "/images/mystic-1.jpg" },
  { id: 3, name: "Mystic Third Kit", team: "Mystic FC", price: 4200, image: "/images/mystic-3.jpg" },
  { id: 4, name: "Mystic Away Jersey", team: "Mystic FC", price: 3900, image: "/images/mysitc-4.jpg" },
  { id: 5, name: "Mystic Pro Elite", team: "Mystic FC", price: 5500, image: "/images/mystic-5.jpg" },
  { id: 6, name: "Mystic Training Kit", team: "Mystic FC", price: 3200, image: "/images/mystic-6.jpg" },
  { id: 7, name: "Mystic Match Day", team: "Mystic FC", price: 4800, image: "/images/mystic-7.jpg" },
  { id: 8, name: "Mystic Retro Edition", team: "Mystic FC", price: 5200, image: "/images/mystic-8.jpg" },
  { id: 9, name: "Mystic Limited Edition", team: "Mystic FC", price: 6500, image: "/images/mystic-9.jpg" },
  { id: 10, name: "Mystic Champions Kit", team: "Mystic FC", price: 5800, image: "/images/mystic-10.jpg" },
  { id: 11, name: "Mystic Signature Series", team: "Mystic FC", price: 7000, image: "/images/mystic-11.jpg" },
];

export default function Home() {
  return (
    <main className="min-h-screen bg-white dark:bg-zinc-950">
      <Header />
      <HeroCarousel />

      <section className="container mx-auto py-20">


        {/* Product Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          {products.map((product) => {
            const oldPrice = Math.round(product.price * 1.15);
            return (
              <Link href="/shop" key={product.id} className="group">
                <div className="flex flex-col bg-white dark:bg-zinc-900 rounded-xl overflow-hidden transition-all duration-300 shadow border border-transparent hover:border-slate-200 dark:hover:border-zinc-700">

                  {/* 1. Image Section */}
                  <div className="relative aspect-[3/4] bg-[#F5F5F5] dark:bg-zinc-800 overflow-hidden">
                    <Image
                      src={product.image}
                      alt={product.name}
                      fill
                      className="object-cover transition-transform duration-500 group-hover:scale-105"
                    />

                  </div>

                  {/* 2. Product Info */}
                  <div className="p-3 md:p-4 flex flex-col gap-1.5 flex-1">
                    <h3 className="text-sm md:text-[15px] font-bold text-zinc-800 dark:text-zinc-100 leading-snug line-clamp-2 group-hover:text-primary transition-colors duration-300">
                      {product.name}
                    </h3>
                    <div className="flex items-baseline gap-2 mt-auto">
                      <span className="text-primary font-black text-base md:text-lg">{formatBDT(product.price)}</span>
                      <span className="text-slate-400 text-xs line-through">{formatBDT(oldPrice)}</span>
                    </div>
                  </div>

                  {/* 3. Add to Bag */}
                  <div className="px-3 pb-3 md:px-4 md:pb-4">
                    <button className="w-full text-white bg-primary text-gold py-2.5 rounded-lg font-bold text-sm uppercase tracking-wider transition-all duration-300 flex items-center justify-center gap-2 hover:bg-[#600018] active:scale-[0.97]">
                      <svg className="w-4 h-4" viewBox="0 0 21 22" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path fillRule="evenodd" clipRule="evenodd" d="M6.48626 20.5H14.8341C17.9004 20.5 20.2528 19.3924 19.5847 14.9348L18.8066 8.89359C18.3947 6.66934 16.976 5.81808 15.7311 5.81808H5.55262C4.28946 5.81808 2.95308 6.73341 2.4771 8.89359L1.69907 14.9348C1.13157 18.889 3.4199 20.5 6.48626 20.5Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        <path d="M6.34902 5.5984C6.34902 3.21232 8.28331 1.27803 10.6694 1.27803C11.8184 1.27316 12.922 1.72619 13.7362 2.53695C14.5504 3.3477 15.0081 4.44939 15.0081 5.5984" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      Add to Bag
                    </button>
                  </div>

                </div>
              </Link>
            );
          })}
        </div>
      </section>

      <SidebarCart />
    </main>
  );
}
