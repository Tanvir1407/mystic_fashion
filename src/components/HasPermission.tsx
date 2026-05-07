"use client";

import { useAdminAuth } from "@/app/admin/AdminAuthContext";

interface HasPermissionProps {
  action?: string;
  subject?: string;
  name?: string; // e.g., "EDIT_ORDER"
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export default function HasPermission({
  action,
  subject,
  name,
  children,
  fallback = null,
}: HasPermissionProps) {
  const { checkPermission, hasPermissionName } = useAdminAuth();

  let hasAccess = false;

  if (name) {
    hasAccess = hasPermissionName(name);
  } else if (action && subject) {
    hasAccess = checkPermission(action, subject);
  }

  if (!hasAccess) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
