"use client";

import { useState } from "react";
import { createStaff, updateStaff } from "./actions";
import { Loader2, X, Save } from "lucide-react";

interface StaffFormProps {
  staff?: any;
  availableRoles: any[];
  globalCommissionRate?: number;
  onClose: () => void;
  onSuccess: (savedStaff: any) => void;
}

export function StaffForm({ staff, availableRoles, globalCommissionRate = 10, onClose, onSuccess }: StaffFormProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [formData, setFormData] = useState({
    username: staff?.username || "",
    email: staff?.email || "",
    password: "",
    roleId: staff?.roleId || "",
    hasPortalAccess: staff?.hasPortalAccess ?? false,
    commissionRate: staff?.commissionRate != null ? String(staff.commissionRate) : "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const commissionRate = formData.commissionRate.trim() !== ""
      ? parseFloat(formData.commissionRate)
      : null;

    try {
      let res: any;
      if (staff) {
        const updateData: any = {
          username: formData.username,
          email: formData.email,
          roleId: formData.roleId || null,
          hasPortalAccess: formData.hasPortalAccess,
          commissionRate,
        };
        if (formData.password.trim()) {
          updateData.password = formData.password;
        }
        res = await updateStaff(staff.id, updateData);
      } else {
        if (!formData.password.trim()) {
          throw new Error("Password is required for new staff.");
        }
        res = await createStaff({
          username: formData.username,
          email: formData.email,
          password: formData.password,
          roleId: formData.roleId || undefined,
          hasPortalAccess: formData.hasPortalAccess,
          commissionRate,
        });
      }

      if (res.success) {
        onSuccess(res.data);
      } else {
        setError(res.error || "Failed to save staff member.");
      }
    } catch (err: any) {
      setError(err.message || "An error occurred.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md overflow-hidden border border-slate-200 animate-in zoom-in-95 duration-200">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">{staff ? "Edit Staff Member" : "Add Staff Member"}</h2>
            <p className="text-xs text-slate-500 mt-1">Manage staff credentials and access.</p>
          </div>
          <button onClick={onClose} type="button" className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-md transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-100 rounded-md text-red-600 text-sm flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse flex-shrink-0" />
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-700">Username</label>
              <input
                type="text"
                required
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                placeholder="Staff username"
                className="w-full text-sm px-3 py-2 border border-slate-200 rounded-md focus:border-slate-400 focus:outline-none transition-colors"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-700">Email Address</label>
              <input
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="staff@example.com"
                className="w-full text-sm px-3 py-2 border border-slate-200 rounded-md focus:border-slate-400 focus:outline-none transition-colors"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-700">Role</label>
              <select
                value={formData.roleId}
                onChange={(e) => setFormData({ ...formData, roleId: e.target.value })}
                className="w-full text-sm px-3 py-2 border border-slate-200 rounded-md focus:border-slate-400 focus:outline-none transition-colors bg-white"
              >
                <option value="">-- No Role Assigned --</option>
                {availableRoles.map(role => (
                  <option key={role.id} value={role.id}>{role.name}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-700">
                {staff ? "New Password (optional)" : "Password"}
              </label>
              <input
                type="password"
                required={!staff}
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder={staff ? "Leave blank to keep unchanged" : "••••••••"}
                className="w-full text-sm px-3 py-2 border border-slate-200 rounded-md focus:border-slate-400 focus:outline-none transition-colors"
              />
            </div>

            {/* Commission Rate */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-700">
                Commission Rate (%)
              </label>
              <input
                type="number"
                min={0}
                max={100}
                step={0.1}
                value={formData.commissionRate}
                onChange={(e) => setFormData({ ...formData, commissionRate: e.target.value })}
                placeholder={`Default: ${globalCommissionRate}%`}
                className="w-full text-sm px-3 py-2 border border-slate-200 rounded-md focus:border-slate-400 focus:outline-none transition-colors"
              />
              <p className="text-xs text-slate-400">Leave blank to use global rate ({globalCommissionRate}%)</p>
            </div>

            {/* Portal Access Checkbox */}
            <label className="flex items-center gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.hasPortalAccess}
                onChange={(e) => setFormData({ ...formData, hasPortalAccess: e.target.checked })}
                className="w-4 h-4 rounded border-slate-300 text-slate-900 focus:ring-slate-400 cursor-pointer"
              />
              <span className="text-sm text-slate-700">Staff Portal Access</span>
            </label>
          </div>

          <div className="pt-2 flex items-center gap-2">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 h-10 flex items-center justify-center gap-2 bg-slate-900 text-white text-sm font-medium rounded-md hover:bg-slate-800 transition-colors shadow-sm disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  {staff ? "Save Changes" : "Create Account"}
                </>
              )}
            </button>
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="h-10 px-4 border border-slate-200 bg-white text-slate-700 rounded-md hover:bg-slate-50 transition-colors text-sm font-medium"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
