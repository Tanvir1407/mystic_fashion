"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Search, Menu, X, Phone, MapPin } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { useCartStore } from "../store/cartStore";

export default function Header() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const { getTotalItems, toggleCart } = useCartStore();
  const pathname = usePathname();

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
      setIsMobileMenuOpen(false);
    }
  };

  // Hide header elements completely in the admin panel to avoid conflict
  const isAdminPath = pathname.startsWith("/admin");


  return (
    <header className="sticky top-0 w-full z-50 bg-white dark:bg-zinc-950 border-b border-slate-200 dark:border-zinc-800 shadow-sm flex flex-col">

      {/* Tier 2: Main Header Row */}
      <div className="w-full">
        <div className="container mx-auto h-20 md:h-24 flex justify-between items-center gap-4 md:gap-8 lg:gap-16">

          {/* Logo */}
          <Link
            href="/"
            className="text-2xl md:text-4xl font-black font-serif italic text-primary tracking-tighter"
          >
            Mystic Fashion
          </Link>

          {/* Search Bar (Hidden on Mobile) */}
          <form onSubmit={handleSearch} className="hidden md:flex flex-1 max-w-2xl relative">
            <input
              type="text"
              placeholder="Search for jerseys, teams, players..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-12 pl-6 pr-14 rounded-full bg-slate-100 dark:bg-zinc-900 border-2 border-primary focus:outline-none focus:bg-white text-sm  text-foreground transition-all"
            />
            <button type="submit" className="absolute right-1 top-1 w-10 h-10 rounded-full bg-foreground text-background flex items-center justify-center bg-primary hover:text-white transition-colors">
              <Search className="w-4 h-4" />
            </button>
          </form>

          {/* Right Utilities */}
          <div className="flex items-center gap-4 md:gap-6 ml-auto">
            <button
              onClick={toggleCart}
              className="relative p-2 text-foreground rounded-full transition-colors flex items-center justify-center group"
            > <svg width="21" height="22" viewBox="0 0 21 22" fill="none" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" clip-rule="evenodd" d="M6.48626 20.5H14.8341C17.9004 20.5 20.2528 19.3924 19.5847 14.9348L18.8066 8.89359C18.3947 6.66934 16.976 5.81808 15.7311 5.81808H5.55262C4.28946 5.81808 2.95308 6.73341 2.4771 8.89359L1.69907 14.9348C1.13157 18.889 3.4199 20.5 6.48626 20.5Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"></path><path d="M6.34902 5.5984C6.34902 3.21232 8.28331 1.27803 10.6694 1.27803V1.27803C11.8184 1.27316 12.922 1.72619 13.7362 2.53695C14.5504 3.3477 15.0081 4.44939 15.0081 5.5984V5.5984" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"></path><path d="M7.70365 10.1018H7.74942" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"></path><path d="M13.5343 10.1018H13.5801" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"></path></svg>
              <span className="absolute top-0 right-0 w-4 h-4 md:w-5 md:h-5 rounded-full bg-red-600 text-[10px] md:text-xs font-black text-white flex items-center justify-center border-2 border-white dark:border-zinc-950">
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
              <form onSubmit={handleSearch} className="relative">
                <input
                  type="text"
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full h-12 pl-6 pr-14 rounded-xl bg-slate-100 dark:bg-zinc-900 border-2 border-primary focus:outline-none text-sm font-bold text-foreground transition-all"
                />
                <button type="submit" className="absolute right-0 top-0 bottom-0 w-12 rounded-r-xl bg-primary text-background flex items-center justify-center hover:bg-primary hover:text-white transition-colors">
                  <Search className="w-4 h-4" />
                </button>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
