"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function getStaff() {
  return await prisma.staff.findMany({
    include: { role: true },
    orderBy: { createdAt: "desc" },
  });
}

export async function getAvailableRoles() {
  return await prisma.role.findMany({
    orderBy: { name: "asc" },
  });
}

export async function createStaff(data: { username: string; email: string; password: string; roleId?: string }) {
  const staff = await prisma.staff.create({
    data: {
      username: data.username,
      email: data.email,
      password: data.password,
      roleId: data.roleId,
    },
    include: { role: true }
  });
  revalidatePath("/admin/staff");
  return staff;
}

export async function updateStaff(id: string, data: { username?: string; email?: string; password?: string; roleId?: string }) {
  const staff = await prisma.staff.update({
    where: { id },
    data,
    include: { role: true }
  });
  revalidatePath("/admin/staff");
  return staff;
}

export async function deleteStaff(id: string) {
  const staff = await prisma.staff.findUnique({ where: { id } });
  
  if (staff?.username === "admin") {
    throw new Error("The primary 'admin' account cannot be deleted.");
  }

  await prisma.staff.delete({
    where: { id },
  });
  revalidatePath("/admin/staff");
}
