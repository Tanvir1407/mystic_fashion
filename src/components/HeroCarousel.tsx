"use client";

import useEmblaCarousel from "embla-carousel-react";
import Autoplay from "embla-carousel-autoplay";
import { motion } from "framer-motion";
import { ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { useCallback } from "react";

const slides = [
  {
    title: "Championship <br/> <span class='text-maroon'>Legacy</span>",
    subtitle: "Premium Authentic Jerseys",
    description: "Experience the field with the same gear worn by your favorite legends. Engineered for performance and style.",
    image: "https://images.unsplash.com/photo-1574629810360-7efbbe195018?q=80&w=2000&auto=format&fit=crop",
    link: "/shop?category=authentic",
    cta: "Shop Authentic"
  },
  {
    title: "The Retro <br/> <span class='text-gold'>Classics</span>",
    subtitle: "Golden Era Collection",
    description: "Relive the historic moments with our carefully curated retro jerseys. Timeless designs, modern comfort.",
    image: "https://images.unsplash.com/photo-1551958219-acbc608c6377?q=80&w=2000&auto=format&fit=crop",
    link: "/shop?category=retro",
    cta: "Explore Retro"
  }
];

export default function HeroCarousel() {
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true }, [Autoplay({ delay: 5000 })]);

  const scrollPrev = useCallback(() => emblaApi && emblaApi.scrollPrev(), [emblaApi]);
  const scrollNext = useCallback(() => emblaApi && emblaApi.scrollNext(), [emblaApi]);

  return (
    <div className="relative h-[60vh] md:h-[85vh] w-full overflow-hidden bg-zinc-950">
      <div className="overflow-hidden h-full" ref={emblaRef}>
        <div className="flex h-full">
          {slides.map((slide, index) => (
            <div key={index} className="flex-[0_0_100%] min-w-0 relative h-full">
              <div 
                className="absolute inset-0 bg-cover bg-center transition-transform duration-[10000ms] ease-linear scale-110 group-hover:scale-100"
                style={{ backgroundImage: `url(${slide.image})` }}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-black via-black/60 to-transparent" />
              </div>
              
              <div className="relative h-full max-w-[1400px] mx-auto px-6 lg:px-12 flex flex-col justify-center">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="max-w-2xl"
                >
                  <span className="inline-block px-4 py-1.5 bg-maroon text-white text-[10px] md:text-xs font-black uppercase tracking-[0.2em] mb-6 rounded-full">
                    {slide.subtitle}
                  </span>
                  <h1 
                    className="text-5xl md:text-8xl font-black text-white leading-[0.9] uppercase tracking-tighter mb-8"
                    dangerouslySetInnerHTML={{ __html: slide.title }}
                  />
                  <p className="text-slate-300 text-lg md:text-xl font-medium mb-10 max-w-lg leading-relaxed">
                    {slide.description}
                  </p>
                  <div className="flex flex-wrap gap-4">
                    <Link 
                      href={slide.link}
                      className="bg-white text-black px-8 py-5 rounded-full font-black uppercase tracking-widest text-sm flex items-center gap-3 hover:bg-maroon hover:text-white transition-all group"
                    >
                      {slide.cta}
                      <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    </Link>
                  </div>
                </motion.div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Navigation Buttons */}
      <div className="absolute bottom-12 right-6 lg:right-12 flex gap-4 z-10">
        <button 
          onClick={scrollPrev}
          className="w-14 h-14 rounded-full border-2 border-white/20 text-white flex items-center justify-center hover:bg-white hover:text-black transition-all"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
        <button 
          onClick={scrollNext}
          className="w-14 h-14 rounded-full border-2 border-white/20 text-white flex items-center justify-center hover:bg-white hover:text-black transition-all"
        >
          <ChevronRight className="w-6 h-6" />
        </button>
      </div>

      {/* Slide Indicators */}
      <div className="absolute bottom-12 left-6 lg:left-12 flex gap-3 h-1 z-10">
        {slides.map((_, i) => (
          <div key={i} className="w-12 h-1 bg-white/20 rounded-full overflow-hidden">
             {/* Progress animation could go here */}
          </div>
        ))}
      </div>
    </div>
  );
}
