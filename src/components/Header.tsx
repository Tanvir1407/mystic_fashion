"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Search, Menu, X, Phone, Truck, User } from "lucide-react";
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
            className="absolute top-0 left-0 w-full bg-white dark:bg-zinc-950 z-[60] border-b border-slate-200 dark:border-zinc-800"
          >
            <div className="container mx-auto h-20 flex items-center px-4 gap-2">
              <form onSubmit={handleSearch} className="flex-1 flex items-center border-[2px] border-primary bg-white dark:bg-zinc-900 overflow-hidden rounded-none h-12 focus-within:border-primary">
                <input
                  autoFocus
                  type="text"
                  placeholder="Search for Products..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="flex-1 px-4 py-2 text-sm text-slate-800 dark:text-zinc-100 placeholder:text-slate-400 bg-transparent outline-none border-none"
                />
                <button
                  type="submit"
                  className="bg-primary text-white px-4 h-full flex items-center justify-center hover:bg-opacity-90 transition-colors rounded-none"
                >
                  <Search className="w-5 h-5" />
                </button>
              </form>
              <button
                type="button"
                onClick={() => setIsSearchOpen(false)}
                className="p-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-zinc-900 dark:hover:bg-zinc-800 text-slate-500 rounded-none transition-colors h-12 flex items-center justify-center flex-shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Header Row */}
      <div className="w-full relative">
        <div className="container mx-auto h-14 mm:h-16 md:h-20 flex items-center justify-between px-4 gap-4 relative">

          {/* Left: Hamburger and Search Trigger (Mobile only) */}
          <div className="flex md:hidden items-center gap-2 flex-shrink-0">
            <button
              className="p-1 text-foreground"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
            <button
              onClick={() => setIsSearchOpen(true)}
              className="p-1 text-foreground hover:text-primary transition-colors flex items-center justify-center"
            >
              <Search className="w-4 h-6" />
            </button>
          </div>

          {/* Center/Left: Logo (Desktop: static left, Mobile: absolute center) */}
          <div className="absolute md:static left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 md:translate-x-0 md:translate-y-0 flex items-center justify-center md:justify-start flex-shrink-0">
            <Link href="/" className="relative h-8 w-32 mm:h-10 mm:w-40 md:h-14 md:w-60">
              <Image
                src="/images/logo.png"
                alt="Mystic Fashion"
                fill
                priority
                className="object-contain object-center md:object-left"
              />
            </Link>
          </div>

          {/* Center: Search Bar (Desktop only) */}
          <form onSubmit={handleSearch} className="hidden md:flex items-center border-[2px] border-primary w-full max-w-md lg:max-w-xl xl:max-w-2xl bg-white overflow-hidden rounded-none h-11 focus-within:border-primary mx-4">
            <input
              type="text"
              placeholder="Search for Products..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 px-4 py-2 text-sm text-slate-800 placeholder:text-slate-400 bg-transparent outline-none "
            />
            <button
              type="submit"
              className="bg-primary text-white px-4 h-full flex items-center justify-center hover:bg-opacity-90 transition-colors rounded-none"
            >
              <Search className="w-5 h-5" />
            </button>
          </form>

          {/* Right: Utilities */}
          <div className="flex items-center gap-2.5 md:gap-4 lg:gap-6 flex-shrink-0">

            {/* Account (Desktop only) */}
            {/* <Link href="/admin" className="hidden md:flex items-center gap-2.5 group">
              <div className="w-10 h-10 rounded-full border border-slate-200 flex items-center justify-center text-slate-600 group-hover:border-primary group-hover:text-primary transition-colors">
                <User className="w-5 h-5" />
              </div>
              <div className="flex flex-col text-left">
                <span className="text-[11px] text-slate-500 leading-none">Sign In</span>
                <span className="text-xs font-bold text-slate-900 mt-0.5 leading-tight group-hover:text-primary transition-colors">Your Account</span>
              </div>
            </Link> */}

            {/* Cart (Desktop and Mobile) */}
            <button
              onClick={toggleCart}
              className="relative p-2 text-foreground rounded-full transition-colors flex items-center justify-center group"
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

            {/* Account (Mobile only) */}
            {/* <Link href="/admin" className="md:hidden p-1 text-foreground hover:text-primary transition-colors flex items-center justify-center">
              <User className="w-6 h-6" />
            </Link> */}
          </div>
        </div>
      </div>

      {/* Secondary Header Row */}
      <div className="hidden md:block w-full border-t border-slate-200 bg-white dark:bg-zinc-950">
        <div className="container mx-auto py-1.5 flex items-center justify-between px-4">
          {/* Left side categories */}
          <div className="flex items-center gap-6">
            <Link href="/products?category=shoes" className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-zinc-300 hover:text-primary transition-colors">Shoes</Link>
            <Link href="/products?category=jersey" className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-zinc-300 hover:text-primary transition-colors">Jersey</Link>
            <Link href="/products?category=polo" className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-zinc-300 hover:text-primary transition-colors">Polo</Link>
            <Link href="/products?category=jeans" className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-zinc-300 hover:text-primary transition-colors">Jeans</Link>
          </div>
          {/* Right side track your order */}
          <div>
            <Link href="/track" className="text-sm font-medium text-slate-700 dark:text-zinc-300 hover:text-primary transition-colors flex items-center gap-1.5">
              Track Order
            </Link>
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
            <div className="py-6 px-4 space-y-4">
              <div className="space-y-1">
                {[
                  { label: "Shoes", href: "/products?category=shoes" },
                  { label: "Jersey", href: "/products?category=jersey" },
                  { label: "Polo", href: "/products?category=polo" },
                  { label: "Jeans", href: "/products?category=jeans" },
                ].map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`block px-4 py-2 rounded-none text-base font-medium transition-colors ${pathname === link.href
                      ? "bg-primary/5 text-primary"
                      : "text-slate-800 dark:text-zinc-200 hover:bg-slate-50 dark:hover:bg-zinc-900"
                      }`}
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
              <div className="pt-2 border-t border-slate-100 dark:border-zinc-800">
                <Link
                  href="/track"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="block w-full text-center py-2 bg-primary text-white font-medium  rounded-none hover:bg-opacity-90 transition-colors"
                >
                  Track Order
                </Link>
              </div>
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
