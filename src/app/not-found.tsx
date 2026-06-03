"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";



export default function NotFound() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [query, setQuery] = useState("");
  const router = useRouter();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) router.push(`/search?q=${encodeURIComponent(query.trim())}`);
  };

  // ── Particle canvas ──────────────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationId: number;
    const particles: { x: number; y: number; r: number; vx: number; vy: number; alpha: number }[] = [];

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    for (let i = 0; i < 55; i++) {
      particles.push({
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight,
        r: Math.random() * 2 + 0.5,
        vx: (Math.random() - 0.5) * 0.35,
        vy: (Math.random() - 0.5) * 0.35,
        alpha: Math.random() * 0.45 + 0.12,
      });
    }

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach((p) => {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,200,200,${p.alpha})`;
        ctx.fill();
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0) p.x = canvas.width;
        if (p.x > canvas.width) p.x = 0;
        if (p.y < 0) p.y = canvas.height;
        if (p.y > canvas.height) p.y = 0;
      });
      animationId = requestAnimationFrame(draw);
    };
    draw();
    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <div className="relative min-h-screen bg-[#0c0508] overflow-x-hidden">

      {/* ── background layers ─────────────────────────────────────────────── */}
      <canvas ref={canvasRef} className="fixed inset-0 pointer-events-none" style={{ zIndex: 0 }} />
      <div className="fixed inset-0 pointer-events-none" style={{
        background: "radial-gradient(ellipse 80% 55% at 50% 30%, rgba(128,0,32,0.38) 0%, transparent 68%)",
        zIndex: 1,
      }} />
      <div className="fixed inset-0 pointer-events-none" style={{
        backgroundImage: "linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px)",
        backgroundSize: "60px 60px",
        zIndex: 1,
      }} />

      {/* ── HEADER strip ─────────────────────────────────────────────────── */}
      <header className="relative w-full py-5 px-6 flex items-center justify-between border-b border-white/5" style={{ zIndex: 10 }}>
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center shadow-md transition-transform duration-300 group-hover:scale-110" style={{ background: "#800020" }}>
            <span className="text-lg font-black text-white font-serif">M</span>
          </div>
          <span className="text-sm font-bold tracking-[0.22em] uppercase text-white/70 font-serif group-hover:text-white transition-colors">
            Mystic Fashion
          </span>
        </Link>

        <Link
          href="/products"
          className="hidden sm:inline-flex items-center gap-2 px-5 py-2 text-xs font-bold tracking-widest uppercase text-white/70 border border-white/10 hover:border-[#800020]/70 hover:text-white transition-all duration-200"
        >
          Shop Now
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </Link>
      </header>

      {/* ── HERO section ─────────────────────────────────────────────────── */}
      <section className="relative flex flex-col items-center text-center px-6 pt-12 pb-10" style={{ zIndex: 2 }}>


        {/* Giant 404 */}
        <div className="relative select-none mb-1">
          <span
            className="text-[9rem] sm:text-[13rem] font-black leading-none tracking-tighter"
            style={{
              background: "linear-gradient(135deg, #d04060 0%, #800020 45%, #3d000e 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
              filter: "drop-shadow(0 0 70px rgba(128,0,32,0.65))",
            }}
          >
            404
          </span>
        </div>

        {/* Divider */}
        <div className="flex items-center gap-3 mb-6 w-52">
          <div className="flex-1 h-px bg-gradient-to-r from-transparent to-[#800020]/60" />
          <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
            <path d="M7 0L8.5 5.5H14L9.5 8.5L11 14L7 11L3 14L4.5 8.5L0 5.5H5.5L7 0Z" fill="#800020" opacity="0.9" />
          </svg>
          <div className="flex-1 h-px bg-gradient-to-l from-transparent to-[#800020]/60" />
        </div>

        <h1 className="text-2xl sm:text-3xl font-black text-white mb-3 tracking-tight" style={{ fontFamily: "Georgia, serif" }}>
          Page Not Found
        </h1>
        <p className="text-white/45 text-sm sm:text-base leading-relaxed mb-8 max-w-md">
          The page you&apos;re looking for has gone missing — just like last season&apos;s bestsellers.
          Don&apos;t worry, there&apos;s plenty more to explore below.
        </p>

        {/* ── Search bar ──────────────────────────────────────────────────── */}
        <form onSubmit={handleSearch} className="flex w-full max-w-md mb-8 group">
          <div className="relative flex-1">
            <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
            </svg>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search jerseys, polo shirts…"
              className="w-full pl-11 pr-4 py-3.5 bg-white/5 border border-white/10 text-white text-sm placeholder-white/25 outline-none focus:border-[#800020]/70 focus:bg-white/8 transition-all duration-200"
            />
          </div>
          <button
            type="submit"
            className="px-6 py-3.5 text-xs font-bold tracking-widest uppercase text-white transition-all duration-200 hover:opacity-90"
            style={{ background: "linear-gradient(135deg, #9b0027, #800020)" }}
          >
            Search
          </button>
        </form>

        {/* ── Primary CTAs ────────────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full max-w-md">
          <Link
            href="/"
            className="flex-1 w-full inline-flex items-center justify-center gap-2 px-6 py-3 text-sm font-bold tracking-widest uppercase text-white transition-all duration-200 hover:opacity-90"
            style={{ background: "linear-gradient(135deg, #9b0027, #800020, #5c0017)", boxShadow: "0 4px 20px rgba(128,0,32,0.4)" }}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 12h18M3 12l7-7M3 12l7 7" />
            </svg>
            Back to Home
          </Link>
          <Link
            href="/products"
            className="flex-1 w-full inline-flex items-center justify-center gap-2 px-6 py-3 text-sm font-bold tracking-widest uppercase text-white/60 border border-white/10 hover:border-[#800020]/60 hover:text-white transition-all duration-200"
            style={{ background: "rgba(255,255,255,0.03)" }}
          >
            Browse All
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>
      </section>



      {/* ── QUICK LINKS + ORDER TRACK ─────────────────────────────────────── */}
      <section className="relative px-6 pb-10" style={{ zIndex: 2 }}>
        <div className="max-w-3xl mx-auto border-t border-white/6 pt-8 flex flex-col sm:flex-row items-center justify-between gap-6">

          {/* Order tracker teaser */}
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-full border border-[#800020]/40 flex items-center justify-center flex-shrink-0">
              <svg className="w-4 h-4 text-[#800020]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10l2 1h7l1-1z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 8h4l3 5v3h-7V8z" />
              </svg>
            </div>
            <div>
              <p className="text-white text-xs font-bold tracking-wide">Track Your Order</p>
              <Link href="/track" className="text-[10px] text-[#c0394d] hover:underline">Enter order ID →</Link>
            </div>
          </div>

          {/* Nav links */}
          <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
            {[
              { label: "New Arrivals", href: "/products" },
              { label: "My Account", href: "/account" },
              { label: "Contact", href: "/contact" },
              { label: "FAQ", href: "/faq" },
            ].map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-[10px] tracking-widest uppercase text-white/25 hover:text-[#c0394d] transition-colors duration-200"
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── FOOTER strip ─────────────────────────────────────────────────── */}
      <footer className="relative border-t border-white/5 py-6 text-center" style={{ zIndex: 2 }}>
        <p className="text-white/12 text-[10px] tracking-[0.3em] uppercase">
          © {new Date().getFullYear()} Mystic Fashion — Premium Apparel, Bangladesh
        </p>
      </footer>
    </div>
  );
}
