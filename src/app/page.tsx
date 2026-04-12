import Link from 'next/link';

export default function Home() {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center">
      {/* Navbar Placeholder */}
      <nav className="w-full max-w-7xl px-8 py-6 flex justify-between items-center text-foreground z-10 relative">
        <div className="font-extrabold text-2xl tracking-tighter text-maroon flex items-center gap-2">
          <span>Mystic Fashion</span>
          <div className="w-2 h-2 rounded-full bg-gold"></div>
        </div>
        <div className="hidden md:flex gap-8 text-sm font-medium tracking-wide">
          <Link href="#jerseys" className="hover:text-maroon transition-colors duration-300">Jerseys</Link>
          <Link href="#accessories" className="hover:text-maroon transition-colors duration-300">Accessories</Link>
          <Link href="#collections" className="hover:text-maroon transition-colors duration-300">Collections</Link>
        </div>
        <div>
          <button className="bg-foreground text-background px-6 py-2.5 rounded-full text-sm font-bold shadow-md hover:bg-maroon hover:text-white transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5">
            Cart (0)
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="flex-1 w-full flex flex-col items-center justify-center -mt-20 relative overflow-hidden">
        {/* Abstract Background Elements */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-maroon/5 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute top-1/4 right-0 w-[400px] h-[400px] bg-gold/5 rounded-full blur-3xl pointer-events-none translate-x-1/3"></div>

        <div className="max-w-5xl mx-auto px-8 text-center relative z-10 flex flex-col items-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-maroon/5 border border-maroon/10 text-maroon text-xs font-bold uppercase tracking-widest mb-8">
            <span className="w-1.5 h-1.5 rounded-full bg-gold animate-pulse"></span>
            New 2026 Season Kits Available
          </div>
          
          <h1 className="text-6xl md:text-8xl font-black tracking-tighter text-foreground mb-8 leading-[1.1]">
            Wear The <span className="text-transparent bg-clip-text bg-gradient-to-r from-maroon to-red-700">Magic</span><br/>
            On The Pitch.
          </h1>
          
          <p className="text-lg md:text-xl text-foreground/70 max-w-2xl mb-12 font-medium">
            Elevate your game with premium, authentic football jerseys. Built for the fans, engineered for the champions. Step onto the field with confidence.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
            <Link 
              href="/shop" 
              className="px-8 py-4 bg-maroon text-white rounded-full font-bold shadow-lg shadow-maroon/20 hover:shadow-xl hover:shadow-maroon/30 hover:-translate-y-1 transition-all duration-300 active:scale-95 flex items-center justify-center gap-2"
            >
              Shop New Arrivals
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </Link>
            <Link 
              href="/collections" 
              className="px-8 py-4 bg-transparent border-2 border-foreground/10 text-foreground hover:border-gold hover:text-black hover:bg-gold rounded-full font-bold transition-all duration-300 active:scale-95 flex items-center justify-center"
            >
              View Collections
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
