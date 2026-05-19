"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { adminLogout } from "./actions";
import { useState, useEffect, useMemo } from "react";
import {
  Package,
  ShoppingCart,
  LogOut,
  Search,
  Bell,
  User,
  Users,
  Truck,
  Settings,
  ImagePlay,
  Tag,
  AlertTriangle,
  TicketIcon,
  Banknote,
  Menu,
  X,
  Database,
  ChevronDown,
  LayoutDashboard,
  FileText,
  Ruler,
  PanelBottom,
  Boxes,
  ShieldAlert,
  Lock
} from "lucide-react";

const NAV_LINKS = [
  { href: "/admin", icon: <LayoutDashboard className="w-4 h-4 shrink-0" />, label: "Dashboard", exact: true, action: "VIEW", subject: "DASHBOARD" },
  {
    label: "Inventory",
    icon: <Boxes className="w-4 h-4 shrink-0" />,
    children: [
      { href: "/admin/products", label: "Products", action: "VIEW", subject: "PRODUCTS" },
      { href: "/admin/inventory/brands", label: "Brands", action: "VIEW", subject: "PRODUCTS" },
      { href: "/admin/inventory/categories", label: "Categories", action: "VIEW", subject: "PRODUCTS" },
      { href: "/admin/inventory/subcategories", label: "Subcategories", action: "VIEW", subject: "PRODUCTS" },
      { href: "/admin/inventory/adjustments", label: "Stock Adjustments", action: "VIEW", subject: "STOCK_ADJUSTMENTS" },
      { href: "/admin/inventory/low-stock", label: "Low Stock Alerts", action: "VIEW", subject: "LOW_STOCK_ALERTS" },
    ]
  },
  {
    label: "Sales & Finance",
    icon: <ShoppingCart className="w-4 h-4 shrink-0" />,
    children: [
      { href: "/admin/orders", label: "Orders", action: "VIEW", subject: "ORDERS" },
      { href: "/admin/orders/returns", label: "Sales Returns", action: "VIEW", subject: "SALES_RETURNS" },
      { href: "/admin/purchases", label: "Purchases", action: "VIEW", subject: "PURCHASES" },
      { href: "/admin/accounting", label: "Accounting", action: "VIEW", subject: "ACCOUNTING" },
    ]
  },
  {
    label: "Marketing",
    icon: <Tag className="w-4 h-4 shrink-0" />,
    children: [
      { href: "/admin/discounts", label: "Discounts", action: "VIEW", subject: "DISCOUNTS" },
      { href: "/admin/coupons", label: "Coupons", action: "VIEW", subject: "COUPONS" },
    ]
  },
  {
    label: "Content",
    icon: <FileText className="w-4 h-4 shrink-0" />,
    children: [
      { href: "/admin/pages", label: "Pages", action: "VIEW", subject: "PAGES" },
      { href: "/admin/hero", label: "Hero Slides", action: "VIEW", subject: "HERO_SLIDES" },
      { href: "/admin/size-charts", label: "Size Charts", action: "VIEW", subject: "SIZE_CHARTS" },
    ]
  },
  {
    label: "Setup",
    icon: <Settings className="w-4 h-4 shrink-0" />,
    children: [
      { href: "/admin/settings", label: "General Settings", exact: true, action: "VIEW", subject: "GENERAL_SETTINGS" },
      { href: "/admin/settings/footer", label: "Footer Settings", action: "VIEW", subject: "FOOTER_SETTINGS" },
      { href: "/admin/settings/audit-logs", label: "Activity Logs", action: "VIEW", subject: "AUDIT_LOGS" },
      { href: "/admin/staff", label: "Staff Members", action: "VIEW", subject: "STAFF_MEMBERS" },
      { href: "/admin/setup/roles", label: "Role Management", action: "VIEW", subject: "ROLE_MANAGEMENT" },
    ]
  },
];

import { AdminAuthProvider } from "./AdminAuthContext";
import { isRouteAllowed, getRedirectUrlForSession } from "@/lib/permissions";

export default function AdminLayoutClient({ children, session }: { children: React.ReactNode; session: any }) {
  const pathname = usePathname();
  const router = useRouter();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [openGroups, setOpenGroups] = useState<string[]>([]);

  const isAllowed = isRouteAllowed(pathname, session);
  const hasAnyPermission = useMemo(() => {
    return session?.roleName === "SUPERADMIN" || (session?.permissions && session.permissions.length > 0);
  }, [session]);

  // Function to verify if user has a permission
  const checkPermission = (action: string, subject: string) => {
    if (!session) return false;
    if (session.roleName === "SUPERADMIN") return true;
    return session.permissions?.some((p: any) => p.action === action && p.subject === subject);
  };

  // Filter NAV_LINKS based on permission
  const authorizedNavLinks = useMemo(() => {
    return NAV_LINKS.map(group => {
      if (group.href) {
        if (checkPermission(group.action!, group.subject!)) return group;
        return null;
      }

      const authorizedChildren = group.children?.filter(child =>
        checkPermission(child.action!, child.subject!)
      );

      if (authorizedChildren && authorizedChildren.length > 0) {
        return { ...group, children: authorizedChildren };
      }
      return null;
    }).filter(Boolean) as typeof NAV_LINKS;
  }, [session]);

  // Automatically open groups that contain the active link
  useEffect(() => {
    const activeGroup = authorizedNavLinks.find(group =>
      group.children?.some(child => pathname.includes(child.href))
    );
    if (activeGroup && !openGroups.includes(activeGroup.label)) {
      setOpenGroups(prev => [...prev, activeGroup.label]);
    }
  }, [pathname, authorizedNavLinks]);

  const toggleGroup = (label: string) => {
    setOpenGroups(prev =>
      prev.includes(label) ? prev.filter(l => l !== label) : [...prev, label]
    );
  };

  const allFlatLinks = useMemo(() => {
    const flat: any[] = [];
    authorizedNavLinks.forEach(link => {
      if (link.href) flat.push(link);
      if (link.children) flat.push(...link.children.map(c => ({ ...c, icon: link.icon })));
    });
    return flat;
  }, [authorizedNavLinks]);

  const filteredLinks = useMemo(() => {
    if (!searchQuery.trim()) return [];
    return allFlatLinks.filter(link =>
      link.label.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [searchQuery, allFlatLinks]);

  useEffect(() => {
    if (searchQuery && filteredLinks.length === 1) {
      router.push(filteredLinks[0].href);
      setSearchQuery("");
    }
  }, [searchQuery, filteredLinks, router]);

  // Do not show sidebar on the login page or unauthorized page
  if (pathname === "/admin/login" || pathname === "/admin/unauthorized") {
    return <AdminAuthProvider session={session}>{children}</AdminAuthProvider>;
  }

  return (
    <AdminAuthProvider session={session}>
      <div className="flex h-screen bg-slate-50 dark:bg-zinc-950 overflow-hidden relative">
        {/* Mobile Backdrop */}
        {isSidebarOpen && (
          <div
            className="fixed inset-0 z-40 bg-black/50 md:hidden transition-opacity duration-300"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}

        {/* Sidebar - Dark Enterprise Theme */}
        <aside className={`fixed inset-y-0 left-0 z-50 bg-slate-900 border-r border-slate-800 text-slate-300 flex flex-col flex-shrink-0 shadow-lg transform transition-all duration-300 ease-in-out print:hidden overflow-x-hidden ${isSidebarOpen ? "translate-x-0 w-64" : "-translate-x-full w-64"
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

          <div className={`px-5 py-4 flex items-center gap-2 border-b border-slate-800 bg-slate-950/40 transition-all duration-300 ${isCollapsed ? "px-3 justify-center" : ""}`}>
            <div className="w-8 h-8 rounded bg-slate-800 flex items-center justify-center text-slate-300 font-semibold shrink-0">
              {session?.roleName?.charAt(0) || "S"}
            </div>
            {!isCollapsed && (
              <div className="min-w-0">
                <p className="text-xs font-semibold text-slate-400 truncate">Logged in as</p>
                <p className="text-sm font-bold text-white truncate">{session?.roleName || "Staff"}</p>
              </div>
            )}
          </div>

          <div className={`px-5 py-6 font-semibold text-[10px] tracking-wider text-slate-500 uppercase transition-all duration-300 whitespace-nowrap ${isCollapsed ? "opacity-0 h-0 py-0 overflow-hidden" : "opacity-100"}`}>
            Main Menu
          </div>

          <nav className="flex-1 px-3 space-y-1 overflow-y-auto overflow-x-hidden scrollbar-thin scrollbar-thumb-slate-700 pb-20">
            {authorizedNavLinks.map((item) => {
              if (item.href) {
                const isActive = item.exact ? pathname === item.href : pathname.includes(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    title={isCollapsed ? item.label : undefined}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${isActive
                      ? "bg-maroon text-white shadow-md shadow-maroon/20"
                      : "hover:bg-slate-800 hover:text-white"
                      }`}
                  >
                    {item.icon}
                    <span className={`transition-opacity duration-300 ${isCollapsed ? "opacity-0 md:w-0 overflow-hidden" : "opacity-100"}`}>
                      {item.label}
                    </span>
                  </Link>
                );
              }

              // Render Group
              const isGroupOpen = openGroups.includes(item.label);
              const isAnyChildActive = item.children?.some(child =>
                child.exact ? pathname === child.href : pathname.includes(child.href)
              );

              return (
                <div key={item.label} className="space-y-1">
                  <button
                    onClick={() => toggleGroup(item.label)}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-md text-sm font-medium transition-colors whitespace-nowrap group ${isAnyChildActive ? "text-white" : "text-slate-400 hover:bg-slate-800 hover:text-white"
                      }`}
                  >
                    <div className="flex items-center gap-3">
                      {item.icon}
                      <span className={`transition-opacity duration-300 ${isCollapsed ? "opacity-0 md:w-0 overflow-hidden" : "opacity-100"}`}>
                        {item.label}
                      </span>
                    </div>
                    {!isCollapsed && (
                      <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${isGroupOpen ? "rotate-180" : ""}`} />
                    )}
                  </button>

                  {isGroupOpen && !isCollapsed && (
                    <div className="ml-9 space-y-1 border-l border-slate-800">
                      {item.children?.map((child) => {
                        const isChildActive = child.exact ? pathname === child.href : pathname.includes(child.href);
                        return (
                          <Link
                            key={child.href}
                            href={child.href}
                            className={`flex items-center gap-3 px-3 py-2 text-xs font-medium transition-colors whitespace-nowrap rounded-r-md border-l-2 ${isChildActive
                                ? "text-gold border-gold bg-gold/5"
                                : "text-slate-500 border-transparent hover:text-slate-300 hover:bg-slate-800/50"
                              }`}
                          >
                            {child.label}
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
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
              {isAllowed ? (
                children
              ) : (
                <div className="flex flex-col items-center justify-center min-h-[70vh] px-4">
                  <div className="w-full max-w-md bg-white dark:bg-zinc-900 shadow-[0_4px_20px_rgba(0,0,0,0.05)] border border-slate-100 dark:border-zinc-800 rounded-xl p-8 md:p-10 text-center flex flex-col items-center">
                    
                    {/* Sleek Refined Lock Icon */}
                    <div className="w-12 h-12 bg-[#800020]/5 rounded-full flex items-center justify-center mb-6">
                      <Lock className="w-5 h-5 text-[#800020]" />
                    </div>

                    <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight mb-3">
                      Access Restricted
                    </h2>

                    <p className="text-sm text-slate-500 dark:text-zinc-400 mb-8 leading-relaxed max-w-xs font-normal">
                      You do not have permission to access this admin module. Please contact your administrator to assign permissions for your working area.
                    </p>

                    <div className="flex flex-col sm:flex-row items-center gap-3 w-full justify-center">
                      {hasAnyPermission && (
                        <button
                          onClick={() => router.push(getRedirectUrlForSession(session))}
                          className="w-full sm:w-auto h-10 px-5 bg-[#800020] hover:bg-[#600018] text-white text-xs font-semibold rounded-lg transition-colors flex items-center justify-center"
                        >
                          Go to Working Area
                        </button>
                      )}
                      
                      <button
                        onClick={() => adminLogout()}
                        className="w-full sm:w-auto h-10 px-5 border border-slate-200 hover:bg-slate-50 dark:border-zinc-800 dark:hover:bg-zinc-800 text-slate-600 dark:text-zinc-300 text-xs font-semibold rounded-lg transition-colors flex items-center justify-center"
                      >
                        Sign Out
                      </button>
                    </div>

                  </div>
                </div>
              )}
            </div>
          </main>
        </div>
      </div>
    </AdminAuthProvider>
  );
}
