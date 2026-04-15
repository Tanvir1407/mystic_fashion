import { getStaff } from "./actions";
import StaffClient from "./StaffClient";

export default async function StaffPage() {
  const staff = await getStaff();

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Staff Management</h1>
          <p className="text-slate-500 text-sm mt-1">Manage administrative staff accounts and permissions.</p>
        </div>
      </div>

      <StaffClient initialStaff={staff} />
    </div>
  );
}
