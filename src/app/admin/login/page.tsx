"use client";

import { useState } from "react";
import { adminLogin } from "../actions";
import { Loader2, ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
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
      const res = await adminLogin(email, password);
      if (res.success) {
        if (res.token) {
          localStorage.setItem('admin_token', res.token);
        }
        router.refresh();
        setTimeout(() => {
          router.push((res as any).redirectUrl || '/admin');
        }, 150);
      } else {
        setError(res.error || "Login failed");
        setIsLoading(false);
      }
    } catch (err) {
      setError("An unexpected error occurred.");
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-white">
      {/* Left Panel - Branding & Visuals */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-[#800020] overflow-hidden">
        {/* Background Image */}
        <div
          className="absolute inset-0 bg-cover bg-center opacity-30 mix-blend-luminosity"
          style={{ backgroundImage: "url('https://images.unsplash.com/photo-1441984904996-e0b6ba687e04?q=80&w=2070&auto=format&fit=crop')" }}
        />
        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#800020] via-[#800020]/80 to-transparent" />

        {/* Content */}
        <div className="relative z-10 flex flex-col justify-between p-16 h-full w-full">
          <div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center shadow-lg">
                <span className="text-xl font-black text-[#800020] font-serif">M</span>
              </div>
              <span className="text-3xl font-medium text-white uppercase ">Mystic Fashion</span>
            </div>
          </div>

          <div className="max-w-xl">
            <h2 className="text-4xl font-semibold text-white mb-6 leading-tight tracking-tight">
              <span className="text-white/70">Admin Portal.</span>
            </h2>
            <p className="text-white/80 text-lg leading-relaxed">
              Manage inventory, analyze performance, and oversee your entire retail operation from a single, unified administrative portal.
            </p>
          </div>

          <div className="text-sm text-white/50 font-medium">
            &copy; {new Date().getFullYear()} Mystic Fashion. All rights reserved.
          </div>
        </div>
      </div>

      {/* Right Panel - Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 sm:p-12 lg:p-24 bg-white">
        <div className="w-full max-w-sm">
          {/* Mobile Logo */}
          <div className="mb-12 lg:hidden flex items-center gap-3">
            <div className="w-10 h-10 bg-[#800020] rounded-lg flex items-center justify-center shadow-sm">
              <span className="text-xl font-black text-white font-serif">M</span>
            </div>
            <span className="text-xl font-bold text-[#800020] tracking-widest uppercase font-serif">Mystic Fashion</span>
          </div>

          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight mb-2">Welcome back</h1>
            <p className="text-sm text-slate-500 mb-8">Please enter your admin credentials to securely access the system.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="p-3 bg-red-50 border border-red-100 rounded-md text-red-600 text-sm font-medium">
                {error}
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700">Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 h-11 bg-white border border-slate-200 rounded-md text-sm text-slate-900 focus:outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400 transition-colors"
                placeholder="admin@example.com"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 h-11 bg-white border border-slate-200 rounded-md text-sm text-slate-900 focus:outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400 transition-colors"
                placeholder="••••••••"
                required
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={isLoading}
                className="w-full h-11 bg-[#800020] text-white text-sm font-semibold rounded-md hover:bg-[#5a0016] transition-colors shadow-sm disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2 group"
              >
                {isLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    Sign In
                    <ArrowRight className="w-4 h-4 opacity-70 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
