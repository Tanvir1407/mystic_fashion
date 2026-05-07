"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function getStaff() {
  try {
    const staffList = await prisma.staff.findMany({
      include: { role: true },
      orderBy: { createdAt: "desc" },
    });
    return { success: true, data: staffList };
  } catch (error: any) {
    console.error("Error in getStaff:", error);
    return { success: false, error: error instanceof Error ? error.message : "An unexpected error occurred." };
  }
}

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

export async function createStaff(data: { username: string; email: string; password: string; roleId?: string }) {
  try {
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
    return { success: true, data: staff };
  } catch (error: any) {
    console.error("Error in createStaff:", error);
    return { success: false, error: error instanceof Error ? error.message : "An unexpected error occurred." };
  }
}

export async function updateStaff(id: string, data: { username?: string; email?: string; password?: string; roleId?: string }) {
  try {
    const staff = await prisma.staff.update({
      where: { id },
      data,
      include: { role: true }
    });
    revalidatePath("/admin/staff");
    return { success: true, data: staff };
  } catch (error: any) {
    console.error("Error in updateStaff:", error);
    return { success: false, error: error instanceof Error ? error.message : "An unexpected error occurred." };
  }
}

export async function deleteStaff(id: string) {
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
