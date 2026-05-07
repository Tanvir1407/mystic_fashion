import { getStaff, getAvailableRoles } from "./actions";
import StaffClient from "./StaffClient";

export default async function StaffPage() {
  const staffResult = await getStaff();
  const rolesResult = await getAvailableRoles();

  const staff = staffResult.success ? staffResult.data : [];
  const roles = rolesResult.success ? rolesResult.data : [];

  return (
    <div>
      <StaffClient initialStaff={staff} availableRoles={roles} />
    </div>
  );
}
