"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { withAuditLog } from "@/lib/audit";

// ─── GET ROLES ──────────────────────────────────────────────────────────────

export async function getRoles() {
  try {
    const roles = await prisma.role.findMany({
      include: {
        permissions: true,
        _count: {
          select: { staff: true, admins: true }
        }
      },
      orderBy: { name: "asc" }
    });
    return { success: true, data: roles };
  } catch (error: any) {
    console.error("Error in getRoles:", error);
    return { success: false, error: error instanceof Error ? error.message : "An unexpected error occurred." };
  }
}

// ─── GET PERMISSIONS ────────────────────────────────────────────────────────

export async function getPermissions() {
  try {

    // Dynamically self-heal: Ensure ACTIVITY_LOGS permissions exist in the database (perfect for zero-downtime production updates)
    const requiredPerms = [
      { action: "DELETE", subject: "ACTIVITY_LOGS" },
      { action: "EDIT", subject: "ACTIVITY_LOGS" },
      { action: "VIEW", subject: "ACTIVITY_LOGS" },
    ];

    for (const perm of requiredPerms) {
      await prisma.permission.upsert({
        where: { action_subject: { action: perm.action, subject: perm.subject } },
        update: {},
        create: { action: perm.action, subject: perm.subject },
      });
    }

    const permissions = await prisma.permission.findMany({
      orderBy: [{ subject: "asc" }, { action: "asc" }]
    });
    return { success: true, data: permissions };
  } catch (error: any) {
    console.error("Error in getPermissions:", error);
    return { success: false, error: error instanceof Error ? error.message : "An unexpected error occurred." };
  }
}

// ─── CREATE ROLE ────────────────────────────────────────────────────────────

async function _createRole(data: { name: string; description: string; permissionIds: string[] }) {
  try {
    const role = await prisma.role.create({
      data: {
        name: data.name.toUpperCase(),
        description: data.description,
        permissions: {
          connect: data.permissionIds.map(id => ({ id }))
        }
      }
    });
    revalidatePath("/admin/setup/roles");
    return { success: true, data: role };
  } catch (error: any) {
    console.error("Error in createRole:", error);
    return { success: false, error: error instanceof Error ? error.message : "An unexpected error occurred." };
  }
}

export const createRole = withAuditLog(_createRole, {
  entityType: "Role",
  action: "CREATE",
  getEntityId: () => null,
  getEntityIdFromResult: (r: any) => r?.data?.id ?? null,
  fetchAfter: (id) => prisma.role.findUnique({ where: { id }, include: { permissions: true } }),
  describe: (args) => `Created role "${args[0].name.toUpperCase()}"`,
});

// ─── UPDATE ROLE ────────────────────────────────────────────────────────────

async function _updateRole(id: string, data: { name: string; description: string; permissionIds: string[] }) {
  try {
    const role = await prisma.role.update({
      where: { id },
      data: {
        name: data.name.toUpperCase(),
        description: data.description,
        permissions: {
          set: data.permissionIds.map(pid => ({ id: pid }))
        }
      }
    });
    revalidatePath("/admin/setup/roles");
    return { success: true, data: role };
  } catch (error: any) {
    console.error("Error in updateRole:", error);
    return { success: false, error: error instanceof Error ? error.message : "An unexpected error occurred." };
  }
}

export const updateRole = withAuditLog(_updateRole, {
  entityType: "Role",
  action: "UPDATE",
  getEntityId: (args) => args[0],
  fetchBefore: (id) => prisma.role.findUnique({ where: { id }, include: { permissions: true } }),
  fetchAfter: (id) => prisma.role.findUnique({ where: { id }, include: { permissions: true } }),
  describe: (args) => `Updated role ${args[0]}`,
});

// ─── DELETE ROLE ────────────────────────────────────────────────────────────

async function _deleteRole(id: string) {
  try {
    const role = await prisma.role.findUnique({ where: { id }, include: { _count: { select: { staff: true, admins: true } } } });

    if (role?.name === 'SUPERADMIN') {
      throw new Error("Cannot delete SUPERADMIN role.");
    }
    if ((role?._count.staff || 0) > 0 || (role?._count.admins || 0) > 0) {
      throw new Error("Cannot delete role assigned to active users.");
    }

    const deletedRole = await prisma.role.delete({ where: { id } });
    revalidatePath("/admin/setup/roles");
    return { success: true, data: deletedRole };
  } catch (error: any) {
    console.error("Error in deleteRole:", error);
    return { success: false, error: error instanceof Error ? error.message : "An unexpected error occurred." };
  }
}

export const deleteRole = withAuditLog(_deleteRole, {
  entityType: "Role",
  action: "DELETE",
  getEntityId: (args) => args[0],
  fetchBefore: (id) => prisma.role.findUnique({ where: { id }, include: { permissions: true } }),
  describe: (args) => `Deleted role ${args[0]}`,
});
