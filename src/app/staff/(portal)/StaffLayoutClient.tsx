"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard, ShoppingBag, Wallet, TrendingUp,
  LogOut, Menu, X, Plus
} from "lucide-react";
import { staffLogout } from "../login/actions";
import type { StaffSessionPayload } from "@/lib/staff-auth";

const NAV_ITEMS = [
  { href: "/staff/dashboard", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/staff/orders", label: "My Orders", icon: ShoppingBag, exact: false },
  { href: "/staff/commission", label: "My Commission", icon: TrendingUp, exact: false },
  { href: "/staff/payments", label: "Payment History", icon: Wallet, exact: false },
];

export default function StaffLayoutClient({
  children,
  session,
}: {
  children: React.ReactNode;
  session: StaffSessionPayload;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  useEffect(() => {
    router.refresh();
  }, [pathname, router]);

  const isActive = (href: string, exact: boolean) =>
    exact ? pathname === href : pathname === href || pathname.startsWith(href + "/");

  const currentLabel =
    NAV_ITEMS.find((n) => isActive(n.href, n.exact))?.label ?? "Sales Portal";

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden relative">

      {/* Mobile backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden transition-opacity duration-300"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ── Sidebar ── */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 bg-slate-900 border-r border-slate-800 text-slate-300 flex flex-col flex-shrink-0 shadow-lg transform transition-all duration-300 ease-in-out overflow-x-hidden
          ${sidebarOpen ? "translate-x-0 w-64" : "-translate-x-full w-64"}
          md:relative md:translate-x-0 ${isCollapsed ? "md:w-[4.5rem]" : "md:w-64"}`}
      >
        {/* Logo */}
        <div className="h-16 flex items-center justify-between px-5 border-b border-slate-800 shrink-0">
          <Link
            href="/staff/dashboard"
            className="font-bold text-lg tracking-tight text-white flex items-center gap-3 overflow-hidden whitespace-nowrap"
          >
            <div className="w-8 h-8 shrink-0 bg-[#c9a84c] rounded-md flex items-center justify-center text-slate-900 font-black shadow-sm">
              M
            </div>
            <span className={`transition-opacity duration-300 ${isCollapsed ? "opacity-0" : "opacity-100"}`}>
              Sales Portal
            </span>
          </Link>
          <button
            className="md:hidden text-slate-400 hover:text-white transition-colors"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* User info */}
        <div className={`px-5 py-4 flex items-center gap-2 border-b border-slate-800 bg-slate-950/40 transition-all duration-300 ${isCollapsed ? "px-3 justify-center" : ""}`}>
          <div className="w-8 h-8 rounded bg-slate-700 flex items-center justify-center text-white font-bold shrink-0 uppercase">
            {session.username.charAt(0)}
          </div>
          {!isCollapsed && (
            <div className="min-w-0">
              <p className="text-xs font-semibold text-slate-400 truncate">Sales Person</p>
              <p className="text-sm font-bold text-white truncate">{session.username}</p>
            </div>
          )}
        </div>

        {/* Section label */}
        <div className={`px-5 py-5 font-semibold text-[10px] tracking-wider text-slate-500 uppercase transition-all duration-300 whitespace-nowrap ${isCollapsed ? "opacity-0 h-0 py-0 overflow-hidden" : "opacity-100"}`}>
          Main Menu
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 space-y-1 overflow-y-auto overflow-x-hidden pb-20">
          {NAV_ITEMS.map(({ href, label, icon: Icon, exact }) => {
            const active = isActive(href, exact);
            return (
              <Link
                key={href}
                href={href}
                title={isCollapsed ? label : undefined}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors whitespace-nowrap
                  ${active
                    ? "bg-[#800020] text-white shadow-md shadow-[#800020]/20"
                    : "text-slate-400 hover:bg-slate-800 hover:text-white"}`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span className={`transition-opacity duration-300 ${isCollapsed ? "opacity-0 md:w-0 overflow-hidden" : "opacity-100"}`}>
                  {label}
                </span>
              </Link>
            );
          })}

          {/* Quick action */}
          {!isCollapsed && (
            <div className="pt-4">
              <Link
                href="/staff/orders/create"
                onClick={() => setSidebarOpen(false)}
                className="flex items-center justify-center gap-2 w-full py-2.5 rounded-md text-xs font-bold bg-[#c9a84c]/10 text-[#c9a84c] border border-[#c9a84c]/20 hover:bg-[#c9a84c]/20 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                New Order
              </Link>
            </div>
          )}
        </nav>

        {/* Sign out */}
        <div className="p-4 border-t border-slate-800 shrink-0">
          <form action={staffLogout}>
            <button
              type="submit"
              title={isCollapsed ? "Sign Out" : undefined}
              className="w-full flex items-center justify-center gap-3 px-4 py-2.5 rounded-md text-sm font-medium text-slate-400 hover:bg-slate-800 hover:text-white transition-colors overflow-hidden whitespace-nowrap"
            >
              <LogOut className="w-4 h-4 shrink-0" />
              <span className={`transition-opacity duration-300 ${isCollapsed ? "opacity-0 md:w-0 md:hidden" : "opacity-100"}`}>
                Sign Out
              </span>
            </button>
          </form>
        </div>
      </aside>

      {/* ── Main content ── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Topbar */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 md:px-6 flex-shrink-0 z-10">
          <div className="flex items-center gap-3">
            {/* Mobile hamburger */}
            <button
              className="p-2 -ml-2 text-slate-600 hover:bg-slate-100 rounded-md md:hidden transition-colors"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="w-5 h-5" />
            </button>
            {/* Desktop collapse toggle */}
            <button
              className="p-2 -ml-2 text-slate-600 hover:bg-slate-100 rounded-md hidden md:block transition-colors"
              onClick={() => setIsCollapsed(!isCollapsed)}
            >
              <Menu className="w-5 h-5" />
            </button>
            <span className="text-sm font-semibold text-slate-700">{currentLabel}</span>
          </div>

          {/* User dropdown */}
          <div className="relative group py-2">
            <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 hover:border-slate-300 hover:bg-slate-200 flex items-center justify-center text-slate-700 font-bold uppercase cursor-pointer transition-all duration-200 text-xs">
              {session.username.charAt(0)}
            </div>

            <div className="absolute right-0 top-full mt-1 w-48 bg-white border border-slate-200/80 shadow-[0_10px_30px_rgba(0,0,0,0.08)] rounded-xl py-1.5 z-50 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 transform scale-95 group-hover:scale-100 origin-top-right">
              <div className="px-4 py-2 border-b border-slate-100">
                <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Logged in as</p>
                <p className="text-sm font-bold text-slate-800 truncate mt-0.5">{session.username}</p>
                <p className="text-xs text-slate-400 truncate">{session.email}</p>
              </div>

              <Link
                href="/staff/payments"
                className="flex items-center gap-2.5 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors"
              >
                <Wallet className="w-3.5 h-3.5 text-slate-400" />
                Payment History
              </Link>

              <div className="border-t border-slate-100 my-1" />

              <form action={staffLogout}>
                <button
                  type="submit"
                  className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50/50 transition-colors text-left"
                >
                  <LogOut className="w-3.5 h-3.5 text-rose-500" />
                  Sign Out
                </button>
              </form>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto bg-slate-50">
          <div className="p-6 md:p-8 mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
