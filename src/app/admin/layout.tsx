"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { adminLogout } from "./actions";
import { useState, useEffect, useMemo } from "react";
import { Package, ShoppingCart, LogOut, Search, Bell, User, Users, Truck, Settings, ImagePlay, Tag, AlertTriangle, TicketIcon, Banknote, Menu, X } from "lucide-react";

const NAV_LINKS = [
  { href: "/admin", icon: <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-layout-dashboard w-4 h-4 shrink-0"><rect width="7" height="9" x="3" y="3" rx="1" /><rect width="7" height="5" x="14" y="3" rx="1" /><rect width="7" height="9" x="14" y="12" rx="1" /><rect width="7" height="5" x="3" y="16" rx="1" /></svg>, label: "Dashboard", exact: true },
  { href: "/admin/products", icon: <Package className="w-4 h-4 shrink-0" />, label: "Products" },
  { href: "/admin/orders", icon: <ShoppingCart className="w-4 h-4 shrink-0" />, label: "Orders" },
  { href: "/admin/purchases", icon: <Truck className="w-4 h-4 shrink-0" />, label: "Purchases" },
  { href: "/admin/accounting", icon: <Banknote className="w-4 h-4 shrink-0" />, label: "Accounting" },
  { href: "/admin/discounts", icon: <Tag className="w-4 h-4 shrink-0" />, label: "Discounts" },
  { href: "/admin/coupons", icon: <TicketIcon className="w-4 h-4 shrink-0" />, label: "Coupons" },
  { href: "/admin/size-charts", icon: <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-ruler w-4 h-4 shrink-0"><path d="M21.3 15.3a2.4 2.4 0 0 1 0 3.4l-2.6 2.6a2.4 2.4 0 0 1-3.4 0L2.7 8.7a2.41 2.41 0 0 1 0-3.4l2.6-2.6a2.41 2.41 0 0 1 3.4 0Z" /><path d="m14.5 12.5 2-2" /><path d="m11.5 9.5 2-2" /><path d="m8.5 6.5 2-2" /><path d="m17.5 15.5 2-2" /></svg>, label: "Size Charts" },
  { href: "/admin/hero", icon: <ImagePlay className="w-4 h-4 shrink-0" />, label: "Hero Slides" },
  { href: "/admin/staff", icon: <Users className="w-4 h-4 shrink-0" />, label: "Staff" },
  { href: "/admin/inventory", icon: <AlertTriangle className="w-4 h-4 shrink-0 text-amber-500" />, label: "Inventory Alerts" },
  { href: "/admin/settings", icon: <Settings className="w-4 h-4 shrink-0" />, label: "General Settings", exact: true },
  { href: "/admin/pages", icon: <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-file-text w-4 h-4 shrink-0"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" /><path d="M14 2v4a2 2 0 0 0 2 2h4" /><path d="M10 9H8" /><path d="M16 13H8" /><path d="M16 17H8" /></svg>, label: "Content Pages" },
  { href: "/admin/settings/footer", icon: <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-panel-bottom w-4 h-4 shrink-0"><rect width="18" height="18" x="3" y="3" rx="2" /><path d="M3 15h18" /></svg>, label: "Footer Settings" },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const filteredLinks = useMemo(() => {
    if (!searchQuery.trim()) return [];
    return NAV_LINKS.filter(link => 
      link.label.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [searchQuery]);

  useEffect(() => {
    if (searchQuery && filteredLinks.length === 1) {
      router.push(filteredLinks[0].href);
      setSearchQuery("");
    }
  }, [searchQuery, filteredLinks, router]);

  // Do not show sidebar on the login page
  if (pathname === "/admin/login") {
    return <>{children}</>;
  }

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-zinc-950 overflow-hidden relative">
      {/* Mobile Backdrop */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/50 md:hidden transition-opacity duration-300" 
          onClick={() => setIsSidebarOpen(false)} 
        />
      )}

      {/* Sidebar - Dark Enterprise Theme */}
      <aside className={`fixed inset-y-0 left-0 z-50 bg-slate-900 border-r border-slate-800 text-slate-300 flex flex-col flex-shrink-0 shadow-lg transform transition-all duration-300 ease-in-out print:hidden overflow-x-hidden ${
        isSidebarOpen ? "translate-x-0 w-64" : "-translate-x-full w-64"
      } md:relative md:translate-x-0 ${isCollapsed ? "md:w-[4.5rem]" : "md:w-64"}`}>
        <div className="h-16 flex items-center justify-between px-5 border-b border-slate-800 shrink-0">
          <Link href="/admin" className="font-bold text-lg tracking-tight text-white flex items-center gap-3 overflow-hidden whitespace-nowrap">
            <div className="w-8 h-8 shrink-0 bg-gold rounded-md flex items-center justify-center text-slate-900 font-black shadow-sm">M</div>
            <span className={`transition-opacity duration-300 ${isCollapsed ? "opacity-0" : "opacity-100"}`}>Mystic Admin</span>
          </Link>
          <button 
            className="md:hidden text-slate-400 hover:text-white transition-colors"
            onClick={() => setIsSidebarOpen(false)}
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className={`px-5 py-6 font-semibold text-[10px] tracking-wider text-slate-500 uppercase transition-all duration-300 whitespace-nowrap ${isCollapsed ? "opacity-0 h-0 py-0 overflow-hidden" : "opacity-100"}`}>
          Overview
        </div>
        <div className={`md:hidden px-5 py-6 font-semibold text-[10px] tracking-wider text-slate-500 uppercase transition-all duration-300 whitespace-nowrap ${!isCollapsed ? "hidden" : "block opacity-100"}`}>
          Overview
        </div>
        <nav className="flex-1 px-3 space-y-1 overflow-y-auto overflow-x-hidden scrollbar-thin scrollbar-thumb-slate-700">
          {NAV_LINKS.map((link) => {
            const isActive = link.exact ? pathname === link.href : pathname.includes(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                title={isCollapsed ? link.label : undefined}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${isActive
                  ? "bg-maroon text-white shadow-md shadow-maroon/20"
                  : "hover:bg-slate-800 hover:text-white"
                  }`}
              >
                {link.icon}
                <span className={`transition-opacity duration-300 ${isCollapsed ? "opacity-0 md:w-0 overflow-hidden" : "opacity-100"}`}>
                  {link.label}
                </span>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-800 shrink-0">
          <button
            onClick={() => adminLogout()}
            title={isCollapsed ? "Sign Out" : undefined}
            className={`w-full flex items-center justify-center gap-3 px-4 py-2.5 rounded-md text-sm font-medium text-slate-400 hover:bg-slate-800 hover:text-white transition-colors overflow-hidden whitespace-nowrap`}
          >
            <LogOut className="w-4 h-4 shrink-0" />
            <span className={`transition-opacity duration-300 ${isCollapsed ? "opacity-0 md:w-0 md:hidden" : "opacity-100"}`}>
              Sign Out
            </span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Topbar */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 md:px-6 flex-shrink-0 z-10 print:hidden">
          <div className="flex items-center gap-4 flex-1">
            <button 
              className="p-2 -ml-2 text-slate-600 hover:bg-slate-100 rounded-md md:hidden transition-colors"
              onClick={() => setIsSidebarOpen(true)}
            >
              <Menu className="w-6 h-6" />
            </button>
            <button 
              className="p-2 -ml-2 text-slate-600 hover:bg-slate-100 rounded-md hidden md:block transition-colors"
              onClick={() => setIsCollapsed(!isCollapsed)}
            >
              <Menu className="w-6 h-6" />
            </button>
            <div className="relative w-full max-w-72 hidden sm:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search resources..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-md text-sm focus:border-slate-300 focus:bg-white focus:ring-0 transition-colors"
              />
              {searchQuery && filteredLinks.length > 1 && (
                <div className="absolute top-full mt-2 left-0 w-full bg-white border border-slate-200 shadow-lg rounded-md overflow-hidden z-50">
                  <div className="max-h-64 overflow-y-auto py-1">
                    {filteredLinks.map(link => (
                      <Link
                        key={link.href}
                        href={link.href}
                        onClick={() => setSearchQuery("")}
                        className="flex items-center gap-3 px-4 py-2 hover:bg-slate-50 text-sm font-medium text-slate-700 transition-colors"
                      >
                        {link.icon}
                        {link.label}
                      </Link>
                    ))}
                  </div>
                </div>
              )}
              {searchQuery && filteredLinks.length === 0 && (
                <div className="absolute top-full mt-2 left-0 w-full bg-white border border-slate-200 shadow-lg rounded-md overflow-hidden z-50 p-4 text-sm text-slate-500 text-center">
                  No resources found matching "{searchQuery}"
                </div>
              )}
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
        <main className="flex-1 overflow-y-auto bg-slate-50 print:bg-white print:overflow-visible">
          <div className="p-6 md:p-8 mx-auto print:p-0 print:max-w-none">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
