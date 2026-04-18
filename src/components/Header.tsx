"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Search, Menu, X } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { useCartStore } from "../store/cartStore";

import Image from "next/image";

export default function Header() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
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
      setIsSearchOpen(false);
    }
  };

  // Hide header elements completely in the admin panel to avoid conflict
  const isAdminPath = pathname.startsWith("/admin");


  return (
    <header className="sticky top-0 w-full z-50 bg-white dark:bg-zinc-950 border-b border-slate-200 flex flex-col">

      {/* Search Overlay */}
      <AnimatePresence>
        {isSearchOpen && (
          <motion.div
            initial={{ y: -100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -100, opacity: 0 }}
            className="absolute top-0 left-0 w-full bg-white dark:bg-zinc-950 z-[60]  border-b border-slate-200 dark:border-zinc-800"
          >
            <div className="container mx-auto h-20 flex items-center px-4">
              <form onSubmit={handleSearch} className="flex-1 flex items-center gap-4">
                <Search className="w-5 h-5 md:w-6 md:h-6 text-primary flex-shrink-0" />
                <input
                  autoFocus
                  type="text"
                  placeholder="Search for jerseys, teams, apparel..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="flex-1 bg-transparent border-none outline-none text-lg md:text-2xl font-bold text-foreground placeholder:text-slate-300"
                />
                <button
                  type="button"
                  onClick={() => setIsSearchOpen(false)}
                  className="p-2 hover:bg-slate-100 dark:hover:bg-zinc-900 rounded-full transition-colors"
                >
                  <X className="w-6 h-6 md:w-8 md:h-8 text-slate-400" />
                </button>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Header Row */}
      <div className="w-full relative">
        <div className="container mx-auto h-20 md:h-24 grid grid-cols-3 items-center px-2 md:px-4">

          {/* Left: Search Trigger */}
          <div className="flex justify-start">
            <button
              onClick={() => setIsSearchOpen(true)}
              className="p-2 text-foreground hover:text-primary transition-colors flex items-center gap-2 group"
            >
              <Search className="w-6 h-6 group-hover:scale-110 transition-transform" />
            </button>
          </div>

          {/* Center: Logo */}
          <div className="flex justify-center">
            <Link href="/" className="relative h-12 w-48 mm:h-14 mm:w-56 md:h-16 md:w-64">
              <Image
                src="/images/logo.png"
                alt="Mystic Fashion"
                fill
                priority
                className="object-contain"
              />
            </Link>
          </div>

          {/* Right: Utilities */}
          <div className="flex justify-end items-center gap-2 md:gap-4 lg:gap-6">
            <button
              onClick={toggleCart}
              className="hidden md:flex relative p-2 text-foreground rounded-full transition-colors items-center justify-center group"
            >
              <svg width="21" height="22" viewBox="0 0 21 22" fill="none" xmlns="http://www.w3.org/2000/svg" className="group-hover:scale-110 transition-transform">
                <path fill-rule="evenodd" clip-rule="evenodd" d="M6.48626 20.5H14.8341C17.9004 20.5 20.2528 19.3924 19.5847 14.9348L18.8066 8.89359C18.3947 6.66934 16.976 5.81808 15.7311 5.81808H5.55262C4.28946 5.81808 2.95308 6.73341 2.4771 8.89359L1.69907 14.9348C1.13157 18.889 3.4199 20.5 6.48626 20.5Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"></path>
                <path d="M6.34902 5.5984C6.34902 3.21232 8.28331 1.27803 10.6694 1.27803V1.27803C11.8184 1.27316 12.922 1.72619 13.7362 2.53695C14.5504 3.3477 15.0081 4.44939 15.0081 5.5984V5.5984" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"></path>
                <path d="M7.70365 10.1018H7.74942" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"></path>
                <path d="M13.5343 10.1018H13.5801" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"></path>
              </svg>
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
            className="md:hidden overflow-hidden bg-white dark:bg-zinc-950 border-t border-slate-100 dark:border-zinc-900 shadow-xl"
          >
            <div className="py-6 px-4 space-y-1">
              {[
                { label: "Home", href: "/" },
                { label: "About Us", href: "/about" },
                { label: "Contact Us", href: "/contact" },
                { label: "FAQ", href: "/faq" },
                { label: "Privacy Policy", href: "/privacy" },
                { label: "Terms & Conditions", href: "/terms" },
              ].map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`block px-4 py-3 rounded-lg text-lg font-bold transition-colors ${
                    pathname === link.href 
                      ? "bg-maroon/5 text-maroon" 
                      : "text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      {/* Mobile Fixed Cart FAB */}
      <AnimatePresence>
        {mounted && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            onClick={toggleCart}
            className="md:hidden fixed bottom-6 right-6 z-50 w-14 h-14 bg-primary text-white rounded-full shadow-[0_8px_30px_rgb(128,0,32,0.4)] flex items-center justify-center active:scale-90 transition-transform"
          >
            <div className="relative">
              <svg width="28" height="28" viewBox="0 0 21 22" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path fill-rule="evenodd" clip-rule="evenodd" d="M6.48626 20.5H14.8341C17.9004 20.5 20.2528 19.3924 19.5847 14.9348L18.8066 8.89359C18.3947 6.66934 16.976 5.81808 15.7311 5.81808H5.55262C4.28946 5.81808 2.95308 6.73341 2.4771 8.89359L1.69907 14.9348C1.13157 18.889 3.4199 20.5 6.48626 20.5Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path>
                <path d="M6.34902 5.5984C6.34902 3.21232 8.28331 1.27803 10.6694 1.27803V1.27803C11.8184 1.27316 12.922 1.72619 13.7362 2.53695C14.5504 3.3477 15.0081 4.44939 15.0081 5.5984V5.5984" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path>
              </svg>

              <span className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-white text-[11px] font-black text-primary flex items-center justify-center border-2 border-primary shadow-lg">
                {getTotalItems()}
              </span>

            </div>
          </motion.button>
        )}
      </AnimatePresence>
    </header>
  );
}
