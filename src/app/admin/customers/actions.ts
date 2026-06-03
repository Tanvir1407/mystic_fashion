"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { withAuditLog } from "@/lib/audit";
import bcrypt from "bcryptjs";

// Toggle customer active status
async function _toggleCustomerStatusAction(id: string, isActive: boolean) {
  try {
    const updated = await prisma.customer.update({
      where: { id },
      data: { isActive },
    });
    revalidatePath(`/admin/customers/${id}`);
    revalidatePath("/admin/customers");
    return { success: true, data: updated };
  } catch (error: any) {
    console.error("[toggleCustomerStatusAction] Error:", error);
    return { success: false, error: error.message || "Failed to update customer status." };
  }
}

export const toggleCustomerStatusAction = withAuditLog(_toggleCustomerStatusAction, {
  entityType: "Customer",
  action: "UPDATE",
  getEntityId: (args) => args[0],
  fetchBefore: (id) => prisma.customer.findUnique({ where: { id } }),
  fetchAfter: (id) => prisma.customer.findUnique({ where: { id } }),
  describe: (args) => `Updated customer status (ID: ${args[0]}, Active: ${args[1]})`,
});

// Admin change customer password
async function _adminChangeCustomerPasswordAction(customerId: string, newPassword: string) {
  try {
    if (!newPassword || newPassword.length < 6) {
      return { success: false, error: "Password must be at least 6 characters long." };
    }
    const passwordHash = await bcrypt.hash(newPassword, 10);
    const updated = await prisma.customer.update({
      where: { id: customerId },
      data: { passwordHash },
    });
    return { success: true, data: updated };
  } catch (error: any) {
    console.error("[adminChangeCustomerPasswordAction] Error:", error);
    return { success: false, error: error.message || "Failed to update customer password." };
  }
}

export const adminChangeCustomerPasswordAction = withAuditLog(_adminChangeCustomerPasswordAction, {
  entityType: "Customer",
  action: "UPDATE",
  getEntityId: (args) => args[0],
  fetchBefore: (id) => prisma.customer.findUnique({ where: { id } }),
  fetchAfter: (id) => prisma.customer.findUnique({ where: { id } }),
  describe: (args) => `Reset customer password (ID: ${args[0]})`,
});
