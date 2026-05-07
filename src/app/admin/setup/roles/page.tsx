import { getRoles, getPermissions } from "./actions";
import RoleListClient from "./RoleListClient";

export const metadata = {
  title: "Role Management - Admin",
};

export default async function RolesPage() {
  const roles = await getRoles();
  const permissions = await getPermissions();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Role Management</h1>
        <p className="text-sm text-slate-500 mt-1">
          Define roles and configure specific permissions for access control.
        </p>
      </div>

      <RoleListClient initialRoles={roles} permissions={permissions} />
    </div>
  );
}
