import { NextRequest, NextResponse } from "next/server";
import { getPathaoAreas } from "@/app/actions/pathao";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const zoneIdStr = searchParams.get("zoneId");

    if (!zoneIdStr) {
      return NextResponse.json(
        { success: false, error: "zoneId query parameter is required." },
        { status: 400 }
      );
    }

    const zoneId = parseInt(zoneIdStr);
    if (isNaN(zoneId)) {
      return NextResponse.json(
        { success: false, error: "Invalid zoneId format." },
        { status: 400 }
      );
    }

    const res = await getPathaoAreas(zoneId);
    if (!res.success) {
      return NextResponse.json(
        { success: false, error: res.error },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      areas: res.data
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "An unexpected error occurred." },
      { status: 500 }
    );
  }
}
