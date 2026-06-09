import { NextRequest, NextResponse } from "next/server";
import { processDailyCommissions } from "@/lib/cron";

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    const expectedKey = process.env.CRON_API_KEY;

    if (expectedKey && authHeader !== `Bearer ${expectedKey}`) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const result = await processDailyCommissions();
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    console.error("Cron process-commissions error:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
