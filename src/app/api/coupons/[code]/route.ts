import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { roundPrice } from "@/utils/formatPrice";

export async function GET(req: NextRequest, { params }: { params: { code: string } }) {
  try {
    const code = params.code.toUpperCase();
    const subtotal = Number(req.nextUrl.searchParams.get("subtotal") || 0);

    const coupon = await prisma.coupon.findUnique({
      where: { code },
    });

    if (!coupon || !coupon.isActive || coupon.deletedAt) {
      return NextResponse.json({ success: false, error: "Invalid or inactive coupon code." }, { status: 404 });
    }

    const now = new Date();
    if (coupon.startDate && now < coupon.startDate) {
      return NextResponse.json({ success: false, error: "This coupon is not yet active." }, { status: 400 });
    }
    if (coupon.endDate && now > coupon.endDate) {
      return NextResponse.json({ success: false, error: "This coupon has expired." }, { status: 400 });
    }

    let discountAmount = 0;
    if (subtotal > 0) {
      if (coupon.type === "PERCENTAGE") {
        discountAmount = (coupon.value / 100) * subtotal;
      } else {
        discountAmount = coupon.value;
      }
      discountAmount = Math.min(discountAmount, subtotal);
    }

    return NextResponse.json({
      success: true,
      data: {
        code: coupon.code,
        type: coupon.type,
        value: coupon.value,
        discountAmount: roundPrice(discountAmount),
      },
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
