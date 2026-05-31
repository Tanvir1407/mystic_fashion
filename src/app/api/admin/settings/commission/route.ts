import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const { commissionRate } = await request.json();

    if (typeof commissionRate !== "number" || commissionRate < 0 || commissionRate > 100) {
      return NextResponse.json({ success: false, error: "Invalid commission rate." }, { status: 400 });
    }

    await prisma.commissionSetting.upsert({
      where: { id: "default" },
      update: { commissionRate, updatedAt: new Date() },
      create: { id: "default", commissionRate, updatedAt: new Date() },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Commission settings update error:", error);
    return NextResponse.json({ success: false, error: "Failed to update." }, { status: 500 });
  }
}
