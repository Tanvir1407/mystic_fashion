"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function placeOrderAction(payload: {
  fullName: string;
  phone: string;
  district: string;
  address: string;
  items: any[];
  totalAmount: number;
  remarks?: string;
  couponCode?: string;
  discountAmount?: number;
}) {
  try {
    return await prisma.$transaction(async (tx) => {
      // Generate Custom Order ID
      const now = new Date();
      const year = now.getFullYear().toString().slice(-2);
      const month = (now.getMonth() + 1).toString().padStart(2, '0');
      const date = now.getDate().toString().padStart(2, '0');
      const datePrefix = `MJEPE-${year}${month}${date}`;

      const lastOrder = await tx.order.findFirst({
        where: { id: { startsWith: datePrefix } },
        orderBy: { id: 'desc' },
        select: { id: true }
      });

      let nextNum = 1;
      if (lastOrder) {
        const lastNumStr = lastOrder.id.replace(datePrefix, "");
        nextNum = parseInt(lastNumStr) + 1;
      }
      const customId = `${datePrefix}${nextNum.toString().padStart(2, '0')}`;

      // Sanitize couponCode (Convert "" to null)
      const sanitizedCoupon = payload.couponCode?.trim() ? payload.couponCode.trim().toUpperCase() : null;

      // 1. Create the order & items
      const order = await tx.order.create({
        data: {
          id: customId,
          customerName: payload.fullName,
          phone: payload.phone,
          district: payload.district,
          address: payload.address,
          totalAmount: payload.totalAmount,
          remarks: payload.remarks,
          couponCode: sanitizedCoupon,
          discountAmount: payload.discountAmount || 0,
          items: {
            create: payload.items.map((item) => ({
              productId: item.id,
              size: item.size || "M",
              quantity: item.quantity,
              price: item.price,
              requiresPrint: item.requiresPrint || false,
              printName: item.printName || null,
              printNumber: item.printNumber || null,
              printCost: item.printCost || 0,
            })),
          },
        },
      });

      // 2. Validate stock availability but don't decrement yet
      for (const item of payload.items) {
        if (!item.size) {
          throw new Error(`Size not selected for ${item.name}`);
        }

        const variant = await tx.productVariant.findUnique({
          where: {
            productId_size: {
              productId: item.id,
              size: item.size
            }
          }
        });

        if (!variant) {
          throw new Error(`Variant not found for ${item.name} (${item.size})`);
        }

        // Stock will only be validated and decremented when admin moves status to CONFIRMED
      }

      revalidatePath("/admin/products");
      revalidatePath("/admin/orders");
      revalidatePath("/");

      return { success: true, orderId: order.id };
    });
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to place order." };
  }
}

export async function validateCoupon(code: string, baseSubtotal: number) {
  try {
    const coupon = await prisma.coupon.findUnique({
      where: { code: code.toUpperCase() },
    });

    if (!coupon || !coupon.isActive) {
      return { success: false, error: "Invalid or inactive coupon code." };
    }

    const now = new Date();
    if (coupon.startDate && now < coupon.startDate) {
      return { success: false, error: "This coupon is not yet active." };
    }
    if (coupon.endDate && now > coupon.endDate) {
      return { success: false, error: "This coupon has expired." };
    }

    let discountAmount = 0;
    if (coupon.type === "PERCENTAGE") {
      discountAmount = (coupon.value / 100) * baseSubtotal;
    } else {
      discountAmount = coupon.value;
    }

    // Ensure discount doesn't exceed base subtotal
    discountAmount = Math.min(discountAmount, baseSubtotal);

    return {
      success: true,
      discountAmount: Math.round(discountAmount),
      couponCode: coupon.code
    };
  } catch (error: any) {
    return { success: false, error: "Failed to validate coupon." };
  }
}
