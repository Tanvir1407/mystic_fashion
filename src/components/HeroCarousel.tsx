"use client";

import { motion } from "framer-motion";

import Link from "next/link";
import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay, Navigation, Pagination, EffectFade } from "swiper/modules";

// Import Swiper styles
import "swiper/css";
import "swiper/css/effect-fade";
import "swiper/css/navigation";
import "swiper/css/pagination";

const slides = [
  {
    image: "https://images.unsplash.com/photo-1574629810360-7efbbe195018?q=80&w=2000&auto=format&fit=crop",
    link: "/shop?category=authentic",
  },
  {
    image: "https://images.unsplash.com/photo-1551958219-acbc608c6377?q=80&w=2000&auto=format&fit=crop",
    link: "/shop?category=retro",
  }
];

export default function HeroCarousel() {
  return (
    <div className="relative  md:h-[480px] max-h-[480px] mt-10">
      <div className="container mx-auto w-full overflow-hidden ">

        <Swiper
          modules={[Autoplay, Navigation, Pagination, EffectFade]}
          effect="fade"
          fadeEffect={{ crossFade: true }}
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
          style={{ height: '480px', '--swiper-pagination-color': 'var(--primary)', } as React.CSSProperties}
        >
          {slides.map((slide, index) => (
            <SwiperSlide key={index} className="relative h-full w-full group">
              <Link href={slide.link} className="absolute inset-0 z-10 block" aria-label={`View collection ${index + 1}`} />
              <div
                className="absolute inset-0 bg-cover bg-center transition-transform duration-[10000ms] ease-linear scale-110 group-hover:scale-100"
                style={{ backgroundImage: `url(${slide.image})` }}
              >
                <div className="absolute inset-0 bg-black/10 group-hover:bg-black/0 transition-colors duration-500" />
              </div>
            </SwiperSlide>
          ))}
        </Swiper>

        {/* Navigation Buttons */}
        <div className="swiper-button-prev-custom absolute top-1/2 -translate-y-1/2 left-6 lg:left-28 z-20 w-9 h-9 flex items-center justify-center rounded-full border border-slate-100 text-white shadow-lg cursor-pointer hover:border-0 hover:bg-primary hover:scale-110 transition-transform">
          <svg className="w-[10px] h-4 rotate-180" viewBox="0 0 11 20" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M0.38296 20.0762C0.111788 19.805 0.111788 19.3654 0.38296 19.0942L9.19758 10.2796L0.38296 1.46497C0.111788 1.19379 0.111788 0.754138 0.38296 0.482966C0.654131 0.211794 1.09379 0.211794 1.36496 0.482966L10.4341 9.55214C10.8359 9.9539 10.8359 10.6053 10.4341 11.007L1.36496 20.0762C1.09379 20.3474 0.654131 20.3474 0.38296 20.0762Z" fill="currentColor"></path></svg>
        </div>
        <div className="swiper-button-next-custom absolute top-1/2 -translate-y-1/2 right-6 lg:right-28 z-20 w-9 h-9 flex items-center justify-center rounded-full border border-slate-100 text-white shadow-lg cursor-pointer hover:border-0 hover:bg-primary hover:scale-110 transition-transform">
          <svg className="w-[10px] h-4" viewBox="0 0 11 20" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M0.38296 20.0762C0.111788 19.805 0.111788 19.3654 0.38296 19.0942L9.19758 10.2796L0.38296 1.46497C0.111788 1.19379 0.111788 0.754138 0.38296 0.482966C0.654131 0.211794 1.09379 0.211794 1.36496 0.482966L10.4341 9.55214C10.8359 9.9539 10.8359 10.6053 10.4341 11.007L1.36496 20.0762C1.09379 20.3474 0.654131 20.3474 0.38296 20.0762Z" fill="currentColor"></path></svg>
        </div>
        {/* Slide Indicators */}
        <div className="swiper-pagination-custom absolute bottom-6 w-full flex justify-center gap-3 z-20">
          {/* Swiper handles these bullets */}
        </div>

      </div>
    </div>
  );
}
