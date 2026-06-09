"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { withAuditLog } from "@/lib/audit";
import bcrypt from "bcryptjs";

// ─── GET STAFF ──────────────────────────────────────────────────────────────

export async function getStaff() {
  try {
    const staffList = await prisma.staff.findMany({
      include: {
        role: true,
        _count: {
          select: { orders: true }
        }
      },
      orderBy: { createdAt: "desc" },
    });
    return { success: true, data: staffList };
  } catch (error: any) {
    console.error("Error in getStaff:", error);
    return { success: false, error: error instanceof Error ? error.message : "An unexpected error occurred." };
  }
}

// ─── GET AVAILABLE ROLES ────────────────────────────────────────────────────

export async function getAvailableRoles() {
  try {
    const roles = await prisma.role.findMany({
      orderBy: { name: "asc" },
    });
    return { success: true, data: roles };
  } catch (error: any) {
    console.error("Error in getAvailableRoles:", error);
    return { success: false, error: error instanceof Error ? error.message : "An unexpected error occurred." };
  }
}

// ─── CREATE STAFF ───────────────────────────────────────────────────────────

async function _createStaff(data: {
  username: string;
  email: string;
  password: string;
  roleId?: string;
  hasPortalAccess?: boolean;
}) {
  try {
    const hashedPassword = await bcrypt.hash(data.password, 10);
    const staff = await prisma.staff.create({
      data: {
        username: data.username,
        email: data.email,
        password: hashedPassword,
        roleId: data.roleId,
        hasPortalAccess: data.hasPortalAccess ?? false,
      },
      include: { role: true }
    });
    revalidatePath("/admin/staff");
    return { success: true, data: staff };
  } catch (error: any) {
    console.error("Error in createStaff:", error);
    return { success: false, error: error instanceof Error ? error.message : "An unexpected error occurred." };
  }
}

export const createStaff = withAuditLog(_createStaff, {
  entityType: "Staff",
  action: "CREATE",
  getEntityId: () => null,
  getEntityIdFromResult: (r: any) => r?.data?.id ?? null,
  fetchAfter: (id) => prisma.staff.findUnique({ where: { id }, select: { id: true, username: true, email: true, roleId: true, createdAt: true } }),
  describe: (args) => `Created staff member "${args[0].username}" (${args[0].email})`,
});

// ─── UPDATE STAFF ───────────────────────────────────────────────────────────

async function _updateStaff(id: string, data: {
  username?: string;
  email?: string;
  password?: string;
  roleId?: string | null;
  hasPortalAccess?: boolean;
}) {
  try {
    const updateData: any = { ...data };
    if (updateData.password) {
      updateData.password = await bcrypt.hash(updateData.password, 10);
    }
    const staff = await prisma.staff.update({
      where: { id },
      data: updateData,
      include: { role: true }
    });
    revalidatePath("/admin/staff");
    return { success: true, data: staff };
  } catch (error: any) {
    console.error("Error in updateStaff:", error);
    return { success: false, error: error instanceof Error ? error.message : "An unexpected error occurred." };
  }
}

export const updateStaff = withAuditLog(_updateStaff, {
  entityType: "Staff",
  action: "UPDATE",
  getEntityId: (args) => args[0],
  fetchBefore: (id) => prisma.staff.findUnique({ where: { id }, select: { id: true, username: true, email: true, roleId: true, updatedAt: true } }),
  fetchAfter: (id) => prisma.staff.findUnique({ where: { id }, select: { id: true, username: true, email: true, roleId: true, updatedAt: true } }),
  describe: (args) => `Updated staff member ${args[0]}`,
});

// ─── DELETE STAFF ───────────────────────────────────────────────────────────

async function _deleteStaff(id: string) {
  try {
    const staff = await prisma.staff.findUnique({ where: { id } });

    if (staff?.username === "admin") {
      throw new Error("The primary 'admin' account cannot be deleted.");
    }

    const deletedStaff = await prisma.staff.delete({
      where: { id },
    });
    revalidatePath("/admin/staff");
    return { success: true, data: deletedStaff };
  } catch (error: any) {
    console.error("Error in deleteStaff:", error);
    return { success: false, error: error instanceof Error ? error.message : "An unexpected error occurred." };
  }
}

export const deleteStaff = withAuditLog(_deleteStaff, {
  entityType: "Staff",
  action: "DELETE",
  getEntityId: (args) => args[0],
  fetchBefore: (id) => prisma.staff.findUnique({ where: { id }, select: { id: true, username: true, email: true, roleId: true } }),
  describe: (args) => `Deleted staff member ${args[0]}`,
});

// ─── RECALCULATE COMMISSION ─────────────────────────────────────────────────

export async function recalculateCommission(staffId: string, month: number, year: number) {
  try {
    const { updateDailyCommission } = await import("@/lib/commission");

    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 1);

    const orders = await prisma.order.findMany({
      where: {
        createdById: staffId,
        status: "DELIVERED",
        deliveredAt: { gte: startDate, lt: endDate },
        deletedAt: null,
      },
      select: { deliveredAt: true },
    });

    const uniqueDates = new Set<string>();
    for (const o of orders) {
      if (o.deliveredAt) {
        const d = new Date(o.deliveredAt);
        d.setHours(0, 0, 0, 0);
        uniqueDates.add(d.toISOString());
      }
    }

    for (const dateStr of uniqueDates) {
      await updateDailyCommission(staffId, new Date(dateStr));
    }

    revalidatePath(`/admin/staff/${staffId}`);
    return { success: true, count: uniqueDates.size };
  } catch (error: any) {
    console.error("Error recalculating commission:", error);
    return { success: false, error: error instanceof Error ? error.message : "Failed to recalculate commission." };
  }
}

// ─── COMMISSION PAYMENT ──────────────────────────────────────────────────────

export async function createCommissionPayment(data: {
  staffId: string;
  amount: number;
  month: number;
  year: number;
  note?: string;
  paidById?: string;
}) {
  try {
    const payment = await prisma.commissionPayment.create({ data });
    revalidatePath(`/admin/staff/${data.staffId}`);
    return { success: true, data: payment };
  } catch (error: any) {+
    console.error("Error in createCommissionPayment:", error);
    return { success: false, error: error instanceof Error ? error.message : "An unexpected error occurred." };
  }
}
