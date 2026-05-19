"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { withAuditLog } from "@/lib/audit";

export async function getFooterConfig() {
  try {
    const config = await prisma.footerConfig.upsert({
      where: { id: "default" },
      update: {},
      create: { id: "default" },
    });

    return config;
  } catch (error) {
    console.error("Error fetching footer config:", error);
    return null;
  }
}

async function _updateFooterConfig(data: any) {
  try {
    // Ensure we don't try to update the ID
    const { id, ...updateData } = data;

    const config = await prisma.footerConfig.upsert({
      where: { id: "default" },
      update: updateData,
      create: { id: "default", ...updateData },
    });

    revalidatePath("/");
    revalidatePath("/admin/settings/footer");
    
    return { success: true, config };
  } catch (error) {
    console.error("Error updating footer config:", error);
    return { success: false, error: "Failed to update footer configuration" };
  }
}

export const updateFooterConfig = withAuditLog(_updateFooterConfig, {
  entityType: "FooterConfig",
  action: "UPDATE",
  getEntityId: () => "default",
  fetchBefore: (id) => prisma.footerConfig.findUnique({ where: { id } }),
  fetchAfter: (id) => prisma.footerConfig.findUnique({ where: { id } }),
  describe: () => `Updated footer configuration`,
});
