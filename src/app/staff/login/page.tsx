"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { staffLogin } from "./actions";
import { Loader2, ArrowRight } from "lucide-react";

export default function StaffLoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);
    try {
      const res = await staffLogin(email, password);
      if (res.success) {
        router.refresh();
        setTimeout(() => router.push("/staff/dashboard"), 150);
      } else {
        setError(res.error || "Login failed");
        setIsLoading(false);
      }
    } catch {
      setError("An unexpected error occurred.");
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-white">
      {/* Left branding panel */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-[#1a3a5c] overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center opacity-20"
          style={{ backgroundImage: "url('https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?q=80&w=2070&auto=format&fit=crop')" }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#1a3a5c] via-[#1a3a5c]/80 to-transparent" />
        <div className="relative z-10 flex flex-col justify-between p-16 h-full w-full">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center shadow-lg">
              <span className="text-xl font-black text-[#1a3a5c] font-serif">M</span>
            </div>
            <span className="text-3xl font-medium text-white uppercase">Mystic Fashion</span>
          </div>
          <div className="max-w-xl">
            <h2 className="text-4xl font-semibold text-white mb-6 leading-tight tracking-tight">
              <span className="text-white/70">Sales Portal.</span>
            </h2>
            <p className="text-white/80 text-lg leading-relaxed">
              Track your orders, monitor your commission, and manage your sales performance.
            </p>
          </div>
          <div className="text-sm text-white/50 font-medium">
            &copy; {new Date().getFullYear()} Mystic Fashion. All rights reserved.
          </div>
        </div>
      </div>

      {/* Right login form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 sm:p-12 lg:p-24 bg-white">
        <div className="w-full max-w-sm">
          <div className="lg:hidden flex items-center gap-2 mb-8">
            <div className="w-8 h-8 bg-[#1a3a5c] rounded-lg flex items-center justify-center">
              <span className="text-sm font-black text-white font-serif">M</span>
            </div>
            <span className="text-xl font-medium text-slate-900 uppercase">Mystic Fashion</span>
          </div>

          <div className="mb-8">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Sales Portal</h1>
            <p className="text-slate-500 text-sm mt-1">Sign in to your account</p>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-100 rounded-lg text-red-600 text-sm flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-red-500 flex-shrink-0" />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-700">Email Address</label>
              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full text-sm px-3 py-2.5 border border-slate-200 rounded-lg focus:border-slate-400 focus:outline-none transition-colors"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-700">Password</label>
              <input
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full text-sm px-3 py-2.5 border border-slate-200 rounded-lg focus:border-slate-400 focus:outline-none transition-colors"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full h-11 flex items-center justify-center gap-2 bg-[#1a3a5c] text-white text-sm font-medium rounded-lg hover:bg-[#15304f] transition-colors disabled:opacity-50 mt-2"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  Sign In
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
