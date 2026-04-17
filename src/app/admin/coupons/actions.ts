"use server";

import prisma from "@/lib/prisma";
import { CouponType } from "@/generated/prisma/client";
import { revalidatePath } from "next/cache";

export async function getCoupons() {
  return await prisma.coupon.findMany({
    orderBy: { createdAt: "desc" },
  });
}

export async function createCoupon(data: {
  code: string;
  type: CouponType;
  value: number;
  startDate?: Date | null;
  endDate?: Date | null;
  isActive: boolean;
}) {
  try {
    const coupon = await prisma.coupon.create({
      data: {
        code: data.code.toUpperCase(),
        type: data.type,
        value: data.value,
        startDate: data.startDate,
        endDate: data.endDate,
        isActive: data.isActive,
      },
    });
    revalidatePath("/admin/coupons");
    return { success: true, coupon };
  } catch (error: any) {
    if (error.code === "P2002") {
      return { success: false, error: "Coupon code already exists." };
    }
    return { success: false, error: error.message || "Failed to create coupon." };
  }
}

export async function updateCoupon(id: string, data: {
  code: string;
  type: CouponType;
  value: number;
  startDate?: Date | null;
  endDate?: Date | null;
  isActive: boolean;
}) {
  try {
    const coupon = await prisma.coupon.update({
      where: { id },
      data: {
        code: data.code.toUpperCase(),
        type: data.type,
        value: data.value,
        startDate: data.startDate,
        endDate: data.endDate,
        isActive: data.isActive,
      },
    });
    revalidatePath("/admin/coupons");
    return { success: true, coupon };
  } catch (error: any) {
    if (error.code === "P2002") {
      return { success: false, error: "Coupon code already exists." };
    }
    return { success: false, error: error.message || "Failed to update coupon." };
  }
}

export async function deleteCoupon(id: string) {
  try {
    await prisma.coupon.delete({
      where: { id },
    });
    revalidatePath("/admin/coupons");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to delete coupon." };
  }
}

export async function toggleCouponStatus(id: string, isActive: boolean) {
  try {
    await prisma.coupon.update({
      where: { id },
      data: { isActive },
    });
    revalidatePath("/admin/coupons");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to toggle status." };
  }
}
