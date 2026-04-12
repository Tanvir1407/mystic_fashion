import Image from "next/image";
import Link from "next/link";
import { PrismaClient, Prisma } from "@/generated/prisma/client";
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter });

export const dynamic = "force-dynamic";

export default async function ShopPage({
  searchParams,
}: {
  searchParams: { team?: string; size?: string };
}) {
  const team = searchParams.team;
  const size = searchParams.size;

  const where: Prisma.ProductWhereInput = {};
  if (team) {
    where.team = team;
  }
  if (size) {
    where.sizes = { has: size };
  }

  const products = await prisma.product.findMany({
    where,
  });

  const availableTeams = ["Aurum FC", "Real Madrid", "Argentina", "Aethelred", "Custom"];
  const availableSizes = ["S", "M", "L", "XL", "XXL"];

  // formatter BDT
  const formatBDT = (price: number) => {
    return `৳${price.toLocaleString("en-IN")}`;
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center">


      <div className="w-full bg-maroon/5 py-12 border-b border-maroon/10">
        <div className="container mx-auto">
            <h1 className="text-4xl md:text-5xl font-black text-foreground tracking-tighter">Shop <span className="text-maroon">Jerseys</span></h1>
            <p className="text-foreground/70 mt-2 font-medium">Find your perfect fit. Represent your colors.</p>
        </div>
      </div>

      <main className="container mx-auto flex-1 w-full py-10 flex flex-col md:flex-row gap-10">
        {/* Sidebar Filter */}
        <aside className="w-full md:w-64 flex-shrink-0">
          <div className="sticky top-28 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-black text-foreground uppercase tracking-wider">Filters</h2>
                {(team || size) && (
                    <Link href="/shop" className="text-xs font-bold text-maroon hover:text-gold transition-colors">Clear All</Link>
                )}
            </div>
            
            {/* Team Filter */}
            <div className="mb-8">
              <h3 className="text-sm font-bold text-maroon mb-4 uppercase tracking-widest">Teams</h3>
              <ul className="space-y-3">
                <li>
                   <Link href={`/shop?size=${size || ''}`} className={`flex items-center gap-3 text-sm font-medium transition-colors ${!team ? 'text-gold' : 'text-foreground/70 hover:text-maroon'}`}>
                     <div className={`w-4 h-4 rounded border flex items-center justify-center ${!team ? 'bg-maroon border-maroon' : 'border-slate-300 dark:border-zinc-700'}`}>
                        {!team && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                     </div>
                     All Teams
                   </Link>
                </li>
                {availableTeams.map(t => (
                  <li key={t}>
                   <Link href={`/shop?team=${encodeURIComponent(t)}&size=${size || ''}`} className={`flex items-center gap-3 text-sm font-medium transition-colors ${team === t ? 'text-gold' : 'text-foreground/70 hover:text-maroon'}`}>
                     <div className={`w-4 h-4 rounded border flex items-center justify-center ${team === t ? 'bg-maroon border-maroon' : 'border-slate-300 dark:border-zinc-700'}`}>
                        {team === t && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                     </div>
                     {t}
                   </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Size Filter */}
            <div>
              <h3 className="text-sm font-bold text-maroon mb-4 uppercase tracking-widest">Sizes</h3>
              <div className="flex flex-wrap gap-2">
                 <Link href={`/shop?team=${team || ''}`} className={`w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold transition-all border-2 ${!size ? 'border-maroon bg-maroon text-white shadow-md' : 'border-slate-200 dark:border-zinc-700 text-foreground hover:border-gold hover:text-gold'}`}>
                    All
                 </Link>
                {availableSizes.map(s => (
                  <Link key={s} href={`/shop?team=${team || ''}&size=${encodeURIComponent(s)}`} className={`w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold transition-all border-2 ${size === s ? 'border-maroon bg-maroon text-white shadow-md' : 'border-slate-200 dark:border-zinc-700 text-foreground hover:border-gold hover:text-gold'}`}>
                    {s}
                  </Link>
                ))}
              </div>
            </div>

          </div>
        </aside>

        {/* Product Grid */}
        <div className="flex-1">
          <div className="mb-8 flex justify-between items-center bg-white/50 dark:bg-zinc-900/50 p-4 rounded-xl border border-slate-100 dark:border-zinc-800">
            <p className="text-foreground/80 font-medium font-mono text-sm">Showing <strong className="text-maroon">{products.length}</strong> results</p>
          </div>

          {products.length === 0 ? (
            <div className="w-full py-20 flex flex-col items-center justify-center text-center bg-slate-50 dark:bg-zinc-900/30 rounded-3xl border border-dashed border-slate-300 dark:border-zinc-700">
               <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor" className="w-16 h-16 text-slate-400 mb-4">
                 <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007zM8.625 10.5a.375.375 0 11-.75 0 .375.375 0 01.75 0zm5.932 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
               </svg>
               <h3 className="text-xl font-bold text-foreground mb-2">No products found</h3>
               <p className="text-foreground/60 max-w-sm mb-6">We couldn't find any jerseys matching your filters. Try clearing your filters to see all available products.</p>
               <Link href="/shop" className="px-6 py-2.5 bg-foreground text-background font-bold rounded-full hover:bg-gold hover:text-black transition-colors shadow-sm">Clear Filters</Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {products.map((product) => (
                <div key={product.id} className="group flex flex-col bg-white dark:bg-zinc-900 rounded-3xl p-5 hover:bg-slate-50 dark:hover:bg-zinc-800 transition-all duration-500 hover:shadow-2xl hover:-translate-y-2 border border-slate-100 dark:border-zinc-800">
                  <div className="relative w-full aspect-[4/5] mb-5 rounded-2xl bg-slate-50 dark:bg-black/40 overflow-hidden flex items-center justify-center">
                    <Image 
                      src={product.images[0]}
                      alt={product.name}
                      fill
                      className="object-contain p-4 group-hover:scale-110 group-hover:rotate-1 transition-all duration-700"
                    />
                    <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                       <button className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-maroon shadow-lg hover:bg-maroon hover:text-white transition-colors">
                         <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" /></svg>
                       </button>
                    </div>
                  </div>
                  <div className="flex flex-col flex-1 relative z-10 text-left">
                    <p className="text-xs font-bold uppercase tracking-widest text-gold mb-1">{product.team}</p>
                    <Link href={`/product/${product.id}`}>
                      <h4 className="font-extrabold text-lg text-foreground mb-1 leading-snug line-clamp-2 hover:text-maroon transition-colors">{product.name}</h4>
                    </Link>
                    <p className="text-foreground/50 text-sm mb-4 line-clamp-2 flex-grow">{product.description}</p>
                    
                    <div className="flex justify-between items-end mt-auto pt-4 border-t border-slate-100 dark:border-zinc-800">
                      <div className="flex flex-col">
                        <span className="text-xs text-foreground/50 font-medium mb-1">Price</span>
                        <span className="font-black text-maroon text-xl">{formatBDT(product.price)}</span>
                      </div>
                      <Link href={`/product/${product.id}`} className="h-12 px-6 bg-foreground text-background hover:bg-gold hover:text-black hover:shadow-lg hover:shadow-gold/20 rounded-xl font-bold flex items-center justify-center gap-2 transition-all duration-300 active:scale-95">
                        Grab It
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Footer minimal */}
      <footer className="w-full bg-foreground text-background py-8 border-t-4 border-gold text-center">
        <p className="text-background/60 font-medium text-sm">&copy; {new Date().getFullYear()} Mystic Fashion. All rights reserved.</p>
      </footer>
    </div>
  );
}
