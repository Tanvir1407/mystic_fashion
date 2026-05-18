export interface SessionPayload {
  userId: string;
  roleName: string;
  permissions: { action: string; subject: string }[];
  [key: string]: any;
}

export const ROUTE_PERMISSIONS = [
  // Order matters: match more specific/longer paths first!
  { prefix: "/admin/inventory/brands", action: "VIEW", subject: "PRODUCTS" },
  { prefix: "/admin/inventory/categories", action: "VIEW", subject: "PRODUCTS" },
  { prefix: "/admin/inventory/subcategories", action: "VIEW", subject: "PRODUCTS" },
  { prefix: "/admin/inventory/adjustments", action: "VIEW", subject: "STOCK_ADJUSTMENTS" },
  { prefix: "/admin/inventory/low-stock", action: "VIEW", subject: "LOW_STOCK_ALERTS" },
  { prefix: "/admin/products", action: "VIEW", subject: "PRODUCTS" },
  { prefix: "/admin/orders/returns", action: "VIEW", subject: "SALES_RETURNS" },
  { prefix: "/admin/orders", action: "VIEW", subject: "ORDERS" },
  { prefix: "/admin/purchases", action: "VIEW", subject: "PURCHASES" },
  { prefix: "/admin/accounting", action: "VIEW", subject: "ACCOUNTING" },
  { prefix: "/admin/discounts", action: "VIEW", subject: "DISCOUNTS" },
  { prefix: "/admin/coupons", action: "VIEW", subject: "COUPONS" },
  { prefix: "/admin/pages", action: "VIEW", subject: "PAGES" },
  { prefix: "/admin/hero", action: "VIEW", subject: "HERO_SLIDES" },
  { prefix: "/admin/size-charts", action: "VIEW", subject: "SIZE_CHARTS" },
  { prefix: "/admin/settings/footer", action: "VIEW", subject: "FOOTER_SETTINGS" },
  { prefix: "/admin/settings", action: "VIEW", subject: "GENERAL_SETTINGS" },
  { prefix: "/admin/staff", action: "VIEW", subject: "STAFF_MEMBERS" },
  { prefix: "/admin/setup/roles", action: "VIEW", subject: "ROLE_MANAGEMENT" },
  { prefix: "/admin", exact: true, action: "VIEW", subject: "DASHBOARD" },
];

/**
 * Checks if a session has access to a specific route based on ROUTE_PERMISSIONS.
 */
export function isRouteAllowed(pathname: string, session: any): boolean {
  if (pathname === "/admin/login" || pathname === "/admin/unauthorized") return true;
  if (!session) return false;
  if (session.roleName === "SUPERADMIN") return true;

  // Find the matching permission rule for this route
  const rule = ROUTE_PERMISSIONS.find(r => {
    if (r.exact) {
      return pathname === r.prefix || pathname === r.prefix + "/";
    }
    return pathname.startsWith(r.prefix);
  });

  if (!rule) return true; // Default allowed if no specific rule governs it

  return session.permissions?.some(
    (p: any) => p.action === rule.action && p.subject === rule.subject
  ) || false;
}

/**
 * Calculates the dynamic target redirect URL for an admin session based on their permissions.
 */
export function getRedirectUrlForSession(session: any): string {
  if (!session) return "/admin/login";
  if (session.roleName === "SUPERADMIN") return "/admin";

  const checkPermission = (action: string, subject: string) => {
    return session.permissions?.some(
      (p: any) => p.action === action && p.subject === subject
    ) || false;
  };

  // 1. First priority: Dashboard
  if (checkPermission("VIEW", "DASHBOARD")) {
    return "/admin";
  }

  // 2. Fallbacks in the exact configured priority order of modules
  const fallbackPages = [
    { href: "/admin/products", action: "VIEW", subject: "PRODUCTS" },
    { href: "/admin/inventory/brands", action: "VIEW", subject: "PRODUCTS" },
    { href: "/admin/inventory/categories", action: "VIEW", subject: "PRODUCTS" },
    { href: "/admin/inventory/subcategories", action: "VIEW", subject: "PRODUCTS" },
    { href: "/admin/inventory/adjustments", action: "VIEW", subject: "STOCK_ADJUSTMENTS" },
    { href: "/admin/inventory/low-stock", action: "VIEW", subject: "LOW_STOCK_ALERTS" },
    { href: "/admin/orders", action: "VIEW", subject: "ORDERS" },
    { href: "/admin/orders/returns", action: "VIEW", subject: "SALES_RETURNS" },
    { href: "/admin/purchases", action: "VIEW", subject: "PURCHASES" },
    { href: "/admin/accounting", action: "VIEW", subject: "ACCOUNTING" },
    { href: "/admin/discounts", action: "VIEW", subject: "DISCOUNTS" },
    { href: "/admin/coupons", action: "VIEW", subject: "COUPONS" },
    { href: "/admin/pages", action: "VIEW", subject: "PAGES" },
    { href: "/admin/hero", action: "VIEW", subject: "HERO_SLIDES" },
    { href: "/admin/size-charts", action: "VIEW", subject: "SIZE_CHARTS" },
    { href: "/admin/settings", action: "VIEW", subject: "GENERAL_SETTINGS" },
    { href: "/admin/settings/footer", action: "VIEW", subject: "FOOTER_SETTINGS" },
    { href: "/admin/staff", action: "VIEW", subject: "STAFF_MEMBERS" },
    { href: "/admin/setup/roles", action: "VIEW", subject: "ROLE_MANAGEMENT" },
  ];

  for (const page of fallbackPages) {
    if (checkPermission(page.action, page.subject)) {
      return page.href;
    }
  }

  // 3. Absolute fallback: No permissions found
  return "/admin/unauthorized";
}
