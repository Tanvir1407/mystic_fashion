import Link from "next/link";

export default function Footer() {
  return (
    <footer className="bg-slate-50 text-zinc-600 border-t border-slate-200">
      {/* Main Footer */}
      <div className="container mx-auto pt-16 pb-10">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-10">

          {/* Brand Column */}
          <div className="md:col-span-5">
            <Link href="/" className="text-2xl font-black font-serif italic text-primary tracking-tighter inline-block">
              Mystic Fashion
            </Link>
            <p className="text-zinc-400 text-sm mt-4 leading-relaxed max-w-sm">
              Premium authentic jerseys and sportswear. Crafted for those who live and breathe the game.
            </p>

            {/* Social Icons */}
            <div className="flex gap-3 mt-6">
              {[
                { label: "Facebook", path: "M18 2h-3a5 5 0 00-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 011-1h3z" },
                { label: "Instagram", path: "M16 2H8a6 6 0 00-6 6v8a6 6 0 006 6h8a6 6 0 006-6V8a6 6 0 00-6-6zm-4 15a5 5 0 110-10 5 5 0 010 10zm5.5-10a1.5 1.5 0 110-3 1.5 1.5 0 010 3z" },
              ].map((social) => (
                <a
                  key={social.label}
                  href="#"
                  aria-label={social.label}
                  className="w-9 h-9 rounded-full border border-slate-300 flex items-center justify-center text-zinc-400 hover:border-primary hover:text-primary transition-colors duration-200"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d={social.path} />
                  </svg>
                </a>
              ))}
            </div>
          </div>

          {/* Links Columns */}
          <div className="md:col-span-3">
            <h4 className="text-zinc-800 text-xs font-bold uppercase tracking-[0.2em] mb-5">Shop</h4>
            <ul className="space-y-3">
              {["New Arrivals", "Best Sellers", "All Products", "Custom Orders"].map((item) => (
                <li key={item}>
                  <Link href="/shop" className="text-sm text-zinc-400 hover:text-primary transition-colors duration-200">
                    {item}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="md:col-span-2">
            <h4 className="text-zinc-800 text-xs font-bold uppercase tracking-[0.2em] mb-5">Company</h4>
            <ul className="space-y-3">
              {["About", "Contact", "FAQ"].map((item) => (
                <li key={item}>
                  <Link href="#" className="text-sm text-zinc-400 hover:text-primary transition-colors duration-200">
                    {item}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="md:col-span-2">
            <h4 className="text-zinc-800 text-xs font-bold uppercase tracking-[0.2em] mb-5">Reach Us</h4>
            <ul className="space-y-3 text-sm text-zinc-400">
              <li>hello@mysticfashion.com</li>
              <li>01700-MYSTIC</li>
              <li>Dhaka, Bangladesh</li>
            </ul>
          </div>

        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-slate-200">
        <div className="container mx-auto py-5 flex flex-col sm:flex-row justify-between items-center gap-3 text-xs text-zinc-400">
          <span>&copy; {new Date().getFullYear()} Mystic Fashion</span>
          <div className="flex gap-5">
            <Link href="#" className="hover:text-primary transition-colors">Privacy</Link>
            <Link href="#" className="hover:text-primary transition-colors">Terms</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
