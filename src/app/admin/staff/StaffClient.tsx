"use client";

import { useState, useTransition } from "react";
import { Plus, User, Mail, Shield, ShieldCheck, Edit2, Check, X, Key, Trash2 } from "lucide-react";
import { createStaff, updateStaff, deleteStaff } from "./actions";
import { DeleteWarningModal } from "@/components/DeleteWarningModal";

interface Staff {
  id: string;
  username: string;
  email: string;
  password?: string;
  createdAt: Date;
}

export default function StaffClient({ initialStaff }: { initialStaff: Staff[] }) {
  const [staffList, setStaffList] = useState<Staff[]>(initialStaff);
  const [isPending, startTransition] = useTransition();
  const [showAdd, setShowAdd] = useState(false);

  // New Staff Form State
  const [newUsername, setNewUsername] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");

  // Edit State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editUsername, setEditUsername] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editPassword, setEditPassword] = useState("");

  const handleAdd = () => {
    if (!newUsername.trim() || !newEmail.trim() || !newPassword.trim()) {
       return alert("Please fill in all fields.");
    }

    startTransition(async () => {
      try {
        const created = await createStaff({ 
          username: newUsername, 
          email: newEmail, 
          password: newPassword 
        });
        setStaffList(prev => [created, ...prev]);
        setShowAdd(false);
        setNewUsername("");
        setNewEmail("");
        setNewPassword("");
      } catch (error) {
        alert("Error creating staff member. Email or username may already exist.");
      }
    });
  };

  const startEdit = (s: Staff) => {
    setEditingId(s.id);
    setEditUsername(s.username);
    setEditEmail(s.email);
    setEditPassword(""); // Don't show password, only update if provided
  };

  const handleSaveEdit = (id: string) => {
    if (!editUsername.trim() || !editEmail.trim()) return alert("Username and Email are required.");

    startTransition(async () => {
      const data: any = { username: editUsername, email: editEmail };
      if (editPassword.trim()) data.password = editPassword;

      try {
        const updated = await updateStaff(id, data);
        setStaffList(prev => prev.map(s => s.id === id ? updated : s));
        setEditingId(null);
      } catch (error) {
        alert("Error updating staff member.");
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start sm:items-center justify-between flex-col sm:flex-row gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Staff Management</h1>
          <p className="text-sm text-slate-500 mt-1">Manage administrative staff accounts and permissions.</p>
        </div>
        <button
          onClick={() => setShowAdd(!showAdd)}
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
        {/* Add Row */}
        {showAdd && (
          <div className="px-4 py-4 bg-slate-50 border-b border-slate-200 grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-700">Username</label>
              <input 
                type="text" 
                value={newUsername} 
                onChange={e => setNewUsername(e.target.value)} 
                placeholder="Staff username" 
                className="w-full text-sm px-3 py-2 border border-slate-200 rounded-md focus:border-slate-400 focus:outline-none transition-colors" 
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-700">Email Address</label>
              <input 
                type="email" 
                value={newEmail} 
                onChange={e => setNewEmail(e.target.value)} 
                placeholder="staff@example.com" 
                className="w-full text-sm px-3 py-2 border border-slate-200 rounded-md focus:border-slate-400 focus:outline-none transition-colors" 
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-700">Password</label>
              <input 
                type="password" 
                value={newPassword} 
                onChange={e => setNewPassword(e.target.value)} 
                placeholder="••••••••" 
                className="w-full text-sm px-3 py-2 border border-slate-200 rounded-md focus:border-slate-400 focus:outline-none transition-colors" 
              />
            </div>
            <div className="flex gap-2">
              <button 
                disabled={isPending} 
                onClick={handleAdd} 
                className="flex-1 h-10 flex items-center justify-center gap-1.5 px-4 bg-slate-900 text-white text-sm font-medium rounded-md hover:bg-slate-800 transition-colors shadow-sm"
              >
                {isPending ? "Creating..." : "Create"}
              </button>
              <button 
                onClick={() => setShowAdd(false)} 
                className="h-10 px-4 border border-slate-200 bg-white text-slate-700 rounded-md hover:bg-slate-50 transition-colors text-sm font-medium"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

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
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Created At</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {staffList.map(s => (
                  <tr key={s.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-4 py-4">
                      {editingId === s.id ? (
                        <input 
                          type="text" 
                          value={editUsername} 
                          onChange={e => setEditUsername(e.target.value)} 
                          className="w-full text-sm px-2.5 py-1.5 border border-slate-300 rounded focus:border-slate-400 focus:outline-none transition-colors" 
                        />
                      ) : (
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-slate-100 border border-slate-200 rounded flex items-center justify-center text-slate-600 font-semibold text-xs">
                            {s.username.charAt(0).toUpperCase()}
                          </div>
                          <span className="text-sm font-medium text-slate-900">{s.username}</span>
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      {editingId === s.id ? (
                        <input 
                          type="email" 
                          value={editEmail} 
                          onChange={e => setEditEmail(e.target.value)} 
                          className="w-full text-sm px-2.5 py-1.5 border border-slate-300 rounded focus:border-slate-400 focus:outline-none transition-colors" 
                        />
                      ) : (
                        <div className="flex items-center gap-2 text-slate-600">
                          <Mail className="w-4 h-4 text-slate-400" />
                          <span className="text-sm">{s.email}</span>
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-4 text-sm text-slate-600 font-medium">
                      {editingId === s.id ? (
                        <div className="space-y-1">
                          <input 
                            type="password" 
                            value={editPassword} 
                            onChange={e => setEditPassword(e.target.value)} 
                            placeholder="New password (optional)"
                            className="w-full text-sm px-2.5 py-1.5 border border-slate-300 rounded focus:border-slate-400 focus:outline-none transition-colors" 
                          />
                        </div>
                      ) : (
                        new Date(s.createdAt).toLocaleDateString('en-GB')
                      )}
                    </td>
                    <td className="px-4 py-4 text-right">
                      {editingId === s.id ? (
                        <div className="flex justify-end gap-1.5">
                          <button 
                            disabled={isPending} 
                            onClick={() => handleSaveEdit(s.id)} 
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-600 bg-emerald-50 border border-emerald-200 rounded-md hover:bg-emerald-100 hover:border-emerald-300 transition-colors"
                          >
                            <Check className="w-3.5 h-3.5" />
                            Save
                          </button>
                          <button 
                            onClick={() => setEditingId(null)} 
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-600 bg-slate-50 border border-slate-200 rounded-md hover:bg-slate-100 hover:border-slate-300 transition-colors"
                          >
                            <X className="w-3.5 h-3.5" />
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <div className="flex justify-end items-center gap-2">
                          <button 
                            onClick={() => startEdit(s)} 
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
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}
