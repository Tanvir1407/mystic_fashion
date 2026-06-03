"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Loader2, ArrowRight, User, Mail, Phone, Lock, Sparkles, CheckCircle2 } from "lucide-react";
import { registerCustomerAction } from "../../actions/customerAuth";

export default function CustomerRegisterPage() {
  const router = useRouter();

  // Form State
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Error/Success status
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    // Basic Validation
    if (!name.trim() || name.trim().length < 2) {
      setErrorMsg("Name must be at least 2 characters long.");
      return;
    }
    if (!phone.trim()) {
      setErrorMsg("Please provide your phone number.");
      return;
    }
    if (!password) {
      setErrorMsg("Please provide a password.");
      return;
    }
    if (password.length < 6) {
      setErrorMsg("Password must be at least 6 characters long.");
      return;
    }
    if (password !== confirmPassword) {
      setErrorMsg("Passwords do not match.");
      return;
    }

    startTransition(async () => {
      const res = await registerCustomerAction({
        name: name.trim(),
        phone: phone.trim(),
        email: email.trim() || undefined,
        password: password,
      });

      if (res.success) {
        setSuccessMsg("Account created successfully! Redirecting...");
        router.refresh();
        setTimeout(() => {
          router.push("/account");
        }, 1000);
      } else {
        setErrorMsg(res.error || "Failed to register account.");
      }
    });
  };

  return (
    <div className="min-h-screen flex bg-slate-50">
      {/* Left side: Premium Branding Cover */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-[#800020] overflow-hidden">
        {/* Decorative Grid Patterns */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff08_1px,transparent_1px),linear-gradient(to_bottom,#ffffff08_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none" />
        <div className="absolute top-1/4 -left-20 w-80 h-80 rounded-full bg-red-800/30 blur-3xl pointer-events-none" />
        <div className="absolute bottom-1/4 -right-20 w-96 h-96 rounded-full bg-rose-950/40 blur-3xl pointer-events-none" />

        {/* Cover Image backdrop */}
        <div
          className="absolute inset-0 bg-cover bg-center opacity-25 mix-blend-luminosity"
          style={{ backgroundImage: "url('https://images.unsplash.com/photo-1483985988355-763728e1935b?q=80&w=2070&auto=format&fit=crop')" }}
        />
        <div className="absolute inset-0 bg-gradient-to-tr from-[#550015] via-[#800020] to-rose-900/60 mix-blend-multiply" />

        {/* Content Details */}
        <div className="relative z-10 flex flex-col justify-between p-16 w-full h-full text-white">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2 group">
              <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center shadow-lg transition-transform group-hover:scale-105">
                <span className="text-xl  font-semibold text-[#800020] font-serif">M</span>
              </div>
              <span className="text-2xl font-bold tracking-widest uppercase font-serif text-white">Mystic Fashion</span>
            </Link>
          </div>

          <div className="max-w-md space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 backdrop-blur-md rounded-full text-xs font-semibold tracking-wide border border-white/20">
              <Sparkles className="w-3 h-3 text-amber-300" /> Premium Customer Portal
            </div>
            <h2 className="text-4xl  font-semibold tracking-tight leading-none text-white">
              Join the <br />
              <span className="text-rose-200">Mystic Club.</span>
            </h2>
            <p className="text-rose-100/80 text-base leading-relaxed">
              Create an account today to easily keep track of order consignments, download invoices, save delivery details, and get custom discounts.
            </p>
          </div>

          <div className="flex items-center justify-between text-xs text-rose-200/50">
            <span>&copy; {new Date().getFullYear()} Mystic Fashion. All rights reserved.</span>
            <Link href="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link>
          </div>
        </div>
      </div>

      {/* Right side: Register form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12 lg:p-20">
        <div className="w-full max-w-md bg-white border border-slate-100 p-8 sm:p-10 shadow-[0_8px_30px_rgb(0,0,0,0.02)] rounded-none">
          {/* Logo on mobile view */}
          <div className="mb-10 lg:hidden flex justify-center">
            <Link href="/" className="flex items-center gap-2.5">
              <div className="w-9 h-9 bg-[#800020] rounded-lg flex items-center justify-center shadow-sm">
                <span className="text-lg  font-semibold text-white font-serif">M</span>
              </div>
              <span className="text-lg font-bold text-[#800020] tracking-wider uppercase font-serif">Mystic Fashion</span>
            </Link>
          </div>

          {/* Heading */}
          <div className="text-center sm:text-left">
            <h1 className="text-2xl  font-semibold text-slate-900 tracking-tight">Create Account</h1>
            <p className="text-sm text-slate-500 mt-1.5 mb-8">Fill in your details below to set up your customer account.</p>
          </div>

          {/* Status Messages */}
          {errorMsg && (
            <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 text-red-700 text-xs font-semibold rounded-none flex items-center gap-2.5">
              <span className="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-red-500" />
              <p className="flex-1">{errorMsg}</p>
            </div>
          )}
          {successMsg && (
            <div className="mb-6 p-4 bg-emerald-50 border-l-4 border-emerald-500 text-emerald-700 text-xs font-semibold rounded-none flex items-center gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <p className="flex-1">{successMsg}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <label className="text-xs  font-semibold text-slate-700 block">Full Name</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <User className="w-4 h-4" />
                </span>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full pl-10 pr-4 h-11 bg-slate-50/50 border border-slate-200 rounded-none text-sm text-slate-950 focus:outline-none focus:bg-white focus:border-slate-950 transition-colors"
                  placeholder="e.g. John Doe"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs  font-semibold text-slate-700 block">Phone Number</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Phone className="w-4 h-4" />
                </span>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full pl-10 pr-4 h-11 bg-slate-50/50 border border-slate-200 rounded-none text-sm text-slate-950 focus:outline-none focus:bg-white focus:border-slate-950 transition-colors"
                  placeholder="e.g. 017xxxxxxxx"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs  font-semibold text-slate-700 block">Email Address (Optional)</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Mail className="w-4 h-4" />
                </span>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 h-11 bg-slate-50/50 border border-slate-200 rounded-none text-sm text-slate-950 focus:outline-none focus:bg-white focus:border-slate-950 transition-colors"
                  placeholder="e.g. john@example.com"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs  font-semibold text-slate-700 block">Password</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </span>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 h-11 bg-slate-50/50 border border-slate-200 rounded-none text-sm text-slate-950 focus:outline-none focus:bg-white focus:border-slate-950 transition-colors"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs  font-semibold text-slate-700 block">Confirm Password</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </span>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full pl-10 pr-4 h-11 bg-slate-50/50 border border-slate-200 rounded-none text-sm text-slate-950 focus:outline-none focus:bg-white focus:border-slate-950 transition-colors"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isPending}
              className="w-full h-12 bg-[#800020] text-white text-xs  font-semibold uppercase tracking-widest hover:bg-[#600018] transition-colors disabled:opacity-70 flex items-center justify-center gap-2 group pt-1"
            >
              {isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  Register Account
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>

          {/* Login Prompt Link */}
          <div className="mt-8 pt-6 border-t border-slate-100 text-center text-xs">
            <span className="text-slate-500">Already have an account? </span>
            <Link href="/auth/login" className=" font-semibold text-[#800020] hover:underline">
              Log In Instead
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
