"use server";

import prisma from "@/lib/prisma";
import { CouponType } from "@/generated/prisma/client";
import { revalidatePath } from "next/cache";
import { withAuditLog } from "@/lib/audit";

// ─── GET COUPONS ────────────────────────────────────────────────────────────

export async function getCoupons() {
  return await prisma.coupon.findMany({
    orderBy: { createdAt: "desc" },
  });
}

// ─── CREATE COUPON ──────────────────────────────────────────────────────────

async function _createCoupon(data: {
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

export const createCoupon = withAuditLog(_createCoupon, {
  entityType: "Coupon",
  action: "CREATE",
  getEntityId: () => null,
  getEntityIdFromResult: (r: any) => r?.coupon?.id ?? null,
  fetchAfter: (id) => prisma.coupon.findUnique({ where: { id } }),
  describe: (args) => `Created coupon "${args[0].code.toUpperCase()}" (${args[0].type}: ${args[0].value})`,
});

// ─── UPDATE COUPON ──────────────────────────────────────────────────────────

async function _updateCoupon(id: string, data: {
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

export const updateCoupon = withAuditLog(_updateCoupon, {
  entityType: "Coupon",
  action: "UPDATE",
  getEntityId: (args) => args[0],
  fetchBefore: (id) => prisma.coupon.findUnique({ where: { id } }),
  fetchAfter: (id) => prisma.coupon.findUnique({ where: { id } }),
  describe: (args) => `Updated coupon ${args[0]}`,
});

// ─── DELETE COUPON ──────────────────────────────────────────────────────────

async function _deleteCoupon(id: string) {
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

export const deleteCoupon = withAuditLog(_deleteCoupon, {
  entityType: "Coupon",
  action: "DELETE",
  getEntityId: (args) => args[0],
  fetchBefore: (id) => prisma.coupon.findUnique({ where: { id } }),
  describe: (args) => `Deleted coupon ${args[0]}`,
});

// ─── TOGGLE COUPON STATUS ───────────────────────────────────────────────────

async function _toggleCouponStatus(id: string, isActive: boolean) {
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

export const toggleCouponStatus = withAuditLog(_toggleCouponStatus, {
  entityType: "Coupon",
  action: "UPDATE",
  getEntityId: (args) => args[0],
  fetchBefore: (id) => prisma.coupon.findUnique({ where: { id } }),
  fetchAfter: (id) => prisma.coupon.findUnique({ where: { id } }),
  describe: (args) => `Toggled coupon ${args[0]} status to ${args[1] ? "active" : "inactive"}`,
});
