"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function createDiscount(data: { name: string; discountType: "FLAT" | "PERCENTAGE"; value: number }) {
  try {
    const discount = await prisma.discount.create({ data });
    revalidatePath("/admin/discounts");
    return { success: true, data: discount };
  } catch (error: any) {
    console.error("Error in createDiscount:", error);
    return { success: false, error: error instanceof Error ? error.message : "An unexpected error occurred." };
  }
}

export async function updateDiscount(id: string, data: { name?: string; discountType?: "FLAT" | "PERCENTAGE"; value?: number; active?: boolean }) {
  try {
    const discount = await prisma.discount.update({ where: { id }, data });
    revalidatePath("/admin/discounts");
    return { success: true, data: discount };
  } catch (error: any) {
    console.error("Error in updateDiscount:", error);
    return { success: false, error: error instanceof Error ? error.message : "An unexpected error occurred." };
  }
}

export async function deleteDiscount(id: string) {
  try {
    const discount = await prisma.discount.delete({ where: { id } });
    revalidatePath("/admin/discounts");
    return { success: true, data: discount };
  } catch (error: any) {
    console.error("Error in deleteDiscount:", error);
    return { success: false, error: error instanceof Error ? error.message : "An unexpected error occurred." };
  }
}
