"use client";

import { useState } from "react";
import { createStaff, updateStaff } from "./actions";
import { Loader2, X, User, Mail, Shield, Lock, Percent } from "lucide-react";

interface StaffFormProps {
  staff?: any;
  availableRoles: any[];
  globalCommissionRate?: number;
  onClose: () => void;
  onSuccess: (savedStaff: any) => void;
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-semibold text-slate-600">{label}</label>
      {children}
      {hint && <p className="text-[11px] text-slate-400">{hint}</p>}
    </div>
  );
}

export function StaffForm({
  staff,
  availableRoles,
  globalCommissionRate = 10,
  onClose,
  onSuccess,
}: StaffFormProps) {
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

  const set = (key: string, val: any) => setFormData((prev) => ({ ...prev, [key]: val }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const commissionRate =
      formData.commissionRate.trim() !== "" ? parseFloat(formData.commissionRate) : null;

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
        if (formData.password.trim()) updateData.password = formData.password;
        res = await updateStaff(staff.id, updateData);
      } else {
        if (!formData.password.trim()) throw new Error("Password is required.");
        res = await createStaff({
          username: formData.username,
          email: formData.email,
          password: formData.password,
          roleId: formData.roleId || undefined,
          hasPortalAccess: formData.hasPortalAccess,
          commissionRate,
        });
      }

      if (res.success) onSuccess(res.data);
      else setError(res.error || "Failed to save.");
    } catch (err: any) {
      setError(err.message || "An error occurred.");
    } finally {
      setLoading(false);
    }
  };

  const inputCls =
    "w-full text-sm px-3 py-2 border border-slate-200 rounded-lg bg-white focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-100 transition-all placeholder:text-slate-300";

  return (
    <div className="fixed inset-0 bg-black/20 backdrop-blur-[2px] z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-lg w-full max-w-md border border-slate-100 overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              {staff ? "Edit Member" : "Add Member"}
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              {staff ? "Update credentials and access level." : "Create a new staff account."}
            </p>
          </div>
          <button
            onClick={onClose}
            type="button"
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-100 rounded-lg text-red-600 text-xs font-medium">
              {error}
            </div>
          )}

          <Field label="Username">
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-300" />
              <input
                type="text"
                required
                value={formData.username}
                onChange={(e) => set("username", e.target.value)}
                placeholder="e.g. john_doe"
                className={`${inputCls} pl-9`}
              />
            </div>
          </Field>

          <Field label="Email Address">
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-300" />
              <input
                type="email"
                required
                value={formData.email}
                onChange={(e) => set("email", e.target.value)}
                placeholder="staff@example.com"
                className={`${inputCls} pl-9`}
              />
            </div>
          </Field>

          <Field label="Role">
            <div className="relative">
              <Shield className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-300" />
              <select
                value={formData.roleId}
                onChange={(e) => set("roleId", e.target.value)}
                className={`${inputCls} pl-9 cursor-pointer`}
              >
                <option value="">No role assigned</option>
                {availableRoles.map((role) => (
                  <option key={role.id} value={role.id}>
                    {role.name}
                  </option>
                ))}
              </select>
            </div>
          </Field>

          <Field
            label={staff ? "New Password" : "Password"}
            hint={staff ? "Leave blank to keep current password." : undefined}
          >
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-300" />
              <input
                type="password"
                required={!staff}
                value={formData.password}
                onChange={(e) => set("password", e.target.value)}
                placeholder={staff ? "Leave blank to keep unchanged" : "••••••••"}
                className={`${inputCls} pl-9`}
              />
            </div>
          </Field>

          <Field
            label="Commission Rate (%)"
            hint={`Leave blank to use global rate (${globalCommissionRate}%)`}
          >
            <div className="relative">
              <Percent className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-300" />
              <input
                type="number"
                min={0}
                max={100}
                step={0.1}
                value={formData.commissionRate}
                onChange={(e) => set("commissionRate", e.target.value)}
                placeholder={`Default: ${globalCommissionRate}%`}
                className={`${inputCls} pl-9`}
              />
            </div>
          </Field>

          {/* Portal Access */}
          <label className="flex items-center gap-3 py-2 cursor-pointer group">
            <div className="relative flex-shrink-0">
              <input
                type="checkbox"
                checked={formData.hasPortalAccess}
                onChange={(e) => set("hasPortalAccess", e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-slate-200 peer-checked:bg-slate-800 rounded-full transition-colors" />
              <div className="absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-transform peer-checked:translate-x-4" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-700">Staff Portal Access</p>
              <p className="text-[11px] text-slate-400">Allow login to staff-facing portal</p>
            </div>
          </label>

          {/* Buttons */}
          <div className="flex gap-2 pt-1 border-t border-slate-100 mt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 h-10 border border-slate-200 text-slate-600 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 h-10 flex items-center justify-center gap-2 bg-slate-900 text-white rounded-lg text-sm font-medium hover:bg-slate-800 transition-colors disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                staff ? "Save Changes" : "Create Account"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
