"use server";

import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { createStaffSession } from "@/lib/staff-auth";
import { redirect } from "next/navigation";

export async function staffLogin(email: string, password: string) {
  try {
    const staff = await prisma.staff.findUnique({ where: { email } });

    if (!staff) {
      return { success: false, error: "Invalid email or password" };
    }

    if (!staff.hasPortalAccess) {
      return { success: false, error: "Access denied. Contact your administrator." };
    }

    const isHashed = staff.password.startsWith("$2b$") || staff.password.startsWith("$2a$");
    let passwordValid: boolean;

    if (isHashed) {
      passwordValid = await bcrypt.compare(password, staff.password);
    } else {
      passwordValid = staff.password === password;
      if (passwordValid) {
        const hashed = await bcrypt.hash(password, 10);
        await prisma.staff.update({ where: { id: staff.id }, data: { password: hashed } });
      }
    }

    if (!passwordValid) {
      return { success: false, error: "Invalid email or password" };
    }

    await createStaffSession({ staffId: staff.id, username: staff.username, email: staff.email });
    return { success: true };
  } catch (error: any) {
    console.error("staffLogin error:", error);
    return { success: false, error: "An unexpected error occurred." };
  }
}

export async function staffLogout() {
  const { destroyStaffSession } = await import("@/lib/staff-auth");
  await destroyStaffSession();
  redirect("/staff/login");
}
