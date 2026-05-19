"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { withAuditLog } from "@/lib/audit";

async function _createDiscount(data: { name: string; discountType: "FLAT" | "PERCENTAGE"; value: number }) {
  try {
    const discount = await prisma.discount.create({ data });
    revalidatePath("/admin/discounts");
    return { success: true, data: discount };
  } catch (error: any) {
    console.error("Error in createDiscount:", error);
    return { success: false, error: error instanceof Error ? error.message : "An unexpected error occurred." };
  }
}

export const createDiscount = withAuditLog(_createDiscount, {
  entityType: "Discount",
  action: "CREATE",
  getEntityId: () => null,
  getEntityIdFromResult: (r: any) => r?.data?.id ?? null,
  fetchAfter: (id) => prisma.discount.findUnique({ where: { id } }),
  describe: (args) => `Created discount "${args[0].name}" (${args[0].discountType}: ${args[0].value})`,
});

async function _updateDiscount(id: string, data: { name?: string; discountType?: "FLAT" | "PERCENTAGE"; value?: number; active?: boolean }) {
  try {
    const discount = await prisma.discount.update({ where: { id }, data });
    revalidatePath("/admin/discounts");
    return { success: true, data: discount };
  } catch (error: any) {
    console.error("Error in updateDiscount:", error);
    return { success: false, error: error instanceof Error ? error.message : "An unexpected error occurred." };
  }
}

export const updateDiscount = withAuditLog(_updateDiscount, {
  entityType: "Discount",
  action: "UPDATE",
  getEntityId: (args) => args[0],
  fetchBefore: (id) => prisma.discount.findUnique({ where: { id } }),
  fetchAfter: (id) => prisma.discount.findUnique({ where: { id } }),
  describe: (args) => `Updated discount ${args[0]}`,
});

async function _deleteDiscount(id: string) {
  try {
    const discount = await prisma.discount.delete({ where: { id } });
    revalidatePath("/admin/discounts");
    return { success: true, data: discount };
  } catch (error: any) {
    console.error("Error in deleteDiscount:", error);
    return { success: false, error: error instanceof Error ? error.message : "An unexpected error occurred." };
  }
}

export const deleteDiscount = withAuditLog(_deleteDiscount, {
  entityType: "Discount",
  action: "DELETE",
  getEntityId: (args) => args[0],
  fetchBefore: (id) => prisma.discount.findUnique({ where: { id } }),
  describe: (args) => `Deleted discount ${args[0]}`,
});
