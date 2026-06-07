import { NextResponse } from "next/server";
import { getPathaoCities } from "@/app/actions/pathao";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const res = await getPathaoCities();
    if (!res.success) {
      return NextResponse.json(
        { success: false, error: res.error },
        { status: 500 }
      );
    }
    return NextResponse.json({
      success: true,
      cities: res.data
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "An unexpected error occurred." },
      { status: 500 }
    );
  }
}
