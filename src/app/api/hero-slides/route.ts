import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET() {
  try {
    const slides = await prisma.heroSlide.findMany({
      where: { active: true },
      orderBy: { sortOrder: "asc" },
      select: { id: true, image: true, link: true, label: true, sortOrder: true },
    });

    return NextResponse.json({ success: true, data: slides });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
