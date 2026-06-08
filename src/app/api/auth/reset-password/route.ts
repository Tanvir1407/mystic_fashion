import { NextRequest, NextResponse } from "next/server";
import { resetCustomerPasswordAction } from "@/app/actions/customerAuth";

export async function POST(req: NextRequest) {
  try {
    const { email, otpCode, password } = await req.json();

    if (!email || !otpCode || !password) {
      return NextResponse.json(
        { success: false, error: "Email, verification code, and new password are required." },
        { status: 400 }
      );
    }

    const res = await resetCustomerPasswordAction({ email, otpCode, password });
    if (!res.success) {
      return NextResponse.json(
        { success: false, error: res.error },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Password reset and account logged in successfully.",
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "An unexpected error occurred." },
      { status: 500 }
    );
  }
}
