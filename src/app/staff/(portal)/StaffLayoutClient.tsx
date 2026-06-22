"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard, ShoppingBag, Wallet,
  LogOut, Menu, X, Plus, ChevronRight,
} from "lucide-react";
import { staffLogout } from "../login/actions";
import type { StaffSessionPayload } from "@/lib/staff-auth";

const NAV_ITEMS = [
  { href: "/staff/dashboard", label: "Dashboard",       icon: LayoutDashboard, exact: true  },
  { href: "/staff/orders",    label: "My Orders",       icon: ShoppingBag,     exact: false },
  { href: "/staff/payments",  label: "Payment History", icon: Wallet,          exact: false },
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
          className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm md:hidden transition-opacity duration-300"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ── Sidebar ── */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 bg-white border-r border-slate-100 flex flex-col flex-shrink-0 shadow-sm transform transition-all duration-300 ease-in-out overflow-x-hidden
          ${sidebarOpen ? "translate-x-0 w-64" : "-translate-x-full w-64"}
          md:relative md:translate-x-0 ${isCollapsed ? "md:w-[4.5rem]" : "md:w-64"}`}
      >
        {/* Logo */}
        <div className="h-16 flex items-center justify-between px-5 border-b border-slate-100 shrink-0">
          <Link
            href="/staff/dashboard"
            className="flex items-center gap-3 overflow-hidden whitespace-nowrap"
          >
            <div className="w-8 h-8 shrink-0 bg-[#800020] rounded-xl flex items-center justify-center text-white font-black text-sm shadow-sm">
              M
            </div>
            <span className={`text-sm font-bold text-slate-800 tracking-tight transition-opacity duration-300 ${isCollapsed ? "opacity-0" : "opacity-100"}`}>
              Sales Portal
            </span>
          </Link>
          <button
            className="md:hidden text-slate-400 hover:text-slate-700 transition-colors"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* User info */}
        <div className={`flex items-center gap-3 px-5 py-4 border-b border-slate-100 bg-slate-50/70 transition-all duration-300 ${isCollapsed ? "justify-center px-0" : ""}`}>
          <div className="w-8 h-8 rounded-full bg-[#800020]/10 border border-[#800020]/20 flex items-center justify-center text-[#800020] text-xs font-bold shrink-0 uppercase">
            {session.username.charAt(0)}
          </div>
          {!isCollapsed && (
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-700 truncate leading-tight">{session.username}</p>
              <p className="text-xs text-slate-400 mt-0.5 leading-tight truncate">{session.email}</p>
            </div>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto overflow-x-hidden">
          {NAV_ITEMS.map(({ href, label, icon: Icon, exact }) => {
            const active = isActive(href, exact);
            return (
              <Link
                key={href}
                href={href}
                title={isCollapsed ? label : undefined}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all whitespace-nowrap
                  ${active
                    ? "bg-[#800020]/8 text-[#800020]"
                    : "text-slate-500 hover:bg-slate-50 hover:text-slate-800"}`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span className={`transition-opacity duration-300 ${isCollapsed ? "opacity-0 w-0 overflow-hidden" : "opacity-100"}`}>
                  {label}
                </span>
              </Link>
            );
          })}
        </nav>

        {/* New Order CTA */}
        {!isCollapsed && (
          <div className="px-3 pb-4">
            <Link
              href="/staff/orders/create"
              onClick={() => setSidebarOpen(false)}
              className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-sm font-semibold bg-[#800020] text-white hover:bg-[#600018] transition-colors shadow-sm"
            >
              <Plus className="w-4 h-4" />
              New Order
            </Link>
          </div>
        )}

        {/* Sign out */}
        <div className="p-3 border-t border-slate-100 shrink-0">
          <form action={staffLogout}>
            <button
              type="submit"
              title={isCollapsed ? "Sign Out" : undefined}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-400 hover:text-rose-500 hover:bg-rose-50 transition-all whitespace-nowrap"
            >
              <LogOut className="w-4 h-4 shrink-0" />
              <span className={`transition-opacity duration-300 ${isCollapsed ? "opacity-0 w-0 overflow-hidden" : "opacity-100"}`}>
                Sign Out
              </span>
            </button>
          </form>
        </div>
      </aside>

      {/* ── Main content ── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Topbar */}
        <header className="h-16 bg-white border-b border-slate-100 flex items-center justify-between px-4 md:px-6 flex-shrink-0 z-10 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <div className="flex items-center gap-3">
            <button
              className="p-2 -ml-2 text-slate-500 hover:bg-slate-100 rounded-lg md:hidden transition-colors"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="w-5 h-5" />
            </button>
            <button
              className="p-2 -ml-2 text-slate-500 hover:bg-slate-100 rounded-lg hidden md:block transition-colors"
              onClick={() => setIsCollapsed(!isCollapsed)}
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-1.5 text-sm">
              <span className="text-slate-400 font-medium">Portal</span>
              <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
              <span className="font-semibold text-slate-700">{currentLabel}</span>
            </div>
          </div>

          {/* Right side */}
          <div className="flex items-center gap-3">
            {/* New Order shortcut — desktop */}
            <Link
              href="/staff/orders/create"
              className="hidden md:flex items-center gap-2 px-3.5 py-2 bg-[#800020] text-white text-xs font-semibold rounded-xl hover:bg-[#600018] transition-colors shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              New Order
            </Link>

            {/* User dropdown */}
            <div className="relative group py-2">
              <div className="w-8 h-8 rounded-full bg-[#800020]/10 border border-[#800020]/20 flex items-center justify-center text-[#800020] font-bold uppercase cursor-pointer transition-all text-xs hover:bg-[#800020]/15">
                {session.username.charAt(0)}
              </div>

              <div className="absolute right-0 top-full mt-1 w-52 bg-white border border-slate-200/80 shadow-[0_8px_24px_rgba(0,0,0,0.08)] rounded-2xl py-2 z-50 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 transform scale-95 group-hover:scale-100 origin-top-right">
                <div className="px-4 py-3 border-b border-slate-100">
                  <p className="text-xs font-semibold text-slate-800 truncate">{session.username}</p>
                  <p className="text-[11px] text-slate-400 truncate mt-0.5">{session.email}</p>
                </div>

                <div className="py-1">
                  <Link
                    href="/staff/payments"
                    className="flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors"
                  >
                    <Wallet className="w-3.5 h-3.5 text-slate-400" />
                    Payment History
                  </Link>
                </div>

                <div className="border-t border-slate-100 pt-1">
                  <form action={staffLogout}>
                    <button
                      type="submit"
                      className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-rose-500 hover:bg-rose-50 transition-colors text-left"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      Sign Out
                    </button>
                  </form>
                </div>
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto bg-slate-50 print:bg-white print:overflow-visible">
          <div className="p-6 md:p-8 mx-auto print:p-0 print:max-w-none">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
