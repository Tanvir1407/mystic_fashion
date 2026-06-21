"use client";

import { useState, useTransition } from "react";
import { Plus, Mail, Shield, Edit2, TrendingUp, Users, BarChart2 } from "lucide-react";
import { deleteStaff } from "./actions";
import { DeleteWarningModal } from "@/components/DeleteWarningModal";
import { StaffForm } from "./StaffForm";
import Link from "next/link";

interface Staff {
  id: string;
  username: string;
  email: string;
  password?: string;
  roleId?: string | null;
  role?: any;
  createdAt: Date;
  _count?: {
    orders: number;
  };
}

const AVATAR_COLORS = [
  "bg-violet-100 text-violet-700",
  "bg-sky-100 text-sky-700",
  "bg-emerald-100 text-emerald-700",
  "bg-rose-100 text-rose-700",
  "bg-amber-100 text-amber-700",
  "bg-indigo-100 text-indigo-700",
];

function getAvatarColor(name: string) {
  const idx = name.charCodeAt(0) % AVATAR_COLORS.length;
  return AVATAR_COLORS[idx];
}

export default function StaffClient({
  initialStaff,
  availableRoles,
  globalCommissionRate = 10,
}: {
  initialStaff: Staff[];
  availableRoles: any[];
  globalCommissionRate?: number;
}) {
  const [staffList, setStaffList] = useState<Staff[]>(initialStaff);
  const [, startTransition] = useTransition();
  const [showForm, setShowForm] = useState(false);
  const [editingStaff, setEditingStaff] = useState<Staff | null>(null);

  const totalOrders = staffList.reduce((sum, s) => sum + (s._count?.orders || 0), 0);

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Staff</h1>
          <p className="text-sm text-slate-400 mt-0.5">Manage team accounts and permissions.</p>
        </div>
        <button
          onClick={() => { setEditingStaff(null); setShowForm(true); }}
          className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 text-white text-sm font-medium rounded-lg hover:bg-slate-800 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Member
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white border border-slate-100 rounded-xl p-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-slate-50 flex items-center justify-center border border-slate-100">
            <Users className="w-4 h-4 text-slate-500" />
          </div>
          <div>
            <p className="text-[11px] text-slate-400 font-medium">Total Staff</p>
            <p className="text-xl font-bold text-slate-900 leading-tight">{staffList.length}</p>
          </div>
        </div>
        <div className="bg-white border border-slate-100 rounded-xl p-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-slate-50 flex items-center justify-center border border-slate-100">
            <Shield className="w-4 h-4 text-slate-500" />
          </div>
          <div>
            <p className="text-[11px] text-slate-400 font-medium">With Role</p>
            <p className="text-xl font-bold text-slate-900 leading-tight">
              {staffList.filter(s => s.role).length}
            </p>
          </div>
        </div>
        <div className="bg-white border border-slate-100 rounded-xl p-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-slate-50 flex items-center justify-center border border-slate-100">
            <BarChart2 className="w-4 h-4 text-slate-500" />
          </div>
          <div>
            <p className="text-[11px] text-slate-400 font-medium">Total Orders</p>
            <p className="text-xl font-bold text-slate-900 leading-tight">{totalOrders}</p>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-100 rounded-xl overflow-hidden">
        {staffList.length === 0 ? (
          <div className="py-20 text-center">
            <div className="w-12 h-12 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center mx-auto mb-3">
              <Users className="w-5 h-5 text-slate-300" />
            </div>
            <p className="text-sm font-medium text-slate-400">No staff members yet.</p>
            <p className="text-xs text-slate-300 mt-1">Add your first team member to get started.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="px-5 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Member</th>
                  <th className="px-5 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Role</th>
                  <th className="px-5 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider text-center">Orders</th>
                  <th className="px-5 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Joined</th>
                  <th className="px-5 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {staffList.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50/60 transition-colors">
                    {/* Member */}
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${getAvatarColor(s.username)}`}>
                          {s.username.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-slate-800 truncate">{s.username}</p>
                          <p className="text-xs text-slate-400 truncate flex items-center gap-1 mt-0.5">
                            <Mail className="w-3 h-3 flex-shrink-0" />
                            {s.email}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* Role */}
                    <td className="px-5 py-3.5">
                      {s.role ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-slate-100 text-slate-600 text-xs font-medium">
                          <Shield className="w-3 h-3" />
                          {s.role.name}
                        </span>
                      ) : (
                        <span className="text-xs text-slate-300 font-medium">Unassigned</span>
                      )}
                    </td>

                    {/* Orders */}
                    <td className="px-5 py-3.5 text-center">
                      <span className="text-sm font-semibold text-slate-700">
                        {s._count?.orders || 0}
                      </span>
                    </td>

                    {/* Joined */}
                    <td className="px-5 py-3.5">
                      <span className="text-xs text-slate-400 font-medium">
                        {new Date(s.createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="px-5 py-3.5">
                      <div className="flex items-center justify-end gap-1.5">
                        <Link
                          href={`/admin/staff/${s.id}`}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-colors"
                        >
                          <TrendingUp className="w-3.5 h-3.5" />
                          Stats
                        </Link>
                        <button
                          onClick={() => { setEditingStaff(s); setShowForm(true); }}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-colors"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                          Edit
                        </button>
                        <DeleteWarningModal
                          title={`Delete "${s.username}"?`}
                          description="This will permanently delete this staff account and revoke all access."
                          impacts={[
                            { label: "Remove access to admin panel" },
                            { label: "Account data will be deleted" },
                          ]}
                          onConfirm={async () => {
                            startTransition(async () => {
                              try {
                                const res = await deleteStaff(s.id);
                                if (res.success) {
                                  setStaffList((prev) => prev.filter((item) => item.id !== s.id));
                                } else {
                                  alert(res.error || "Failed to delete staff.");
                                }
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

      {/* Form Modal */}
      {showForm && (
        <StaffForm
          staff={editingStaff}
          availableRoles={availableRoles}
          globalCommissionRate={globalCommissionRate}
          onClose={() => { setShowForm(false); setEditingStaff(null); }}
          onSuccess={(savedStaff) => {
            if (editingStaff) {
              setStaffList((prev) => prev.map((s) => (s.id === savedStaff.id ? savedStaff : s)));
            } else {
              setStaffList((prev) => [savedStaff, ...prev]);
            }
            setShowForm(false);
            setEditingStaff(null);
          }}
        />
      )}
    </div>
  );
}
