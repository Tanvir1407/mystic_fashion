"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { adminLogout } from "./actions";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // Do not show sidebar on the login page
  if (pathname === "/admin/login") {
    return <>{children}</>;
  }

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-zinc-950">
      {/* Sidebar */}
      <aside className="w-64 bg-white dark:bg-zinc-900 border-r border-slate-200 dark:border-zinc-800 flex flex-col hidden md:flex">
        <div className="h-20 flex items-center px-8 border-b border-slate-200 dark:border-zinc-800">
          <Link href="/admin" className="font-black text-xl tracking-tighter text-foreground uppercase">
            MYSTIC <span className="text-gold">ADMIN</span>
          </Link>
        </div>
        
        <nav className="flex-1 p-4 space-y-2">
          <Link
            href="/admin/products"
            className={`flex items-center px-4 py-3 rounded-xl font-bold tracking-wide transition-all ${
              pathname.includes("/admin/products")
                ? "bg-maroon text-white shadow-lg shadow-maroon/20"
                : "text-foreground/70 hover:bg-slate-100 hover:text-foreground dark:hover:bg-zinc-800"
            }`}
          >
            Products
          </Link>
          <Link
            href="/admin/orders"
            className={`flex items-center px-4 py-3 rounded-xl font-bold tracking-wide transition-all ${
              pathname.includes("/admin/orders")
                ? "bg-maroon text-white shadow-lg shadow-maroon/20"
                : "text-foreground/70 hover:bg-slate-100 hover:text-foreground dark:hover:bg-zinc-800"
            }`}
          >
            Orders
          </Link>
        </nav>

        <div className="p-4 border-t border-slate-200 dark:border-zinc-800">
          <button
            onClick={() => adminLogout()}
            className="w-full flex items-center justify-center px-4 py-3 rounded-xl font-bold text-red-600 bg-red-50 dark:bg-red-500/10 hover:bg-red-100 dark:hover:bg-red-500/20 transition-colors"
          >
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col max-h-screen overflow-y-auto">
        <div className="p-8 lg:p-12">
          {children}
        </div>
      </main>
    </div>
  );
}
