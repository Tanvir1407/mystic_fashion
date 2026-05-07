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
