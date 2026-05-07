import { getStaff } from "./actions";
import StaffClient from "./StaffClient";

export default async function StaffPage() {
  const staff = await getStaff();

  return (
    <div>

      <StaffClient initialStaff={staff} />
    </div>
  );
}
