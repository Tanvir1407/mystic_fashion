"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Search, ShoppingBag, Menu, X, Phone, MapPin } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { useCartStore } from "../store/cartStore";

export default function Header() {
  const [mounted, setMounted] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { getTotalItems, toggleCart } = useCartStore();
  const pathname = usePathname();

  // Hide header elements completely in the admin panel to avoid conflict
  const isAdminPath = pathname.startsWith("/admin");

  useEffect(() => {
    setMounted(true);
  }, []);

  if (isAdminPath) return null;

  const NavLinks = () => (
    <>
      {[
        { name: "Home", href: "/" },
        { name: "Club Jerseys", href: "/shop?category=club" },
        { name: "National Teams", href: "/shop?category=national" },
        { name: "Retro Collection", href: "/shop?category=retro" },
        { name: "Training Gear", href: "/shop?category=training" },
        { name: "Accessories", href: "/shop?category=accessories" },
      ].map((link) => (
        <Link
          key={link.name}
          href={link.href}
          className="text-sm font-bold uppercase tracking-wider text-foreground hover:text-maroon transition-colors px-2 py-1"
        >
          {link.name}
        </Link>
      ))}
    </>
  );

  return (
    <header className="sticky top-0 w-full z-50 bg-white dark:bg-zinc-950 border-b border-slate-200 dark:border-zinc-800 shadow-sm flex flex-col">
      {/* Tier 1: Top Bar */}
      <div className="bg-foreground text-background py-1.5 hidden md:block">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-12 flex justify-between items-center text-xs font-bold tracking-widest uppercase">
          <div className="flex gap-6">
            <Link href="/stores" className="flex items-center gap-1.5 hover:text-gold transition-colors">
              <MapPin className="w-3 h-3" /> Store Locations
            </Link>
            <Link href="/contact" className="hover:text-gold transition-colors">Contact</Link>
          </div>
          <div className="flex gap-6">
            <Link href="/track" className="hover:text-gold transition-colors">Track Order</Link>
            <Link href="/settings" className="hover:text-gold transition-colors">Currency: BDT</Link>
          </div>
        </div>
      </div>

      {/* Tier 2: Main Header Row */}
      <div className="w-full">
        <div className="max-w-[1400px] mx-auto px-4 md:px-6 lg:px-12 h-20 md:h-24 flex justify-between items-center gap-4 md:gap-8 lg:gap-16">

          {/* Logo */}
          <Link
            href="/"
            className="flex-shrink-0 bg-maroon text-gold px-4 py-2 rounded-xl flex items-center justify-center -rotate-2 hover:rotate-0 transition-transform shadow-lg shadow-maroon/20"
          >
            <span className="font-black text-xl md:text-2xl tracking-tighter uppercase leading-none">
              Mystic<br />Fashion
            </span>
          </Link>

          {/* Search Bar (Hidden on Mobile) */}
          <div className="hidden md:flex flex-1 max-w-2xl relative">
            <input
              type="text"
              placeholder="Search for jerseys, teams, players..."
              className="w-full h-12 pl-6 pr-14 rounded-full bg-slate-100 dark:bg-zinc-900 border-2 border-transparent focus:border-maroon focus:outline-none focus:bg-white text-sm font-bold text-foreground transition-all"
            />
            <button className="absolute right-1 top-1 w-10 h-10 rounded-full bg-foreground text-background flex items-center justify-center hover:bg-maroon hover:text-white transition-colors">
              <Search className="w-4 h-4" />
            </button>
          </div>

          {/* Right Utilities */}
          <div className="flex items-center gap-4 md:gap-6 ml-auto">
            <button
              onClick={toggleCart}
              className="relative p-2 text-foreground hover:bg-slate-100 dark:hover:bg-zinc-900 rounded-full transition-colors flex items-center justify-center group"
            >
              <ShoppingBag className="w-6 h-6 md:w-7 md:h-7 group-hover:scale-110 transition-transform" />
              <span className="absolute top-0 right-0 w-4 h-4 md:w-5 md:h-5 rounded-full bg-maroon text-[10px] md:text-xs font-black text-white flex items-center justify-center border-2 border-white dark:border-zinc-950">
                {mounted ? getTotalItems() : 0}
              </span>
            </button>
            <button
              className="md:hidden p-2 text-foreground"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              {isMobileMenuOpen ? <X className="w-7 h-7" /> : <Menu className="w-7 h-7" />}
            </button>
          </div>
        </div>
      </div>

      {/* Tier 3: Nav Menu (Desktop) */}
      <div className="hidden md:block w-full border-t border-slate-100 dark:border-zinc-900 bg-white/90 dark:bg-zinc-950/90 backdrop-blur-md">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-12 h-14 flex items-center justify-between">
          <nav className="flex gap-6 lg:gap-10">
            <NavLinks />
          </nav>

          {/* Hotline */}
          <div className="flex items-center gap-2 text-maroon font-black text-sm uppercase tracking-wider">
            <Phone className="w-4 h-4 animate-bounce" />
            <span>01700-MYSTIC</span>
          </div>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="md:hidden overflow-hidden bg-white dark:bg-zinc-950 border-t border-slate-100 dark:border-zinc-900"
          >
            <div className="p-4 space-y-4">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search..."
                  className="w-full h-12 pl-6 pr-14 rounded-xl bg-slate-100 dark:bg-zinc-900 border-2 border-transparent focus:border-maroon focus:outline-none text-sm font-bold text-foreground transition-all"
                />
                <button className="absolute right-1 top-1 w-10 h-10 rounded-xl bg-foreground text-background flex items-center justify-center hover:bg-maroon hover:text-white transition-colors">
                  <Search className="w-4 h-4" />
                </button>
              </div>

              <nav className="flex flex-col space-y-4 pt-2">
                <NavLinks />
              </nav>

              <div className="mt-6 pt-6 border-t border-slate-100 dark:border-zinc-900 flex justify-between items-center text-sm font-bold text-foreground/70">
                <Link href="/stores" className="flex items-center gap-2"><MapPin className="w-4 h-4" /> Stores</Link>
                <div className="flex items-center gap-2 text-maroon font-black"><Phone className="w-4 h-4" /> 01700-MYSTIC</div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
