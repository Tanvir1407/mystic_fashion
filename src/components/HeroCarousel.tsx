"use client";

import Link from "next/link";
import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay, Navigation, Pagination } from "swiper/modules";
import "swiper/css";
import "swiper/css/navigation";
import "swiper/css/pagination";

interface Slide {
  id: string;
  image: string;
  link: string;
}

export default function HeroCarousel({ slides }: { slides: Slide[] }) {
  if (slides.length === 0) return null;

  return (
    // 1. Removed `container mx-auto` to allow full edge-to-edge width
    // 2. Removed fixed mt-10 so it sits flush with the header on mobile
    <div className="relative w-full overflow-hidden mt-0 md:mt-2">
      <Swiper
        modules={[Autoplay, Navigation, Pagination]}
        spaceBetween={0}
        slidesPerView={1}
        loop={slides.length > 1}
        autoplay={{ delay: 5000, disableOnInteraction: false }}
        navigation={{
          prevEl: ".swiper-button-prev-custom",
          nextEl: ".swiper-button-next-custom",
        }}
        pagination={{
          clickable: true,
          el: ".swiper-pagination-custom",
        }}
        // 3. Responsive heights: Short on mobile, taller on desktop to maintain a good aspect ratio
        className="w-full h-[250px] sm:h-[350px] md:h-[450px] lg:h-[550px] xl:h-[650px]"
        style={{ "--swiper-pagination-color": "var(--primary)" } as React.CSSProperties}
      >
        {slides.map((slide, index) => (
          <SwiperSlide key={slide.id} className="relative w-full h-full group">
            <Link href={slide.link} className="absolute inset-0 z-10 block" aria-label={`View collection ${index + 1}`} />

            {/* Added bg-no-repeat to ensure it never tiles on ultra-wide screens */}
            <div
              className="absolute inset-0 bg-cover bg-center bg-no-repeat"
              style={{ backgroundImage: `url(${slide.image})` }}
            >
            </div>
          </SwiperSlide>
        ))}
      </Swiper>

      {/* Navigation Buttons: Adjusted positioning (left-4/right-4) for full-width layout and made them slightly smaller on mobile */}
      <div className="swiper-button-prev-custom absolute top-1/2 -translate-y-1/2 left-4 md:left-8 z-20 w-8 h-8 md:w-10 md:h-10 flex items-center justify-center rounded-full bg-white/30 backdrop-blur-sm border border-white/50 text-white shadow-lg cursor-pointer hover:bg-primary hover:border-primary hover:scale-110 transition-all">
        <svg className="w-3 h-3 md:w-4 md:h-4 rotate-180" viewBox="0 0 11 20" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M0.38296 20.0762C0.111788 19.805 0.111788 19.3654 0.38296 19.0942L9.19758 10.2796L0.38296 1.46497C0.111788 1.19379 0.111788 0.754138 0.38296 0.482966C0.654131 0.211794 1.09379 0.211794 1.36496 0.482966L10.4341 9.55214C10.8359 9.9539 10.8359 10.6053 10.4341 11.007L1.36496 20.0762C1.09379 20.3474 0.654131 20.3474 0.38296 20.0762Z" fill="currentColor" />
        </svg>
      </div>

      <div className="swiper-button-next-custom absolute top-1/2 -translate-y-1/2 right-4 md:right-8 z-20 w-8 h-8 md:w-10 md:h-10 flex items-center justify-center rounded-full bg-white/30 backdrop-blur-sm border border-white/50 text-white shadow-lg cursor-pointer hover:bg-primary hover:border-primary hover:scale-110 transition-all">
        <svg className="w-3 h-3 md:w-4 md:h-4" viewBox="0 0 11 20" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M0.38296 20.0762C0.111788 19.805 0.111788 19.3654 0.38296 19.0942L9.19758 10.2796L0.38296 1.46497C0.111788 1.19379 0.111788 0.754138 0.38296 0.482966C0.654131 0.211794 1.09379 0.211794 1.36496 0.482966L10.4341 9.55214C10.8359 9.9539 10.8359 10.6053 10.4341 11.007L1.36496 20.0762C1.09379 20.3474 0.654131 20.3474 0.38296 20.0762Z" fill="currentColor" />
        </svg>
      </div>

      {/* Slide Indicators: Moved up slightly so they don't get cut off on mobile screens */}
      <div className="swiper-pagination-custom absolute bottom-4 md:bottom-6 w-full flex justify-center gap-2 md:gap-3 z-20" />
    </div>
  );
}