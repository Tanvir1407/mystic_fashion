import { NextRequest, NextResponse } from "next/server";
import { pathaoClient } from "@/lib/pathao/PathaoClient";

export async function GET(req: NextRequest) {
  const zoneId = req.nextUrl.searchParams.get("zoneId");

  if (!zoneId || isNaN(Number(zoneId))) {
    return NextResponse.json({ success: false, error: "zoneId is required." }, { status: 400 });
  }

  try {
    const areas = await pathaoClient.getAreas(Number(zoneId));
    return NextResponse.json({ success: true, data: areas });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
