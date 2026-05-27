import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET() {
  try {
    const [delivery, dtf] = await Promise.all([
      prisma.deliverySetting.upsert({
        where: { id: "default" },
        update: {},
        create: { id: "default", insideDhaka: 70, outsideDhaka: 120 },
      }),
      prisma.dTFPrintSetting.upsert({
        where: { id: "default" },
        update: {},
        create: { id: "default", printCost: 300 },
      }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        delivery: { insideDhaka: delivery.insideDhaka, outsideDhaka: delivery.outsideDhaka },
        dtfPrintCost: dtf.printCost,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
