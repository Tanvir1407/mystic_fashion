import Header from "@/components/Header";
import HeroCarousel from "@/components/HeroCarousel";
import SidebarCart from "@/components/SidebarCart";
import Link from "next/link";
import { ShoppingBag, ArrowRight } from "lucide-react";

export default function Home() {
  return (
    <main className="min-h-screen bg-white dark:bg-zinc-950">
      <Header />
      <HeroCarousel />
      
      {/* Featured Collections */}
      <section className="container mx-auto py-24">
        <div className="flex flex-col md:flex-row justify-between items-end mb-16 gap-6">
          <div className="max-w-xl">
            <span className="text-maroon font-black uppercase tracking-[0.3em] text-xs mb-4 block">New Season 2024</span>
            <h2 className="text-5xl md:text-7xl font-black uppercase tracking-tighter leading-[0.9]">
              The <span className="text-maroon">Signature</span> <br /> Collection
            </h2>
          </div>
          <Link href="/shop" className="group flex items-center gap-3 font-black uppercase tracking-widest text-sm border-b-2 border-foreground pb-2 hover:text-maroon hover:border-maroon transition-all">
            View All Products
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>

        {/* Featured Products Placeholders */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="group cursor-pointer">
              <div className="relative aspect-[3/4] bg-slate-100 dark:bg-zinc-900 rounded-2xl overflow-hidden mb-6">
                <div className="absolute inset-0 flex items-center justify-center opacity-20">
                  <ShoppingBag className="w-20 h-20" />
                </div>
                <div className="absolute bottom-4 right-4 translate-y-12 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300">
                  <button className="bg-white text-black p-4 rounded-full shadow-xl hover:bg-maroon hover:text-white transition-colors">
                    <ShoppingBag className="w-6 h-6" />
                  </button>
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">Premium Apparel</p>
                <h3 className="text-lg font-black uppercase leading-tight">Authentic Pro Jersey {i}</h3>
                <p className="text-maroon font-black">4,500 BDT</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Featured Banner */}
      <section className="px-4 md:px-6 lg:px-12 mb-24">
        <div className="container mx-auto relative rounded-[3rem] overflow-hidden bg-zinc-900 h-[500px] flex items-center p-8 md:p-16 lg:p-24">
          <div className="absolute inset-0 opacity-40">
            <img 
              src="https://images.unsplash.com/photo-1517466787929-bc90951d0974?q=80&w=2000&auto=format&fit=crop" 
              className="w-full h-full object-cover"
              alt="Background"
            />
          </div>
          <div className="relative z-10 max-w-2xl">
            <h2 className="text-4xl md:text-6xl font-black text-white uppercase tracking-tighter mb-8 leading-none">
              Customized <br /> <span className="text-maroon">Teamwear</span> Solutions
            </h2>
            <p className="text-slate-300 text-lg mb-10 font-medium max-w-md">
              Elevate your team's presence with our professional-grade custom jersey design and printing services.
            </p>
            <button className="bg-maroon text-white px-10 py-5 rounded-full font-black uppercase tracking-widest text-sm hover:scale-105 transition-transform flex items-center gap-3">
              Get Quote
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </section>

      <SidebarCart />
    </main>
  );
}
