"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function getStaff() {
  return await prisma.staff.findMany({
    orderBy: { createdAt: "desc" },
  });
}

export async function createStaff(data: { username: string; email: string; password: string }) {
  const staff = await prisma.staff.create({
    data: {
      username: data.username,
      email: data.email,
      password: data.password, // Ideally hashed, but following current project simplicity
    },
  });
  revalidatePath("/admin/staff");
  return staff;
}

export async function updateStaff(id: string, data: { username?: string; email?: string; password?: string }) {
  const staff = await prisma.staff.update({
    where: { id },
    data,
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
