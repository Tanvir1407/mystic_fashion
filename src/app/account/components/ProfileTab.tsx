"use client";

import { useState, useTransition } from "react";
import { Lock, Eye, EyeOff, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { changeCustomerPasswordAction } from "../../actions/customerAuth";

interface Customer {
  id: string;
  name: string;
  phone: string;
  email?: string | null;
  createdAt: string;
}

interface ProfileTabProps {
  customer: Customer;
}

export default function ProfileTab({ customer }: ProfileTabProps) {
  // Form State
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Password Visibility toggles
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // Status/Transitions
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [isPending, startTransition] = useTransition();

  // Format Date utility
  const formatDate = (isoString: string) => {
    return new Date(isoString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const handlePasswordChange = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    // Front-end validations
    if (!currentPassword) {
      setErrorMsg("Please enter your current password.");
      return;
    }
    if (newPassword.length < 6) {
      setErrorMsg("New password must be at least 6 characters long.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setErrorMsg("New passwords do not match.");
      return;
    }

    startTransition(async () => {
      const res = await changeCustomerPasswordAction({
        currentPassword,
        newPassword,
      });

      if (res.success) {
        setSuccessMsg("Password changed successfully!");
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      } else {
        setErrorMsg(res.error || "Failed to change password.");
      }
    });
  };

  return (
    <div className="space-y-10">
      {/* Account Details Section */}
      <div className="space-y-6">
        <div className="border-b border-slate-200 pb-4">
          <h2 className="text-base font-medium text-slate-900 tracking-tight">Account Details</h2>
          <p className="text-xs text-slate-400 font-light mt-0.5">
            Verify your personal profile registration details.
          </p>
        </div>

        <div className="space-y-6 max-w-2xl mt-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-6 gap-x-8">
            <div className="border-b border-slate-100 pb-4">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                Full Name
              </span>
              <p className="font-semibold text-slate-900 text-sm mt-1">{customer.name}</p>
            </div>
            <div className="border-b border-slate-100 pb-4">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                Phone Number
              </span>
              <p className="font-semibold text-slate-900 text-sm mt-1">{customer.phone}</p>
            </div>
            <div className="border-b border-slate-100 pb-4">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                Email Address
              </span>
              <p className="font-semibold text-slate-900 text-sm mt-1">{customer.email || "Not Provided"}</p>
            </div>
            <div className="border-b border-slate-100 pb-4">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                Registration Date
              </span>
              <p className="font-semibold text-slate-900 text-sm mt-1">{formatDate(customer.createdAt)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Change Password Section */}
      <div className="space-y-6 pt-6 border-t border-slate-100">
        <div className="border-b border-slate-200 pb-4">
          <h2 className="text-base font-medium text-slate-900 tracking-tight">Security</h2>
          <p className="text-xs text-slate-400 font-light mt-0.5">
            Update your account password to keep your profile secure.
          </p>
        </div>

        <div className="max-w-md">
          {/* Status Messages */}
          {errorMsg && (
            <div className="mb-5 p-3.5 bg-red-50 border-l-4 border-red-500 text-red-700 text-xs font-semibold flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
              <p className="flex-1">{errorMsg}</p>
            </div>
          )}
          {successMsg && (
            <div className="mb-5 p-3.5 bg-emerald-50 border-l-4 border-emerald-500 text-emerald-700 text-xs font-semibold flex items-center gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <p className="flex-1">{successMsg}</p>
            </div>
          )}

          <form onSubmit={handlePasswordChange} className="space-y-4">
            {/* Current Password */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 block">Current Password</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </span>
                <input
                  type={showCurrent ? "text" : "password"}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full pl-10 pr-10 h-11 bg-slate-50/50 border border-slate-200 rounded-none text-sm text-slate-950 focus:outline-none focus:bg-white focus:border-slate-950 transition-colors"
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowCurrent(!showCurrent)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 transition-colors"
                >
                  {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* New Password */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 block">New Password</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </span>
                <input
                  type={showNew ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full pl-10 pr-10 h-11 bg-slate-50/50 border border-slate-200 rounded-none text-sm text-slate-950 focus:outline-none focus:bg-white focus:border-slate-950 transition-colors"
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowNew(!showNew)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 transition-colors"
                >
                  {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Confirm New Password */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 block">Confirm New Password</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </span>
                <input
                  type={showConfirm ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full pl-10 pr-10 h-11 bg-slate-50/50 border border-slate-200 rounded-none text-sm text-slate-950 focus:outline-none focus:bg-white focus:border-slate-950 transition-colors"
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 transition-colors"
                >
                  {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={isPending}
                className="px-6 h-11 bg-[#800020] text-white text-xs font-semibold uppercase tracking-widest hover:bg-[#600018] transition-colors disabled:opacity-70 flex items-center justify-center gap-2 rounded-none pt-0.5 shadow-sm"
              >
                {isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Updating...
                  </>
                ) : (
                  "Change Password"
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

