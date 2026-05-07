"use client";

import { useState, useTransition } from "react";
import { Plus, Edit2, Shield, Users, Award } from "lucide-react";
import RoleForm from "./RoleForm";
import { deleteRole } from "./actions";
import { DeleteWarningModal } from "@/components/DeleteWarningModal";

export default function RoleListClient({ initialRoles, permissions }: any) {
  const [roles, setRoles] = useState(initialRoles);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<any>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <div className="space-y-6">
      {/* Metrics Banner */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white border border-slate-200 rounded-lg px-5 py-4 shadow-sm flex items-center gap-4">
          <div className="w-10 h-10 bg-indigo-50 rounded-md flex items-center justify-center text-indigo-600 border border-indigo-100 shrink-0">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Configured Roles</p>
            <p className="text-2xl font-bold text-slate-900">{roles.length}</p>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg px-5 py-4 shadow-sm flex items-center gap-4">
          <div className="w-10 h-10 bg-amber-50 rounded-md flex items-center justify-center text-amber-600 border border-amber-100 shrink-0">
            <Award className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Active Policies</p>
            <p className="text-2xl font-bold text-slate-900">
              {roles.reduce((acc: number, r: any) => acc + r.permissions.length, 0)}
            </p>
          </div>
        </div>
      </div>

      {/* Main List Section */}
      <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
        <div className="px-5 py-4 flex justify-between items-center border-b border-slate-100 bg-slate-50/70">
          <div>
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Access Control Roles</h3>
            <p className="text-xs text-slate-500 mt-0.5">Assigned roles and their system-wide capabilities.</p>
          </div>
          <button
            onClick={() => {
              setEditingRole(null);
              setIsFormOpen(true);
            }}
            className="h-9 px-4 bg-slate-900 text-white text-xs font-semibold rounded-md flex items-center justify-center gap-2 hover:bg-slate-800 transition-colors shadow-sm uppercase tracking-wider"
          >
            <Plus className="h-3.5 w-3.5" />
            Add Role
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Role Name</th>
                <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Description</th>
                <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Permissions</th>
                <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Users</th>
                <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {roles.map((role: any) => (
                <tr key={role.id} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-slate-100 border border-slate-200 rounded flex items-center justify-center text-slate-600 font-semibold text-xs">
                        {role.name.charAt(0).toUpperCase()}
                      </div>
                      <span className="text-sm font-semibold text-slate-900">{role.name}</span>
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <span className="text-sm text-slate-500">{role.description || "No description provided."}</span>
                  </td>
                  <td className="px-5 py-4 whitespace-nowrap">
                    <span className="inline-flex items-center rounded-md bg-indigo-50 px-2.5 py-1 text-xs font-medium text-indigo-700 ring-1 ring-inset ring-indigo-700/10">
                      {role.permissions.length} Policies
                    </span>
                  </td>
                  <td className="px-5 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2 text-slate-600">
                      <Users className="h-4 w-4 text-slate-400" />
                      <span className="text-sm font-medium">{role._count.staff + role._count.admins} Active</span>
                    </div>
                  </td>
                  <td className="px-5 py-4 text-right whitespace-nowrap">
                    <div className="flex justify-end items-center gap-2">
                      <button
                        onClick={() => {
                          setEditingRole(role);
                          setIsFormOpen(true);
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-indigo-600 bg-indigo-50 border border-indigo-200 rounded-md hover:bg-indigo-100 hover:border-indigo-300 transition-colors"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                        Edit
                      </button>

                      {role.name !== "SUPERADMIN" && (
                        <DeleteWarningModal
                          title={`Delete Role "${role.name}"?`}
                          description="This will permanently delete this role. All associated staff members will lose access until reassigned."
                          impacts={[
                            { label: "Revoke all associated permissions" },
                            { label: "De-associate roles from any connected staff accounts" }
                          ]}
                          onConfirm={async () => {
                            startTransition(async () => {
                              try {
                                await deleteRole(role.id);
                                setRoles((prev: any[]) => prev.filter((r) => r.id !== role.id));
                              } catch (error: any) {
                                alert(error.message || "Failed to delete role.");
                              }
                            });
                          }}
                        />
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {roles.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-5 py-12 text-center text-slate-400 font-medium text-sm">
                    No configured roles found. Create one to get started.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Role Form Modal Overlay */}
      {isFormOpen && (
        <RoleForm
          role={editingRole}
          permissions={permissions}
          onClose={() => {
            setIsFormOpen(false);
            setEditingRole(null);
            // Refresh local state to ensure updates are reflected
            window.location.reload();
          }}
        />
      )}
    </div>
  );
}
