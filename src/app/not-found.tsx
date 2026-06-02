"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";

export default function NotFound() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Animated particle canvas — subtle floating dots
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationId: number;
    const particles: {
      x: number; y: number; r: number;
      vx: number; vy: number; alpha: number;
    }[] = [];

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
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.4,
        alpha: Math.random() * 0.5 + 0.15,
      });
    }

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach((p) => {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,210,210,${p.alpha})`;
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
    <div className="relative min-h-screen overflow-hidden bg-[#0d0608] flex flex-col items-center justify-center">

      {/* Particle canvas */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 pointer-events-none"
        style={{ zIndex: 0 }}
      />

      {/* Deep radial glow behind number */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 70% 60% at 50% 45%, rgba(128,0,32,0.45) 0%, transparent 70%)",
          zIndex: 1,
        }}
      />

      {/* Subtle grid lines */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
          zIndex: 1,
        }}
      />

      {/* Decorative top-left orb */}
      <div
        className="absolute -top-32 -left-32 w-[480px] h-[480px] rounded-full pointer-events-none"
        style={{
          background:
            "radial-gradient(circle, rgba(128,0,32,0.25) 0%, transparent 70%)",
          zIndex: 1,
        }}
      />

      {/* Decorative bottom-right orb */}
      <div
        className="absolute -bottom-40 -right-40 w-[520px] h-[520px] rounded-full pointer-events-none"
        style={{
          background:
            "radial-gradient(circle, rgba(160,0,40,0.18) 0%, transparent 70%)",
          zIndex: 1,
        }}
      />

      {/* ── Main card ── */}
      <div
        className="relative flex flex-col items-center text-center px-6 py-16 max-w-2xl w-full"
        style={{ zIndex: 2 }}
      >


        {/* Giant 404 */}
        <div className="relative select-none mb-2">
          <span
            className="text-[11rem] sm:text-[14rem] font-black leading-none tracking-tighter"
            style={{
              background:
                "linear-gradient(135deg, #c0394d 0%, #800020 40%, #4a0012 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
              filter: "drop-shadow(0 0 60px rgba(128,0,32,0.6))",
            }}
          >
            404
          </span>

          {/* Decorative horizontal line through the number */}
          <div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-px pointer-events-none"
            style={{
              background:
                "linear-gradient(90deg, transparent, rgba(255,255,255,0.08), transparent)",
            }}
          />
        </div>

        {/* Thin ornamental divider */}
        <div className="flex items-center gap-3 mb-8 w-56">
          <div className="flex-1 h-px bg-gradient-to-r from-transparent to-[#800020]/60" />
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path
              d="M7 0L8.5 5.5H14L9.5 8.5L11 14L7 11L3 14L4.5 8.5L0 5.5H5.5L7 0Z"
              fill="#800020"
              opacity="0.8"
            />
          </svg>
          <div className="flex-1 h-px bg-gradient-to-l from-transparent to-[#800020]/60" />
        </div>

        {/* Headline */}
        <h1
          className="text-3xl sm:text-4xl font-black text-white mb-4 tracking-tight leading-tight"
          style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
        >
          Page Not Found
        </h1>

        {/* Subtext */}
        <p className="text-white/50 text-base sm:text-lg leading-relaxed mb-12 max-w-md">
          The page you&apos;re looking for may have been moved, renamed, or doesn&apos;t exist.
          Let&apos;s get you back to discovering our latest collection.
        </p>

        {/* CTA buttons */}
        <div className="flex flex-col sm:flex-row items-center gap-4 w-full max-w-sm">
          <Link
            href="/"
            className="flex-1 w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-none text-sm font-bold tracking-widest uppercase text-white transition-all duration-300 group"
            style={{
              background: "linear-gradient(135deg, #9b0027, #800020, #5c0017)",
              boxShadow: "0 4px 24px rgba(128,0,32,0.45)",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.boxShadow =
                "0 6px 32px rgba(128,0,32,0.7)";
              (e.currentTarget as HTMLElement).style.transform = "translateY(-1px)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.boxShadow =
                "0 4px 24px rgba(128,0,32,0.45)";
              (e.currentTarget as HTMLElement).style.transform = "translateY(0)";
            }}
          >
            <svg
              className="w-4 h-4 transition-transform duration-300 group-hover:-translate-x-0.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 12h18M3 12l7-7M3 12l7 7" />
            </svg>
            Back to Home
          </Link>

          <Link
            href="/products"
            className="flex-1 w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-none text-sm font-bold tracking-widest uppercase text-white/70 border border-white/10 hover:border-[#800020]/60 hover:text-white transition-all duration-300"
            style={{ background: "rgba(255,255,255,0.03)" }}
          >
            Shop Collection
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>

        {/* Quick nav links */}
        <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 mt-14">
          {[
            { label: "New Arrivals", href: "/products" },
            { label: "Track Order", href: "/track" },
            { label: "My Account", href: "/account" },
            { label: "Contact Us", href: "/contact" },
          ].map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-xs tracking-widest uppercase text-white/30 hover:text-[#c0394d] transition-colors duration-200 border-b border-transparent hover:border-[#800020]/40 pb-px"
            >
              {link.label}
            </Link>
          ))}
        </div>

        {/* Bottom label */}
        <p className="mt-16 text-white/15 text-[11px] tracking-[0.3em] uppercase">
          © {new Date().getFullYear()} Mystic Fashion — Premium Apparel
        </p>
      </div>

      <style jsx>{`
        @keyframes float-slow {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-12px); }
        }
      `}</style>
    </div>
  );
}
