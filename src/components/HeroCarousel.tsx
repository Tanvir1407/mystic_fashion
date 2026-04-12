"use client";

import { motion } from "framer-motion";
import { ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay, Navigation, Pagination } from "swiper/modules";

// Import Swiper styles
import "swiper/css";
import "swiper/css/navigation";
import "swiper/css/pagination";

const slides = [
  {
    title: "Championship <br/> <span class='text-primary'>Legacy</span>",
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
  return (
    <div className="relative  md:h-[480px] max-h-[480px] mt-10">
      <div className="container mx-auto w-full overflow-hidden ">

        <Swiper
          modules={[Autoplay, Navigation, Pagination]}
          spaceBetween={0}
          slidesPerView={1}
          loop={true}
          autoplay={{ delay: 5000, disableOnInteraction: false }}
          navigation={{
            prevEl: '.swiper-button-prev-custom',
            nextEl: '.swiper-button-next-custom',
          }}
          pagination={{
            clickable: true,
            el: '.swiper-pagination-custom',
          }}
          className="h-full rounded-2xl overflow-hidden"
          style={{ height: '480px' }}
        >
          {slides.map((slide, index) => (
            <SwiperSlide key={index} className="relative h-full w-full">
              <div
                className="absolute inset-0 bg-cover bg-center transition-transform duration-[10000ms] ease-linear scale-110 group-hover:scale-100"
                style={{ backgroundImage: `url(${slide.image})` }}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-black via-black/60 to-transparent" />
              </div>

              <div className="relative h-full container mx-auto flex flex-col justify-center">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="max-w-2xl px-4 lg:px-12"
                >
                  <span className="inline-block px-4 py-1.5 bg-primary text-white text-[10px] md:text-xs font-black uppercase tracking-[0.2em] mb-6 rounded-full">
                    {slide.subtitle}
                  </span>
                  <h1
                    className="text-5xl md:text-8xl font-black text-white leading-[0.9] uppercase tracking-tighter mb-8"
                    dangerouslySetInnerHTML={{ __html: slide.title }}
                  />
                  <p className="text-slate-300 text-lg md:text-xl font-medium mb-10 max-w-lg leading-relaxed">
                    {slide.description}
                  </p>
                  
                </motion.div>
              </div>
            </SwiperSlide>
          ))}
        </Swiper>

        {/* Navigation Buttons */}
        <div className="absolute bottom-12 right-6 lg:right-12 flex gap-4 z-10">
          <button className="swiper-button-prev-custom z-10 w-14 h-14 rounded-full border-2 border-white/20 text-white flex items-center justify-center hover:bg-white hover:text-black transition-all">
            <ChevronLeft className="w-6 h-6" />
          </button>
          <button className="swiper-button-next-custom z-10 w-14 h-14 rounded-full border-2 border-white/20 text-white flex items-center justify-center hover:bg-white hover:text-black transition-all">
            <ChevronRight className="w-6 h-6" />
          </button>
        </div>

        {/* Slide Indicators */}
        <div className="swiper-pagination-custom absolute bottom-12 left-6 lg:left-12 flex gap-3 h-1 z-10">
          {/* Swiper handles these bullets */}
        </div>

      </div>
    </div>
  );
}
