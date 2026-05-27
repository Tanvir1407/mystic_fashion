import { NextRequest, NextResponse } from "next/server";
import { pathaoClient } from "@/lib/pathao/PathaoClient";

export async function GET(req: NextRequest) {
  const cityId = req.nextUrl.searchParams.get("cityId");

  if (!cityId || isNaN(Number(cityId))) {
    return NextResponse.json({ success: false, error: "cityId is required." }, { status: 400 });
  }

  try {
    const zones = await pathaoClient.getZones(Number(cityId));
    return NextResponse.json({ success: true, data: zones });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
