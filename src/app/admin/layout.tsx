"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { adminLogout } from "./actions";
import { Package, ShoppingCart, LogOut, Search, Bell, User } from "lucide-react";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // Do not show sidebar on the login page
  if (pathname === "/admin/login") {
    return <>{children}</>;
  }

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-zinc-950 overflow-hidden">
      {/* Sidebar - Dark Enterprise Theme */}
      <aside className="w-64 bg-slate-900 border-r border-slate-800 text-slate-300 flex-col hidden md:flex flex-shrink-0 shadow-lg z-10">
        <div className="h-16 flex items-center px-6 border-b border-slate-800">
          <Link href="/admin" className="font-bold text-lg tracking-tight text-white flex items-center gap-3">
            <div className="w-8 h-8 bg-gold rounded-md flex items-center justify-center text-slate-900 font-black shadow-sm">M</div>
            Mystic Admin
          </Link>
        </div>
        
        <div className="px-5 py-6 font-semibold text-xs tracking-wider text-slate-500 uppercase">
          Overview
        </div>
        <nav className="flex-1 px-3 space-y-1">
          <Link
            href="/admin/products"
            className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${
              pathname.includes("/admin/products")
                ? "bg-maroon text-white shadow-md shadow-maroon/20"
                : "hover:bg-slate-800 hover:text-white"
            }`}
          >
            <Package className="w-4 h-4" />
            Products
          </Link>
          <Link
            href="/admin/orders"
            className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${
              pathname.includes("/admin/orders")
                ? "bg-maroon text-white shadow-md shadow-maroon/20"
                : "hover:bg-slate-800 hover:text-white"
            }`}
          >
            <ShoppingCart className="w-4 h-4" />
            Orders
          </Link>
        </nav>

        <div className="p-4 border-t border-slate-800">
          <button
            onClick={() => adminLogout()}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-md text-sm font-medium text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Topbar */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 flex-shrink-0 z-0">
          <div className="flex-1 flex items-center">
            <div className="relative w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input 
                type="text" 
                placeholder="Search resources..." 
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-md text-sm focus:border-slate-300 focus:bg-white focus:ring-0 transition-colors"
              />
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button className="text-slate-400 hover:text-slate-600 transition-colors relative">
              <Bell className="w-5 h-5" />
              <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full border border-white"></span>
            </button>
            <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-600 overflow-hidden cursor-pointer">
              <User className="w-4 h-4" />
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto bg-slate-50">
          <div className="p-6 md:p-8 max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
