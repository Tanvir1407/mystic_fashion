import Image from "next/image";
import Link from "next/link";
import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter });

export const dynamic = "force-dynamic";

export default async function Home() {
  const formatBDT = (price: number) => {
    return `৳${price.toLocaleString("en-IN")}`;
  };

  const trendingProducts = await prisma.product.findMany({
    take: 4,
  });

  return (
    <div className="min-h-screen bg-background flex flex-col items-center">
      


      {/* Hero Section */}
      <section id="hero" className="w-full relative bg-foreground overflow-hidden">
        {/* Background Gradients */}
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-maroon/20 via-transparent to-gold/10"></div>
        
        <div className="max-w-7xl mx-auto px-8 py-20 lg:py-32 flex flex-col lg:flex-row items-center gap-12 relative z-10">
          
          <div className="flex-1 text-center lg:text-left text-background">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 text-gold text-xs font-bold uppercase tracking-widest mb-6">
              <span className="w-1.5 h-1.5 rounded-full bg-gold animate-pulse"></span>
              2026 Season Collection
            </div>
            
            <h1 className="text-5xl md:text-7xl font-black tracking-tighter mb-6 leading-tight">
              Wear The <span className="text-transparent bg-clip-text bg-gradient-to-r from-maroon to-red-500">Magic</span><br/>
              On The Pitch.
            </h1>
            
            <p className="text-lg md:text-xl text-white/70 max-w-xl mx-auto lg:mx-0 mb-10 font-medium leading-relaxed">
              Elevate your game with our high-end, engineered-for-champions football jerseys. Unrivaled aesthetics and world-class performance combined.
            </p>

            <Link 
              href="#trending" 
              className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-gold text-foreground rounded-full font-bold shadow-lg shadow-gold/20 hover:shadow-xl hover:shadow-gold/40 hover:-translate-y-1 transition-all duration-300"
            >
              Shop Now
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M12.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </Link>
          </div>

          <div className="flex-1 relative w-full max-w-lg aspect-square">
            <div className="absolute inset-0 bg-maroon/30 blur-3xl rounded-full scale-75 animate-pulse duration-[3000ms]"></div>
            <Image 
              src="/images/hero_jersey_1775987082211.png" 
              alt="Premium Maroon and Gold Football Jersey"
              fill
              className="object-contain relative z-10 drop-shadow-2xl hover:scale-105 transition-transform duration-700 hover:rotate-1"
              priority
            />
          </div>
        </div>
      </section>

      {/* Trending Jerseys Grid */}
      <section id="trending" className="w-full max-w-7xl mx-auto px-8 py-24 mb-10">
        <div className="flex justify-between items-end mb-12">
          <div>
            <h2 className="text-sm font-bold tracking-widest uppercase text-maroon mb-2">New Arrivals</h2>
            <h3 className="text-4xl md:text-5xl font-black text-foreground tracking-tight">Trending <span className="text-maroon">Jerseys</span></h3>
          </div>
          <Link href="/shop" className="hidden sm:inline-flex items-center gap-2 font-bold text-foreground hover:text-maroon group">
            View All
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 group-hover:translate-x-1 transition-transform" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M12.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {trendingProducts.map((jersey, i) => (
            <div key={jersey.id} className="group flex flex-col bg-slate-50/50 dark:bg-zinc-900/50 rounded-3xl p-6 hover:bg-slate-100 dark:hover:bg-zinc-800/80 transition-all duration-300 hover:shadow-xl hover:-translate-y-2 border border-slate-200 dark:border-zinc-800">
              <div className="relative w-full aspect-square mb-6 rounded-2xl bg-white dark:bg-black/20 overflow-hidden flex items-center justify-center">
                {i === 0 && (
                  <span className="absolute top-3 left-3 z-10 px-3 py-1 bg-maroon text-white text-[10px] font-black uppercase rounded-full tracking-wider shadow-md">
                    Trending
                  </span>
                )}
                <Image 
                  src={jersey.images[0]}
                  alt={jersey.name}
                  fill
                  className="object-contain p-4 group-hover:scale-110 transition-transform duration-500"
                />
              </div>
              <div className="flex flex-col flex-1">
                <div className="flex justify-between items-start mb-2">
                  <Link href={`/product/${jersey.id}`}>
                    <h4 className="font-bold text-lg text-foreground group-hover:text-maroon transition-colors line-clamp-1">{jersey.name}</h4>
                  </Link>
                  <span className="font-black text-foreground ml-2">{formatBDT(jersey.price)}</span>
                </div>
                <Link href={`/product/${jersey.id}`} className="mt-auto w-full py-3 bg-white dark:bg-black border-2 border-slate-200 dark:border-zinc-800 hover:border-maroon hover:bg-maroon hover:text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-all duration-300">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                  </svg>
                  View Product
                </Link>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer id="footer" className="w-full bg-foreground text-background py-16 border-t-4 border-gold">
        <div className="max-w-7xl mx-auto px-8 grid grid-cols-1 md:grid-cols-3 gap-12 text-center md:text-left">
          {/* Brand Info */}
          <div className="flex flex-col items-center md:items-start group">
             <Link href="/" className="font-extrabold text-3xl tracking-tighter text-maroon flex items-center gap-2 mb-4">
               Mystic Fashion<div className="w-3 h-3 rounded-full bg-gold"></div>
             </Link>
             <p className="text-background/70 max-w-sm mb-6 font-medium text-sm leading-relaxed">
               Crafting premium, high-performance football apparel for fans and champions alike. Wear the magic of the game.
             </p>
             <div className="flex gap-4">
                {/* Social Icons */}
                <a href="#" className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-gold hover:text-foreground transition-all duration-300">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
                </a>
                <a href="#" className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-gold hover:text-foreground transition-all duration-300">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M24 4.557c-.883.392-1.832.656-2.828.775 1.017-.609 1.798-1.574 2.165-2.724-.951.564-2.005.974-3.127 1.195-.897-.957-2.178-1.555-3.594-1.555-3.179 0-5.515 2.966-4.797 6.045-4.091-.205-7.719-2.165-10.148-5.144-1.29 2.213-.669 5.108 1.523 6.574-.806-.026-1.566-.247-2.229-.616-.054 2.281 1.581 4.415 3.949 4.89-.693.188-1.452.232-2.224.084.626 1.956 2.444 3.379 4.6 3.419-2.07 1.623-4.678 2.348-7.29 2.04 2.179 1.397 4.768 2.212 7.548 2.212 9.142 0 14.307-7.721 13.995-14.646.962-.695 1.797-1.562 2.457-2.549z"/></svg>
                </a>
             </div>
          </div>

          {/* Quick Links */}
          <div className="flex flex-col items-center md:items-start">
            <h4 className="font-bold text-lg mb-6 text-white uppercase tracking-wider">Explore</h4>
            <ul className="space-y-3 font-medium text-background/80">
              <li><Link href="#trending" className="hover:text-gold transition-colors">Our Jerseys</Link></li>
              <li><Link href="#custom" className="hover:text-gold transition-colors">Custom Kits</Link></li>
              <li><Link href="#store" className="hover:text-gold transition-colors">Find a Store</Link></li>
              <li><Link href="#about" className="hover:text-gold transition-colors">About Us</Link></li>
            </ul>
          </div>

          {/* Contact Section */}
          <div className="flex flex-col items-center md:items-start">
            <h4 className="font-bold text-lg mb-6 text-white uppercase tracking-wider">Contact Us</h4>
            <ul className="space-y-4 font-medium text-background/80">
              <li className="flex items-center gap-3">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gold" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                hello@mysticfashion.com
              </li>
              <li className="flex items-center gap-3">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gold" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
                +1 (800) 123-4567
              </li>
              <li className="flex items-start gap-3 mt-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gold mt-1 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span>77 Mystic Avenue, Suite 400<br/>New York, NY 10012</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="w-full h-px bg-white/10 mt-16 mb-8"></div>
        
        <p className="text-center text-background/50 font-medium text-sm px-8">
          &copy; {new Date().getFullYear()} Mystic Fashion. All rights reserved.
        </p>
      </footer>
    </div>
  );
}
