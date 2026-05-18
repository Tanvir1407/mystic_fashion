import { getSession } from "@/lib/auth";
import prisma from "@/lib/prisma";
import UnauthorizedClient from "@/app/admin/unauthorized/UnauthorizedClient";

export const dynamic = "force-dynamic";

export default async function UnauthorizedPage() {
  const session = await getSession();
  let staffEmail = "";
  let roleName = "No Role";

  if (session?.userId) {
    try {
      const staff = await prisma.staff.findUnique({
        where: { id: session.userId },
        include: { role: true }
      });
      if (staff) {
        staffEmail = staff.email;
        roleName = staff.role?.name || "No Role";
      }
    } catch (error) {
      console.error("Error fetching staff for unauthorized page:", error);
    }
  }

  return (
    <UnauthorizedClient 
      staffEmail={staffEmail} 
      roleName={roleName} 
    />
  );
}
