import { getStaff, getAvailableRoles } from "./actions";
import StaffClient from "./StaffClient";

export default async function StaffPage() {
  const staff = await getStaff();
  const roles = await getAvailableRoles();

  return (
    <div>
      <StaffClient initialStaff={staff} availableRoles={roles} />
    </div>
  );
}
