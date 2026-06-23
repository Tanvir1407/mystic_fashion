"use server";

import prisma from "@/lib/prisma";

export async function updateCommissionSettingsAction(commissionRate: number) {
  if (typeof commissionRate !== "number" || commissionRate < 0 || commissionRate > 100) {
    return { success: false, error: "Invalid commission rate." };
  }

  try {
    await prisma.commissionSetting.upsert({
      where: { id: "default" },
      update: { commissionRate, updatedAt: new Date() },
      create: { id: "default", commissionRate, updatedAt: new Date() },
    });
    return { success: true };
  } catch (error) {
    console.error("Commission settings update error:", error);
    return { success: false, error: "Failed to update." };
  }
}
