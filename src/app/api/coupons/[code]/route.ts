import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { roundPrice } from "@/utils/formatPrice";
import { validateCouponRules } from "@/lib/coupon/couponValidator";

export async function GET(req: NextRequest, { params }: { params: { code: string } }) {
  try {
    const code = params.code.toUpperCase();
    const phone = req.nextUrl.searchParams.get("phone") || undefined;
    const deliveryCharge = Number(req.nextUrl.searchParams.get("deliveryCharge") || 0);
    const itemsRaw = req.nextUrl.searchParams.get("items");
    let items = [];
    if (itemsRaw) {
      try {
        items = JSON.parse(itemsRaw);
      } catch (e) {}
    }

    // Fallback: If no items are provided, we construct a dummy item with the subtotal
    if (items.length === 0) {
      const subtotal = Number(req.nextUrl.searchParams.get("subtotal") || 0);
      if (subtotal > 0) {
        items = [{ id: "dummy", name: "Dummy", price: subtotal, quantity: 1 }];
      }
    }

    const res = await validateCouponRules(code, items, deliveryCharge, phone);

    if (!res.isValid) {
      return NextResponse.json({ success: false, error: res.error || "Invalid coupon." }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      data: {
        code,
        discountAmount: roundPrice(res.discountAmount),
        appliedItems: res.appliedItems
      },
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
