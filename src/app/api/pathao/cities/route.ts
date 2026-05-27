import { NextResponse } from "next/server";
import { pathaoClient } from "@/lib/pathao/PathaoClient";

export async function GET() {
  try {
    const cities = await pathaoClient.getCities();
    return NextResponse.json({ success: true, data: cities });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
