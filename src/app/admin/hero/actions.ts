"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function createHeroSlide(data: {
  image: string;
  link: string;
  label?: string;
  sortOrder: number;
}) {
  const slide = await prisma.heroSlide.create({ data });
  revalidatePath("/");
  revalidatePath("/admin/hero");
  return slide;
}

export async function updateHeroSlide(
  id: string,
  data: { image?: string; link?: string; label?: string; sortOrder?: number; active?: boolean }
) {
  await prisma.heroSlide.update({ where: { id }, data });
  revalidatePath("/");
  revalidatePath("/admin/hero");
}

export async function deleteHeroSlide(id: string) {
  await prisma.heroSlide.delete({ where: { id } });
  revalidatePath("/");
  revalidatePath("/admin/hero");
}
