"use client";

import { useState, useTransition } from "react";
import { Plus, User, Mail, Shield, Edit2, Check, X, Key, Trash2 } from "lucide-react";
import { deleteStaff } from "./actions";
import { DeleteWarningModal } from "@/components/DeleteWarningModal";
import { StaffForm } from "./StaffForm";

interface Staff {
  id: string;
  username: string;
  email: string;
  password?: string;
  roleId?: string | null;
  role?: any;
  createdAt: Date;
}

export default function StaffClient({ initialStaff, availableRoles }: { initialStaff: Staff[], availableRoles: any[] }) {
  const [staffList, setStaffList] = useState<Staff[]>(initialStaff);
  const [isPending, startTransition] = useTransition();
  const [showForm, setShowForm] = useState(false);
  const [editingStaff, setEditingStaff] = useState<Staff | null>(null);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start sm:items-center justify-between flex-col sm:flex-row gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Staff Management</h1>
          <p className="text-sm text-slate-500 mt-1">Manage administrative staff accounts and permissions.</p>
        </div>
        <button
          onClick={() => {
            setEditingStaff(null);
            setShowForm(true);
          }}
          className="h-10 px-4 bg-slate-900 text-white text-sm font-medium rounded-md flex items-center justify-center gap-2 hover:bg-slate-800 transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Add Staff Member
        </button>
      </div>

      {/* Top Banner & Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200 rounded-lg px-5 py-4 shadow-sm flex items-center gap-4">
          <div className="w-10 h-10 bg-indigo-50 rounded-md flex items-center justify-center text-indigo-600 border border-indigo-100">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Staff</p>
            <p className="text-2xl font-bold text-slate-900">{staffList.length}</p>
          </div>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">

        {/* The List Data */}
        {staffList.length === 0 ? (
          <div className="p-12 text-center text-slate-400 font-medium text-sm">
            No staff members found. Add one to get started.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Username</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Email</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Role</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Created At</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {staffList.map(s => (
                  <tr key={s.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-slate-100 border border-slate-200 rounded flex items-center justify-center text-slate-600 font-semibold text-xs">
                          {s.username.charAt(0).toUpperCase()}
                        </div>
                        <span className="text-sm font-medium text-slate-900">{s.username}</span>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2 text-slate-600">
                        <Mail className="w-4 h-4 text-slate-400" />
                        <span className="text-sm">{s.email}</span>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-sm text-slate-600 font-medium">
                      {s.role ? (
                        <span className="inline-flex items-center rounded-md bg-indigo-50 px-2 py-1 text-xs font-medium text-indigo-700 ring-1 ring-inset ring-indigo-700/10">
                          {s.role.name}
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-md bg-slate-50 px-2 py-1 text-xs font-medium text-slate-600 ring-1 ring-inset ring-slate-500/10">
                          Unassigned
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-4 text-sm text-slate-600 font-medium">
                      {new Date(s.createdAt).toLocaleDateString('en-GB')}
                    </td>
                    <td className="px-4 py-4 text-right">
                      <div className="flex justify-end items-center gap-2">
                        <button 
                          onClick={() => {
                            setEditingStaff(s);
                            setShowForm(true);
                          }} 
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-indigo-600 bg-indigo-50 border border-indigo-200 rounded-md hover:bg-indigo-100 hover:border-indigo-300 transition-colors"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                          Edit
                        </button>

                          <DeleteWarningModal
                            title={`Delete Staff "${s.username}"?`}
                            description="This will permanently delete this staff account. They will no longer be able to log in to the admin panel."
                            impacts={[{ label: "Remove access to administrative tools" }, { label: "Deletion of account data" }]}
                            onConfirm={async () => {
                              startTransition(async () => {
                                try {
                                  await deleteStaff(s.id);
                                  setStaffList(prev => prev.filter(item => item.id !== s.id));
                                } catch (error: any) {
                                  alert(error.message || "Failed to delete staff.");
                                }
                              });
                            }}
                          />
                        </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showForm && (
        <StaffForm
          staff={editingStaff}
          availableRoles={availableRoles}
          onClose={() => {
            setShowForm(false);
            setEditingStaff(null);
          }}
          onSuccess={(savedStaff) => {
            if (editingStaff) {
              setStaffList(prev => prev.map(s => s.id === savedStaff.id ? savedStaff : s));
            } else {
              setStaffList(prev => [savedStaff, ...prev]);
            }
            setShowForm(false);
            setEditingStaff(null);
          }}
        />
      )}
    </div>
  );
}
