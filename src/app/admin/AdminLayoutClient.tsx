"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { adminLogout } from "./actions";
import { useState, useEffect, useMemo, useRef } from "react";
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
  AlertCircle,
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
    label: "Sales & Finance",
    icon: <ShoppingCart className="w-4 h-4 shrink-0" />,
    children: [
      { href: "/admin/orders", label: "Orders", action: "VIEW", subject: "ORDERS" },
      { href: "/admin/odr_analytics", label: "Order Analytics", action: "VIEW", subject: "ORDERS" },
      { href: "/admin/odr_returns", label: "Sales Returns", action: "VIEW", subject: "SALES_RETURNS" },
      { href: "/admin/customers", label: "Customers", action: "VIEW", subject: "ORDERS" },
      { href: "/admin/purchases", label: "Purchases", action: "VIEW", subject: "PURCHASES" },
      { href: "/admin/suppliers", label: "Suppliers", action: "VIEW", subject: "PURCHASES" },
      { href: "/admin/accounting", label: "Accounting Dashboard", action: "VIEW", subject: "ACCOUNTING" },
      { href: "/admin/accounting?tab=sales", label: "Sales Journal", action: "VIEW", subject: "ACCOUNTING" },
      { href: "/admin/accounting?tab=ledger", label: "General Ledger", action: "VIEW", subject: "ACCOUNTING" },
    ]
  },
  {
    label: "Inventory",
    icon: <Boxes className="w-4 h-4 shrink-0" />,
    children: [
      { href: "/admin/products", label: "Products", action: "VIEW", subject: "PRODUCTS" },
      { href: "/admin/prod_analytics", label: "Product Analytics", action: "VIEW", subject: "PRODUCTS" },
      { href: "/admin/inventory/brands", label: "Brands", action: "VIEW", subject: "PRODUCTS" },
      { href: "/admin/inventory/categories", label: "Categories", action: "VIEW", subject: "PRODUCTS" },
      { href: "/admin/inventory/subcategories", label: "Subcategories", action: "VIEW", subject: "PRODUCTS" },
      { href: "/admin/inventory/attributes", label: "Attributes", action: "VIEW", subject: "PRODUCTS" },
      { href: "/admin/inventory/adjustments", label: "Stock Adjustments", action: "VIEW", subject: "STOCK_ADJUSTMENTS" },
      { href: "/admin/inventory/low-stock", label: "Low Stock Alerts", action: "VIEW", subject: "LOW_STOCK_ALERTS" },
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
      { href: "/admin/settings?tab=general", label: "General Settings", exact: false, action: "VIEW", subject: "GENERAL_SETTINGS" },
      { href: "/admin/settings?tab=commission", label: "Commission Settings", action: "VIEW", subject: "GENERAL_SETTINGS" },
      { href: "/admin/settings?tab=footer", label: "Footer Settings", action: "VIEW", subject: "FOOTER_SETTINGS" },
      { href: "/admin/settings/audit-logs", label: "Activity Logs", action: "VIEW", subject: "ACTIVITY_LOGS" },
      { href: "/admin/staff", label: "Staff Members", action: "VIEW", subject: "STAFF_MEMBERS" },
      { href: "/admin/setup/roles", label: "Role Management", action: "VIEW", subject: "ROLE_MANAGEMENT" },
    ]
  },
];

import { AdminAuthProvider } from "./AdminAuthContext";
import { isRouteAllowed, getRedirectUrlForSession } from "@/lib/permissions";
import { getActiveCancellationRequests } from "./orders/actions";

export default function AdminLayoutClient({ children, session }: { children: React.ReactNode; session: any }) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [openGroups, setOpenGroups] = useState<string[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);
  const prevNavKey = useRef(`${pathname}__${searchParams?.toString()}`);

  // Clear when navigation completes
  useEffect(() => {
    const currentKey = `${pathname}__${searchParams?.toString()}`;
    if (prevNavKey.current !== currentKey) {
      prevNavKey.current = currentKey;
      setIsNavigating(false);
    }
  }, [pathname, searchParams]);

  // Detect any admin link click instantly — no need to touch each <Link>
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const anchor = (e.target as Element).closest("a");
      if (!anchor?.href) return;
      try {
        const url = new URL(anchor.href, window.location.origin);
        const currentKey = `${pathname}__${searchParams?.toString()}`;
        const targetKey = `${url.pathname}__${url.search.replace("?", "")}`;
        if (url.origin === window.location.origin && url.pathname.startsWith("/admin") && targetKey !== currentKey) {
          setIsNavigating(true);
        }
      } catch { /* ignore */ }
    };
    document.addEventListener("click", handler, true);
    return () => document.removeEventListener("click", handler, true);
  }, [pathname, searchParams]);

  const fetchNotifications = async () => {
    try {
      const res = await getActiveCancellationRequests();
      if (res.success && res.data) {
        setNotifications(res.data);
      }
    } catch (err) {
      console.error("Failed to fetch notifications:", err);
    }
  };

  useEffect(() => {
    if (!session) return;
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [session]);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest(".notifications-dropdown-container")) {
        setShowNotifications(false);
      }
    };
    document.addEventListener("click", handleOutsideClick);
    return () => document.removeEventListener("click", handleOutsideClick);
  }, []);

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
      group.children?.some(child => pathname.includes(child.href.split("?")[0]))
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
            className="fixed inset-0 z-[60] bg-black/50 md:hidden transition-opacity duration-300"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}

        {/* Sidebar */}
        <aside className={`fixed inset-y-0 left-0 z-[70] bg-white border-r border-slate-100 flex flex-col flex-shrink-0 shadow-sm transform transition-all duration-300 ease-in-out print:hidden overflow-x-hidden ${
          isSidebarOpen ? "translate-x-0 w-64" : "-translate-x-full w-64"
        } md:relative md:translate-x-0 ${isCollapsed ? "md:w-[5rem]" : "md:w-64"}`}>

          {/* Logo */}
          <div className="h-16 flex items-center justify-between px-5 border-b border-slate-100 shrink-0">
            <Link href="/admin" className="flex items-center gap-3 overflow-hidden whitespace-nowrap">
              <div className="w-8 h-8 shrink-0 bg-[#800020] rounded-xl flex items-center justify-center text-white font-black text-sm shadow-sm">M</div>
              <span className={`text-sm font-bold text-slate-800 tracking-tight transition-opacity duration-300 ${isCollapsed ? "opacity-0" : "opacity-100"}`}>
                Mystic Admin
              </span>
            </Link>
            <button className="md:hidden text-slate-400 hover:text-slate-700 transition-colors" onClick={() => setIsSidebarOpen(false)}>
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* User */}
          <div className={`flex items-center gap-3 px-5 py-4 border-b border-slate-100 bg-slate-50/70 transition-all duration-300 ${isCollapsed ? "justify-center px-0" : ""}`}>
            <div className="w-8 h-8 rounded-full bg-[#800020]/10 border border-[#800020]/20 flex items-center justify-center text-[#800020] text-xs font-bold shrink-0">
              {session?.roleName?.charAt(0) || "S"}
            </div>
            {!isCollapsed && (
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-700 truncate leading-tight">{session?.roleName || "Staff"}</p>
                <p className="text-xs text-slate-400 mt-0.5 leading-tight">Admin Panel</p>
              </div>
            )}
          </div>

          {/* Nav */}
          <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto overflow-x-hidden scrollbar-thin scrollbar-thumb-slate-200 pb-20">
            {authorizedNavLinks.map((item) => {
              if (item.href) {
                const isActive = item.exact ? pathname === item.href : pathname.includes(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    title={isCollapsed ? item.label : undefined}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all whitespace-nowrap ${
                      isActive
                        ? "bg-[#800020]/8 text-[#800020]"
                        : "text-slate-500 hover:bg-slate-50 hover:text-slate-800"
                    }`}
                  >
                    {item.icon}
                    <span className={`transition-opacity duration-300 ${isCollapsed ? "opacity-0 w-0 overflow-hidden" : "opacity-100"}`}>
                      {item.label}
                    </span>
                  </Link>
                );
              }

              const isGroupOpen = openGroups.includes(item.label);
              const isAnyChildActive = item.children?.some(child => {
                const childPath = child.href.split("?")[0];
                const childTab = child.href.includes("?tab=") ? child.href.split("?tab=")[1].split("&")[0] : null;
                const currentTab = searchParams?.get("tab");
                if (childTab) return pathname === childPath && currentTab === childTab;
                if (childPath === "/admin/accounting") return pathname === childPath && (!currentTab || currentTab === "overview");
                return child.exact ? pathname === child.href : pathname.includes(child.href);
              });

              return (
                <div key={item.label}>
                  <button
                    onClick={() => toggleGroup(item.label)}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all whitespace-nowrap ${
                      isAnyChildActive
                        ? "text-[#800020] bg-[#800020]/5"
                        : "text-slate-500 hover:bg-slate-50 hover:text-slate-800"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {item.icon}
                      <span className={`transition-opacity duration-300 ${isCollapsed ? "opacity-0 w-0 overflow-hidden" : "opacity-100"}`}>
                        {item.label}
                      </span>
                    </div>
                    {!isCollapsed && (
                      <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${isGroupOpen ? "rotate-180" : ""}`} />
                    )}
                  </button>

                  {isGroupOpen && !isCollapsed && (
                    <div className="mt-1 ml-4 pl-3.5 border-l-2 border-slate-100 space-y-0.5 mb-2">
                      {item.children?.map((child) => {
                        const childPath = child.href.split("?")[0];
                        const childTab = child.href.includes("?tab=") ? child.href.split("?tab=")[1].split("&")[0] : null;
                        const currentTab = searchParams?.get("tab");
                        let isChildActive = false;
                        if (childTab) {
                          isChildActive = pathname === childPath && (currentTab === childTab || (!currentTab && childTab === "general"));
                        } else if (childPath === "/admin/accounting") {
                          isChildActive = pathname === childPath && (!currentTab || currentTab === "overview");
                        } else {
                          isChildActive = child.exact ? pathname === child.href : pathname.includes(child.href);
                        }
                        return (
                          <Link
                            key={child.href}
                            href={child.href}
                            className={`flex items-center px-3 py-2 text-[13px] transition-all rounded-lg whitespace-nowrap ${
                              isChildActive
                                ? "text-[#800020] font-semibold bg-[#800020]/6"
                                : "text-slate-400 font-medium hover:text-slate-700 hover:bg-slate-50"
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

          {/* Logout */}
          <div className="p-4 border-t border-slate-100 shrink-0">
            <button
              onClick={() => adminLogout()}
              title={isCollapsed ? "Sign Out" : undefined}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-400 hover:text-rose-500 hover:bg-rose-50 transition-all whitespace-nowrap"
            >
              <LogOut className="w-4 h-4 shrink-0" />
              <span className={`transition-opacity duration-300 ${isCollapsed ? "opacity-0 w-0 overflow-hidden" : "opacity-100"}`}>
                Sign Out
              </span>
            </button>
          </div>
        </aside>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {/* Topbar */}
          <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 md:px-6 flex-shrink-0 z-[45] print:hidden">
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
              {/* Notifications Dropdown */}
              <div className="relative notifications-dropdown-container">
                <button
                  onClick={() => setShowNotifications(!showNotifications)}
                  className="text-slate-400 hover:text-slate-600 transition-colors relative p-1.5 rounded-full hover:bg-slate-100 cursor-pointer focus:outline-none flex items-center justify-center"
                >
                  <Bell className="w-5 h-5" />
                  {notifications.length > 0 && (
                    <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-rose-500 rounded-full border border-white"></span>
                  )}
                </button>

                {/* Dropdown Card */}
                {showNotifications && (
                  <div className="absolute right-0 top-full mt-2 w-80 bg-white border border-slate-200/80 shadow-[0_10px_30px_rgba(0,0,0,0.08)] rounded-xl py-1.5 z-50 transition-all duration-200 transform origin-top-right">
                    <div className="px-4 py-2 border-b border-slate-100 flex items-center justify-between">
                      <p className="text-xs font-bold text-slate-800">Pending Requests</p>
                      {notifications.length > 0 && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 bg-rose-50 text-rose-600 rounded-full border border-rose-100">
                          {notifications.length} new
                        </span>
                      )}
                    </div>
                    <div className="max-h-80 overflow-y-auto py-1">
                      {notifications.length === 0 ? (
                        <div className="px-4 py-6 text-center text-slate-400">
                          <AlertCircle className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                          <p className="text-xs font-medium">No pending requests</p>
                          <p className="text-[10px] text-slate-400/80 mt-0.5">Staff cancellation requests will show here.</p>
                        </div>
                      ) : (
                        notifications.map((req: any) => (
                          <Link
                            key={req.id}
                            href={`/admin/orders/${req.orderId}`}
                            onClick={() => setShowNotifications(false)}
                            className="flex items-start gap-3 px-4 py-3 hover:bg-slate-50 transition-colors border-b border-slate-50 last:border-0"
                          >
                            <div className="p-1 bg-rose-50 rounded-lg text-rose-500 mt-0.5">
                              <AlertCircle className="w-4 h-4" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-bold text-slate-800">
                                Cancellation Requested
                              </p>
                              <p className="text-[10px] font-semibold text-slate-500 mt-0.5">
                                Order:{req.orderId}
                              </p>
                              <p className="text-[10px] text-slate-500 mt-0.5">
                                Requested by: <span className="font-semibold text-slate-700">{req.staffName}</span>
                              </p>
                              {req.reason && (
                                <p className="text-[10px] text-slate-500 italic mt-1 bg-slate-50 p-1.5 rounded border border-slate-100 truncate">
                                  "{req.reason}"
                                </p>
                              )}
                              <p className="text-[9px] text-slate-400 mt-1">
                                {new Date(req.createdAt).toLocaleDateString("en-US", {
                                  month: "short",
                                  day: "numeric",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </p>
                            </div>
                          </Link>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
              {/* User Dropdown with Hover Trigger */}
              <div className="relative group py-2">
                <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 hover:border-slate-300 hover:bg-slate-200 flex items-center justify-center text-slate-600 cursor-pointer overflow-hidden transition-all duration-200">
                  {session?.roleName ? (
                    <span className="text-xs font-bold text-slate-700 uppercase">
                      {session.roleName.charAt(0)}
                    </span>
                  ) : (
                    <User className="w-4 h-4" />
                  )}
                </div>

                {/* Dropdown Card */}
                <div className="absolute right-0 top-full mt-1 w-48 bg-white border border-slate-200/80 shadow-[0_10px_30px_rgba(0,0,0,0.08)] rounded-xl py-1.5 z-50 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 transform scale-95 group-hover:scale-100 origin-top-right">
                  <div className="px-4 py-2 border-b border-slate-100">
                    <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Logged in as</p>
                    <p className="text-sm font-bold text-slate-800 truncate mt-0.5">{session?.roleName || "Staff"}</p>
                  </div>

                  {session?.userId && (
                    <Link
                      href={`/admin/staff/${session.userId}`}
                      className="flex items-center gap-2.5 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors"
                    >
                      <User className="w-3.5 h-3.5 text-slate-400" />
                      My Profile
                    </Link>
                  )}

                  <Link
                    href="/admin/settings"
                    className="flex items-center gap-2.5 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors"
                  >
                    <Settings className="w-3.5 h-3.5 text-slate-400" />
                    My Settings
                  </Link>

                  <div className="border-t border-slate-100 my-1"></div>

                  <button
                    onClick={() => adminLogout()}
                    className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50/50 transition-colors text-left"
                  >
                    <LogOut className="w-3.5 h-3.5 text-rose-500" />
                    Sign Out
                  </button>
                </div>
              </div>
            </div>
          </header>

          {/* Page Content */}
          <main className="flex-1 overflow-y-auto bg-slate-50 print:bg-white print:overflow-visible relative">
            {/* Navigation progress bar — sits at top of content area, non-blocking */}
            {isNavigating && (
              <div className="absolute top-0 left-0 right-0 z-50 h-[2px] overflow-hidden bg-slate-100">
                <div className="h-full bg-[#800020] animate-[navBar_1.4s_ease-in-out_infinite]" />
              </div>
            )}
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
