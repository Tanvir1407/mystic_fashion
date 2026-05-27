import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET() {
  try {
    const brands = await prisma.brand.findMany({
      where: { active: true, deletedAt: null },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    });

    return NextResponse.json({ success: true, data: brands });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
