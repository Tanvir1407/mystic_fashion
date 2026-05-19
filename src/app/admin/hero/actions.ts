"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { withAuditLog } from "@/lib/audit";

async function _createHeroSlide(data: {
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

export const createHeroSlide = withAuditLog(_createHeroSlide, {
  entityType: "HeroSlide",
  action: "CREATE",
  getEntityId: () => null,
  getEntityIdFromResult: (r: any) => r?.data?.id ?? null,
  fetchAfter: (id) => prisma.heroSlide.findUnique({ where: { id } }),
  describe: (args) => `Created hero slide (order: ${args[0].sortOrder})`,
});

async function _updateHeroSlide(
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

export const updateHeroSlide = withAuditLog(_updateHeroSlide, {
  entityType: "HeroSlide",
  action: "UPDATE",
  getEntityId: (args) => args[0],
  fetchBefore: (id) => prisma.heroSlide.findUnique({ where: { id } }),
  fetchAfter: (id) => prisma.heroSlide.findUnique({ where: { id } }),
  describe: (args) => `Updated hero slide ${args[0]}`,
});

async function _deleteHeroSlide(id: string) {
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

export const deleteHeroSlide = withAuditLog(_deleteHeroSlide, {
  entityType: "HeroSlide",
  action: "DELETE",
  getEntityId: (args) => args[0],
  fetchBefore: (id) => prisma.heroSlide.findUnique({ where: { id } }),
  describe: (args) => `Deleted hero slide ${args[0]}`,
});
