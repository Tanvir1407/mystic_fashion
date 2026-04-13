import { prisma } from "@/lib/prisma";
import HeroSlideManager from "./HeroSlideManager";
import { ImagePlay } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AdminHeroPage() {
  let slides: any[] = [];
  try {
    slides = await prisma.heroSlide.findMany({
      orderBy: { sortOrder: "asc" },
    });
  } catch (error) {
    console.error("Error fetching slides:", error);
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start sm:items-center justify-between flex-col sm:flex-row gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Hero Carousel</h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage homepage hero slides — images, links and display order.
          </p>
        </div>
      </div>
      <HeroSlideManager initialSlides={slides} />
    </div>
  );
}
