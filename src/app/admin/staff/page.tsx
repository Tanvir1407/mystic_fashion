import { getStaff, getAvailableRoles } from "./actions";
import StaffClient from "./StaffClient";
import prisma from "@/lib/prisma";

export default async function StaffPage() {
  const [staffResult, rolesResult, commissionSetting] = await Promise.all([
    getStaff(),
    getAvailableRoles(),
    prisma.commissionSetting.findUnique({ where: { id: "default" } }),
  ]);

  const staff = staffResult.success ? staffResult.data : [];
  const roles = rolesResult.success ? rolesResult.data : [];
  const globalCommissionRate = commissionSetting?.commissionRate ?? 10;

  return (
    <div>
      <StaffClient initialStaff={staff} availableRoles={roles} globalCommissionRate={globalCommissionRate} />
    </div>
  );
}
