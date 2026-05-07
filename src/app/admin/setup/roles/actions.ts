"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";

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

export async function getPermissions() {
  try {
    const permissions = await prisma.permission.findMany({
      orderBy: [{ subject: "asc" }, { action: "asc" }]
    });
    return { success: true, data: permissions };
  } catch (error: any) {
    console.error("Error in getPermissions:", error);
    return { success: false, error: error instanceof Error ? error.message : "An unexpected error occurred." };
  }
}

export async function createRole(data: { name: string; description: string; permissionIds: string[] }) {
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

export async function updateRole(id: string, data: { name: string; description: string; permissionIds: string[] }) {
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

export async function deleteRole(id: string) {
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
