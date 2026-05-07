"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function createHeroSlide(data: {
  image: string;
  link: string;
  label?: string;
  sortOrder: number;
}) {
  try {
    const slide = await prisma.heroSlide.create({ data });
    revalidatePath("/");
    revalidatePath("/admin/hero");
    return { success: true, data: slide };
  } catch (error: any) {
    console.error("Error in createHeroSlide:", error);
    return { success: false, error: error instanceof Error ? error.message : "An unexpected error occurred." };
  }
}

export async function updateHeroSlide(
  id: string,
  data: { image?: string; link?: string; label?: string; sortOrder?: number; active?: boolean }
) {
  try {
    const slide = await prisma.heroSlide.update({ where: { id }, data });
    revalidatePath("/");
    revalidatePath("/admin/hero");
    return { success: true, data: slide };
  } catch (error: any) {
    console.error("Error in updateHeroSlide:", error);
    return { success: false, error: error instanceof Error ? error.message : "An unexpected error occurred." };
  }
}

export async function deleteHeroSlide(id: string) {
  try {
    const slide = await prisma.heroSlide.delete({ where: { id } });
    revalidatePath("/");
    revalidatePath("/admin/hero");
    return { success: true, data: slide };
  } catch (error: any) {
    console.error("Error in deleteHeroSlide:", error);
    return { success: false, error: error instanceof Error ? error.message : "An unexpected error occurred." };
  }
}
