"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function getRoles() {
  return await prisma.role.findMany({
    include: {
      permissions: true,
      _count: {
        select: { staff: true, admins: true }
      }
    },
    orderBy: { name: "asc" }
  });
}

export async function getPermissions() {
  return await prisma.permission.findMany({
    orderBy: [{ subject: "asc" }, { action: "asc" }]
  });
}

export async function createRole(data: { name: string; description: string; permissionIds: string[] }) {
  await prisma.role.create({
    data: {
      name: data.name.toUpperCase(),
      description: data.description,
      permissions: {
        connect: data.permissionIds.map(id => ({ id }))
      }
    }
  });
  revalidatePath("/admin/setup/roles");
}

export async function updateRole(id: string, data: { name: string; description: string; permissionIds: string[] }) {
  await prisma.role.update({
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
}

export async function deleteRole(id: string) {
  const role = await prisma.role.findUnique({ where: { id }, include: { _count: { select: { staff: true, admins: true } } } });
  
  if (role?.name === 'SUPERADMIN') {
    throw new Error("Cannot delete SUPERADMIN role.");
  }
  if ((role?._count.staff || 0) > 0 || (role?._count.admins || 0) > 0) {
    throw new Error("Cannot delete role assigned to active users.");
  }

  await prisma.role.delete({ where: { id } });
  revalidatePath("/admin/setup/roles");
}
