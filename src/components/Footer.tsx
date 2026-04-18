import Link from "next/link";
import { FooterData } from "@/lib/footer";

export default function Footer({ config }: { config: FooterData }) {
  const companyLinks = config.companyLinks || [];

  return (
    <footer className="bg-slate-50 text-zinc-600 border-t border-slate-200">
      {/* Main Footer */}
      <div className="container mx-auto pt-16 pb-10 px-4 md:px-0">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-10">

          {/* Brand Column */}
          <div className="md:col-span-5">
            <Link href="/" className="text-2xl font-black font-serif italic text-primary tracking-tighter inline-block">
              Mystic Fashion
            </Link>
            <p className="text-zinc-400 text-sm mt-4 leading-relaxed max-w-sm">
              {config.aboutText}
            </p>

            {/* Social Icons */}
            <div className="flex gap-3 mt-6">
              {config.facebookUrl && (
                <a
                  href={config.facebookUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-9 h-9 rounded-full border border-slate-300 flex items-center justify-center text-zinc-400 hover:border-primary hover:text-primary transition-colors duration-200"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M18 2h-3a5 5 0 00-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 011-1h3z" />
                  </svg>
                </a>
              )}
              {config.instagramUrl && (
                <a
                  href={config.instagramUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-9 h-9 rounded-full border border-slate-300 flex items-center justify-center text-zinc-400 hover:border-primary hover:text-primary transition-colors duration-200"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16 2H8a6 6 0 00-6 6v8a6 6 0 006 6h8a6 6 0 006-6V8a6 6 0 00-6-6zm-4 15a5 5 0 110-10 5 5 0 010 10zm5.5-10a1.5 1.5 0 110-3 1.5 1.5 0 010 3z" />
                  </svg>
                </a>
              )}
              {config.whatsappPhone && (
                <a
                  href={`https://wa.me/${config.whatsappPhone}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-9 h-9 rounded-full border border-slate-300 flex items-center justify-center text-zinc-400 hover:border-primary hover:text-primary transition-colors duration-200"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9 9 0 1 00-18 9 9 0 000 18zm0 0L8 8m8 8l-4-4" /> {/* Simplified WhatsApp placeholder icon */}
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                </a>
              )}
            </div>
          </div>

          <div className="md:col-span-4">
            <h4 className="text-zinc-800 text-xs font-bold uppercase tracking-[0.2em] mb-5">Company</h4>
            <ul className="space-y-3">
              {companyLinks.map((item: any) => (
                <li key={item.label}>
                  <Link href={item.url} className="text-sm text-zinc-400 hover:text-primary transition-colors duration-200">
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="md:col-span-3">
            <h4 className="text-zinc-800 text-xs font-bold uppercase tracking-[0.2em] mb-5">Reach Us</h4>
            <ul className="space-y-3 text-sm text-zinc-400">
              <li>{config.contactEmail}</li>
              <li>{config.contactPhone}</li>
              <li>{config.contactAddress}</li>
            </ul>
          </div>

        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-slate-200">
        <div className="container mx-auto py-5 grid grid-cols-1 md:grid-cols-3 text-xs text-zinc-400">
          <span>&copy; {new Date().getFullYear()} All rights reserved by Mystic Fashion</span>
          <div className="text-center">Developed by <Link href="https://solution.omega.ac" target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors">Omega Solution</Link></div>
          <div className="flex justify-end gap-5">
            <Link href="/privacy" className="hover:text-primary transition-colors">Privacy</Link>
            <Link href="/terms" className="hover:text-primary transition-colors">Terms</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
