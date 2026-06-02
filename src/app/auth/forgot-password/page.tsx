"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Loader2, ArrowRight, Mail, Key, Lock, Sparkles, CheckCircle2 } from "lucide-react";
import { sendCustomerOtpAction, resetCustomerPasswordAction } from "../../actions/customerAuth";

export default function CustomerForgotPasswordPage() {
  const router = useRouter();

  // Form State
  const [email, setEmail] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [cooldown, setCooldown] = useState(0);

  // Status / Transition messages
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [isPending, startTransition] = useTransition();

  const handleSendOtp = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    if (!email.trim()) {
      setErrorMsg("Please enter your registered email address.");
      return;
    }

    startTransition(async () => {
      const res = await sendCustomerOtpAction(email);
      if (res.success) {
        setOtpSent(true);
        setSuccessMsg("Verification code sent! Please check your email.");
        setCooldown(120);
        const interval = setInterval(() => {
          setCooldown((prev) => {
            if (prev <= 1) {
              clearInterval(interval);
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
      } else {
        setErrorMsg(res.error || "Failed to send verification code. Make sure the email is registered.");
      }
    });
  };

  const handleResetPassword = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    if (!otpCode.trim() || otpCode.length !== 6) {
      setErrorMsg("Please enter the 6-digit verification code.");
      return;
    }
    if (!newPassword || newPassword.length < 6) {
      setErrorMsg("New password must be at least 6 characters long.");
      return;
    }

    startTransition(async () => {
      const res = await resetCustomerPasswordAction({
        email: email.trim(),
        otpCode: otpCode.trim(),
        password: newPassword,
      });

      if (res.success) {
        setSuccessMsg("Password reset successfully! Auto-logging you in...");
        router.refresh();
        setTimeout(() => {
          router.push("/account");
        }, 1000);
      } else {
        setErrorMsg(res.error || "Reset failed. The verification code may be invalid or expired.");
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
          style={{ backgroundImage: "url('https://images.unsplash.com/photo-1441984904996-e0b6ba687e04?q=80&w=2070&auto=format&fit=crop')" }}
        />
        <div className="absolute inset-0 bg-gradient-to-tr from-[#550015] via-[#800020] to-rose-900/60 mix-blend-multiply" />

        {/* Content Details */}
        <div className="relative z-10 flex flex-col justify-between p-16 w-full h-full text-white">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2 group">
              <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center shadow-lg transition-transform group-hover:scale-105">
                <span className="text-xl font-black text-[#800020] font-serif">M</span>
              </div>
              <span className="text-2xl font-bold tracking-widest uppercase font-serif text-white">Mystic Fashion</span>
            </Link>
          </div>

          <div className="max-w-md space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 backdrop-blur-md rounded-full text-xs font-semibold tracking-wide border border-white/20">
              <Sparkles className="w-3 h-3 text-amber-300" /> Premium Customer Portal
            </div>
            <h2 className="text-4xl font-black tracking-tight leading-none text-white">
              Recover your <br />
              <span className="text-rose-200">Credentials.</span>
            </h2>
            <p className="text-rose-100/80 text-base leading-relaxed">
              Retrieve access to your orders, addresses, and tracking logs securely via email verification code.
            </p>
          </div>

          <div className="flex items-center justify-between text-xs text-rose-200/50">
            <span>&copy; {new Date().getFullYear()} Mystic Fashion. All rights reserved.</span>
            <Link href="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link>
          </div>
        </div>
      </div>

      {/* Right side: Forgot Password Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12 lg:p-20">
        <div className="w-full max-w-md bg-white border border-slate-100 p-8 sm:p-10 shadow-[0_8px_30px_rgb(0,0,0,0.02)] rounded-none">
          {/* Logo on mobile view */}
          <div className="mb-10 lg:hidden flex justify-center">
            <Link href="/" className="flex items-center gap-2.5">
              <div className="w-9 h-9 bg-[#800020] rounded-lg flex items-center justify-center shadow-sm">
                <span className="text-lg font-black text-white font-serif">M</span>
              </div>
              <span className="text-lg font-bold text-[#800020] tracking-wider uppercase font-serif">Mystic Fashion</span>
            </Link>
          </div>

          {/* Heading */}
          <div className="text-center sm:text-left">
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Reset Password</h1>
            <p className="text-sm text-slate-500 mt-1.5 mb-8">We will send you a verification code to reset your password.</p>
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

          {!otpSent ? (
            <form onSubmit={handleSendOtp} className="space-y-6">
              <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-wider text-slate-700 block">Registered Email Address</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Mail className="w-4 h-4" />
                  </span>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-4 h-12 bg-slate-50/50 border border-slate-200 rounded-none text-sm text-slate-950 focus:outline-none focus:bg-white focus:border-slate-950 transition-colors"
                    placeholder="customer@example.com"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isPending}
                className="w-full h-12 bg-[#800020] text-white text-xs font-black uppercase tracking-widest hover:bg-[#600018] transition-colors disabled:opacity-70 flex items-center justify-center gap-2 group"
              >
                {isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    Send Reset Link
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </button>
            </form>
          ) : (
            <form onSubmit={handleResetPassword} className="space-y-5">
              <div className="text-center bg-slate-50 p-4 border border-slate-100 mb-2">
                <p className="text-xs text-slate-600">Verification code sent to:</p>
                <p className="text-xs font-black text-slate-800 mt-0.5">{email}</p>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-black uppercase tracking-wider text-slate-700 block">6-Digit Verification Code</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Key className="w-4 h-4" />
                  </span>
                  <input
                    type="text"
                    maxLength={6}
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/[^0-9]/g, ""))}
                    className="w-full pl-10 pr-4 h-11 bg-slate-50/50 border border-slate-200 rounded-none text-sm text-center tracking-[0.4em] font-black text-slate-950 focus:outline-none focus:bg-white focus:border-slate-950 transition-colors"
                    placeholder="000000"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-black uppercase tracking-wider text-slate-700 block">New Password</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-4 h-4" />
                  </span>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full pl-10 pr-4 h-11 bg-slate-50/50 border border-slate-200 rounded-none text-sm text-slate-950 focus:outline-none focus:bg-white focus:border-slate-950 transition-colors"
                    placeholder="•••••••• (Min 6 characters)"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isPending}
                className="w-full h-12 bg-[#800020] text-white text-xs font-black uppercase tracking-widest hover:bg-[#600018] transition-colors disabled:opacity-70 flex items-center justify-center gap-2 group pt-1"
              >
                {isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    Reset Password & Sign In
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </button>

              <div className="text-center">
                {cooldown > 0 ? (
                  <p className="text-xs text-slate-400">
                    Resend code in <span className="font-bold text-slate-600">{cooldown}s</span>
                  </p>
                ) : (
                  <button
                    type="button"
                    onClick={handleSendOtp}
                    className="text-xs font-black text-[#800020] hover:underline"
                  >
                    Resend Code
                  </button>
                )}
              </div>
            </form>
          )}

          {/* Registration Prompt Link */}
          <div className="mt-8 pt-6 border-t border-slate-100 text-center text-xs">
            <span className="text-slate-500">Back to </span>
            <Link href="/auth/login" className="font-black text-[#800020] hover:underline">
              Log In
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
