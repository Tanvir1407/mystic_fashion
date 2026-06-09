import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET() {
  try {
    const slabs = await prisma.commissionSlab.findMany({
      orderBy: { priority: "asc" },
    });
    return NextResponse.json({ success: true, data: slabs });
  } catch (error) {
    console.error("Commission slabs fetch error:", error);
    return NextResponse.json({ success: false, error: "Failed to fetch slabs." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { slabs } = await request.json();
                
    if (!Array.isArray(slabs) || slabs.length === 0) {
      return NextResponse.json({ success: false, error: "At least one slab is required." }, { status: 400 });
    }

    for (const slab of slabs) {
      if (typeof slab.minAmount !== "number" || slab.minAmount < 0) {
        return NextResponse.json({ success: false, error: "Invalid minAmount." }, { status: 400 });
      }
      if (slab.maxAmount !== null && (typeof slab.maxAmount !== "number" || slab.maxAmount < 0)) {
        return NextResponse.json({ success: false, error: "Invalid maxAmount." }, { status: 400 });
      }
      if (typeof slab.rate !== "number" || slab.rate < 0) {
        return NextResponse.json({ success: false, error: "Invalid rate." }, { status: 400 });
      }
    }

    await prisma.$transaction(async (tx) => {
      await tx.commissionSlab.deleteMany();
      for (let i = 0; i < slabs.length; i++) {
        await tx.commissionSlab.create({
          data: {
            minAmount: slabs[i].minAmount,
            maxAmount: slabs[i].maxAmount ?? null,
            rate: slabs[i].rate,
            priority: i + 1,
          },
        });
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Commission slabs update error:", error);
    return NextResponse.json({ success: false, error: "Failed to update slabs." }, { status: 500 });
  }
}
