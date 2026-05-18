"use client";

import { adminLogout } from "../actions";
import { Lock, LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

interface UnauthorizedClientProps {
  staffEmail: string;
  roleName: string;
}

export default function UnauthorizedClient({ staffEmail, roleName }: UnauthorizedClientProps) {
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await adminLogout();
      router.push("/admin/login");
    } catch (error) {
      console.error("Sign out failed:", error);
      setIsLoggingOut(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-slate-50 dark:bg-zinc-950 px-4 py-12">
      <div className="w-full max-w-md bg-white dark:bg-zinc-900  border border-slate-100 dark:border-zinc-800 p-8 md:p-10 text-center flex flex-col items-center border">

        {/* Sleek Refined Lock Icon inside soft branding circle */}
        <div className="w-12 h-12 bg-[#800020]/5 rounded-full flex items-center justify-center mb-6">
          <Lock className="w-5 h-5 text-[#800020]" />
        </div>

        <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight mb-3">
          Access Restricted
        </h1>

        <p className="text-sm text-slate-500 dark:text-zinc-400 mb-8 leading-relaxed max-w-xs font-normal">
          You do not have permission to access this admin module. Please contact your administrator to assign permissions for your working area.
        </p>

        <button
          onClick={handleLogout}
          disabled={isLoggingOut}
          className="w-full h-11 bg-[#800020] hover:bg-[#600018] text-white text-sm font-semibold rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-75"
        >
          <LogOut className="w-4 h-4" />
          {isLoggingOut ? "Signing Out..." : "Sign Out / Switch Account"}
        </button>

      </div>

      <div className="mt-8 text-xs text-slate-400 dark:text-zinc-600 font-normal">
        &copy; {new Date().getFullYear()} Mystic Fashion. All rights reserved.
      </div>
    </div>
  );
}
