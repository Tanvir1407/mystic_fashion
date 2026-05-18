"use client";

import { createContext, useContext } from "react";

interface AuthContextType {
  session: any;
  checkPermission: (action: string, subject: string) => boolean;
  hasPermissionName: (name: string) => boolean;
}

const AdminAuthContext = createContext<AuthContextType | undefined>(undefined);

export function AdminAuthProvider({ children, session }: { children: React.ReactNode; session: any }) {
  const checkPermission = (action: string, subject: string) => {
    if (!session) return false;
    if (session.roleName === "SUPERADMIN") return true;
    return session.permissions?.some((p: any) => p.action === action && p.subject === subject);
  };

  const hasPermissionName = (name: string) => {
    if (!session) return false;
    if (session.roleName === "SUPERADMIN") return true;
    
    // Parse e.g. "EDIT_ORDER" into action="EDIT" and subject="ORDER"
    const firstUnderscore = name.indexOf("_");
    if (firstUnderscore === -1) return false;
    const action = name.substring(0, firstUnderscore);
    const subject = name.substring(firstUnderscore + 1);
    
    return checkPermission(action, subject);
  };

  return (
    <AdminAuthContext.Provider value={{ session, checkPermission, hasPermissionName }}>
      {children}
    </AdminAuthContext.Provider>
  );
}

export function useAdminAuth() {
  const context = useContext(AdminAuthContext);
  if (!context) {
    throw new Error("useAdminAuth must be used within an AdminAuthProvider");
  }
  return context;
}

interface PermissionGuardProps {
  action?: string;
  subject?: string;
  permissionName?: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

/**
 * A declarative wrapper component to conditionally render content based on active session permissions.
 */
export function PermissionGuard({
  action,
  subject,
  permissionName,
  children,
  fallback = null,
}: PermissionGuardProps) {
  const { checkPermission, hasPermissionName } = useAdminAuth();

  let hasAccess = false;
  if (permissionName) {
    hasAccess = hasPermissionName(permissionName);
  } else if (action && subject) {
    hasAccess = checkPermission(action, subject);
  }

  return hasAccess ? <>{children}</> : <>{fallback}</>;
}

/**
 * A simple hook for components to check single permissions reactively.
 */
export function usePermission(action: string, subject: string): boolean {
  const { checkPermission } = useAdminAuth();
  return checkPermission(action, subject);
}
