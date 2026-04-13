"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function createDiscount(data: { name: string; discountType: "FLAT" | "PERCENTAGE"; value: number }) {
  const discount = await prisma.discount.create({ data });
  revalidatePath("/admin/discounts");
  return discount;
}

export async function updateDiscount(id: string, data: { name?: string; discountType?: "FLAT" | "PERCENTAGE"; value?: number; active?: boolean }) {
  const discount = await prisma.discount.update({ where: { id }, data });
  revalidatePath("/admin/discounts");
  return discount;
}

export async function deleteDiscount(id: string) {
  await prisma.discount.delete({ where: { id } });
  revalidatePath("/admin/discounts");
}
