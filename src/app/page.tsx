import Header from "@/components/Header";
import HeroCarousel from "@/components/HeroCarousel";
import Footer from "@/components/Footer";
import SidebarCart from "@/components/SidebarCart";
import AddToBagButton from "@/components/AddToBagButton";
import Link from "next/link";
import Image from "next/image";


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
              <Link href={`/product/${product.id}`} key={product.id} className="group">
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
                    <AddToBagButton product={product} />
                  </div>

                </div>
              </Link>
            );
          })}
        </div>
      </section>

      <Footer />
      <SidebarCart />
    </main>
  );
}
