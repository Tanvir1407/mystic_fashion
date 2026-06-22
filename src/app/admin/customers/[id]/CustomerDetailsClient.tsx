"use client";

import React, { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  DollarSign,
  ShoppingBag,
  CheckCircle2,
  AlertTriangle,
  User,
  Mail,
  Phone,
  Calendar,
  MapPin,
  Eye,
  EyeOff,
  ShieldAlert,
  Loader2,
  ExternalLink
} from "lucide-react";
import { toggleCustomerStatusAction, adminChangeCustomerPasswordAction } from "../actions";
import { AdminPagination } from "@/components/AdminPagination";

interface Address {
  id: string;
  label: string;
  fullName: string;
  phone: string;
  district: string;
  address: string;
  isDefault: boolean;
  createdAt: string;
}

interface Order {
  id: string;
  status: string;
  totalAmount: number;
  advancePaid: number;
  deliveryCharge: number;
  discountAmount: number;
  createdAt: string;
}

interface CustomerDetailsClientProps {
  customer: {
    id: string;
    name: string;
    phone: string;
    address: string | null;
    email: string | null;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
    addresses: Address[];
  };
  orders: Order[];
  currentPage: number;
  totalPages: number;
  totalSpent: number;
  totalOrders: number;
  successCount: number;
  failedCount: number;
}

export default function CustomerDetailsClient({
  customer,
  orders,
  currentPage,
  totalPages,
  totalSpent,
  totalOrders,
  successCount,
  failedCount,
}: CustomerDetailsClientProps) {
  const router = useRouter();

  // Account Status Toggle State
  const [isPending, startTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState("");

  // Password Reset State
  const [newPassword, setNewPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [passwordSuccessMsg, setPasswordSuccessMsg] = useState("");
  const [passwordErrorMsg, setPasswordErrorMsg] = useState("");
  const [isPasswordPending, startPasswordTransition] = useTransition();

  const statusColor: Record<string, string> = {
    DELIVERED: "bg-emerald-50 text-emerald-700 border-emerald-100",
    PENDING: "bg-amber-50 text-amber-700 border-amber-100",
    CONFIRMED: "bg-blue-50 text-blue-700 border-blue-100",
    PACKAGING: "bg-purple-50 text-purple-700 border-purple-100",
    PRINTING: "bg-violet-50 text-violet-700 border-violet-100",
    SHIPPED: "bg-indigo-50 text-indigo-700 border-indigo-100",
    CANCELLED: "bg-rose-50 text-rose-700 border-rose-100",
    RETURNED: "bg-slate-50 text-slate-600 border-slate-100",
    HOLD: "bg-pink-50 text-pink-700 border-pink-100",
  };

  const modifyStatus = (status: string) => {
    switch (status) {
      case "PENDING":
        return "Order Placed";
      case "CONFIRMED":
        return "Confirmed";
      case "PRINTING":
        return "Printing";
      case "PACKAGING":
        return "Packaged";
      case "SHIPPED":
        return "Shipped";
      case "DELIVERED":
        return "Delivered";
      case "CANCELLED":
        return "Cancelled";
      case "RETURNED":
        return "Returned";
      case "HOLD":
        return "On Hold";
      default:
        return status;
    }
  };

  const handleStatusToggle = () => {
    setErrorMsg("");
    startTransition(async () => {
      const res = await toggleCustomerStatusAction(customer.id, !customer.isActive);
      if (res.success) {
        router.refresh();
      } else {
        setErrorMsg(res.error || "Failed to update status.");
      }
    });
  };

  const handlePasswordReset = (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordSuccessMsg("");
    setPasswordErrorMsg("");

    if (!newPassword || newPassword.length < 6) {
      setPasswordErrorMsg("Password must be at least 6 characters long.");
      return;
    }

    startPasswordTransition(async () => {
      const res = await adminChangeCustomerPasswordAction(customer.id, newPassword);
      if (res.success) {
        setPasswordSuccessMsg("Customer password updated successfully!");
        setNewPassword("");
      } else {
        setPasswordErrorMsg(res.error || "Failed to update password.");
      }
    });
  };

  return (
    <div className="space-y-6">
      {errorMsg && (
        <div className="p-4 bg-rose-50 border-l-4 border-rose-500 text-rose-700 text-xs font-semibold rounded-none flex items-center gap-2.5">
          <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0" />
          <p className="flex-1">{errorMsg}</p>
        </div>
      )}

      {/* Summary Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Card 1: LTV */}
        <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-xs flex items-center gap-4">
          <div className="w-10 h-10 bg-[#800020]/5 text-[#800020] rounded-md flex items-center justify-center">
            <DollarSign className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Lifetime Value (LTV)</p>
            <h3 className="text-xl font-bold text-slate-900 mt-0.5">৳{totalSpent.toLocaleString()}</h3>
          </div>
        </div>

        {/* Card 2: Total Orders */}
        <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-xs flex items-center gap-4">
          <div className="w-10 h-10 bg-slate-100 text-slate-600 rounded-md flex items-center justify-center">
            <ShoppingBag className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Orders</p>
            <h3 className="text-xl font-bold text-slate-900 mt-0.5">{totalOrders}</h3>
          </div>
        </div>

        {/* Card 3: Completed Orders */}
        <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-xs flex items-center gap-4">
          <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-md flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Completed Orders</p>
            <h3 className="text-xl font-bold text-slate-900 mt-0.5">{successCount}</h3>
          </div>
        </div>

        {/* Card 4: Cancelled Orders */}
        <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-xs flex items-center gap-4">
          <div className="w-10 h-10 bg-rose-50 text-rose-600 rounded-md flex items-center justify-center">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Cancelled/Returned</p>
            <h3 className="text-xl font-bold text-slate-900 mt-0.5">{failedCount}</h3>
          </div>
        </div>
      </div>

      {/* Main Content Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Left Side: General Profile & Addresses */}
        <div className="lg:col-span-1 space-y-6">

          {/* Profile Card */}
          <div className="bg-white border border-slate-200 rounded-lg p-6 shadow-xs space-y-4">
            <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-900 tracking-tight">Profile Details</h3>
              <span
                className={`inline-block px-2.5 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase border ${customer.isActive
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                  : "bg-rose-50 text-rose-700 border-rose-200"
                  }`}
              >
                {customer.isActive ? "Active" : "Suspended"}
              </span>
            </div>

            <div className="space-y-3.5 text-xs">
              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">Customer ID</span>
                <span className="font-mono text-slate-700 mt-0.5 block truncate" title={customer.id}>{customer.id}</span>
              </div>

              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">Full Name</span>
                <span className="font-semibold text-slate-800 mt-0.5 block">{customer.name}</span>
              </div>

              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">Phone Number</span>
                <span className="font-mono font-semibold text-slate-800 mt-0.5 block flex items-center gap-1.5">
                  <Phone className="w-3 h-3 text-slate-400" />
                  {customer.phone}
                </span>
              </div>

              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">Email Address</span>
                <span className="text-slate-800 mt-0.5 block flex items-center gap-1.5">
                  <Mail className="w-3 h-3 text-slate-400" />
                  {customer.email || <span className="text-slate-400 italic">Not Provided</span>}
                </span>
              </div>

              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">Registration Date</span>
                <span className="text-slate-800 mt-0.5 block flex items-center gap-1.5">
                  <Calendar className="w-3 h-3 text-slate-400" />
                  {new Date(customer.createdAt).toLocaleDateString("en-GB", {
                    day: "numeric", month: "long", year: "numeric"
                  })}
                </span>
              </div>
            </div>

            {/* Toggle Status Action */}
            <div className="pt-3 border-t border-slate-100">
              <button
                onClick={handleStatusToggle}
                disabled={isPending}
                className={`w-full py-2 px-4 text-xs font-semibold uppercase tracking-wider transition-colors border flex items-center justify-center gap-2 rounded shadow-2xs ${customer.isActive
                  ? "border-rose-200 text-rose-700 bg-white hover:bg-rose-50"
                  : "border-emerald-200 text-emerald-700 bg-white hover:bg-emerald-50"
                  }`}
              >
                {isPending ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : customer.isActive ? (
                  <>
                    <ShieldAlert className="w-3.5 h-3.5" />
                    Suspend Account
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Activate Account
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Reset Password Card */}
          <div className="bg-white border border-slate-200 rounded-lg p-6 shadow-xs space-y-4">
            <div className="border-b border-slate-100 pb-3">
              <h3 className="text-sm font-semibold text-slate-900 tracking-tight">Reset Password</h3>
            </div>

            {passwordSuccessMsg && (
              <div className="p-3 bg-emerald-50 border-l-4 border-emerald-500 text-emerald-700 text-xs font-semibold flex items-center gap-2">
                <p className="flex-1">{passwordSuccessMsg}</p>
              </div>
            )}

            {passwordErrorMsg && (
              <div className="p-3 bg-rose-50 border-l-4 border-rose-500 text-rose-700 text-xs font-semibold flex items-center gap-2">
                <p className="flex-1">{passwordErrorMsg}</p>
              </div>
            )}

            <form onSubmit={handlePasswordReset} className="space-y-3.5">
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">
                  New Password
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <ShieldAlert className="w-3.5 h-3.5" />
                  </span>
                  <input
                    type={showNewPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-9 pr-9 py-2 bg-slate-50/50 border border-slate-200 rounded text-xs text-slate-900 focus:outline-none focus:bg-white focus:border-slate-400 transition-colors"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    {showNewPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isPasswordPending}
                className="w-full py-2 px-4 bg-[#800020] hover:bg-[#600018] text-white text-xs font-semibold uppercase tracking-wider transition-colors flex items-center justify-center gap-2 rounded shadow-2xs"
              >
                {isPasswordPending ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  "Update Password"
                )}
              </button>
            </form>
          </div>

          {/* Address Book Card */}
          <div className="bg-white border border-slate-200 rounded-lg p-6 shadow-xs space-y-4">
            <div className="border-b border-slate-100 pb-3">
              <h3 className="text-sm font-semibold text-slate-900 tracking-tight">Saved Address Book</h3>
            </div>

            <div className="space-y-4 max-h-[300px] overflow-y-auto pr-1">
              {customer.addresses.map((addr) => (
                <div key={addr.id} className="p-3 bg-slate-50/50 border border-slate-100 rounded text-xs space-y-1.5 relative">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-800 capitalize bg-slate-200/50 px-2 py-0.5 rounded text-[10px]">
                      {addr.label}
                    </span>
                    {addr.isDefault && (
                      <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 px-1.5 py-0.5 rounded uppercase">
                        Default
                      </span>
                    )}
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900">{addr.fullName}</p>
                    <p className="font-mono text-slate-500 mt-0.5">{addr.phone}</p>
                  </div>
                  <div className="text-slate-600 flex items-start gap-1 mt-1 leading-relaxed">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                    <span>{addr.address}, {addr.district}</span>
                  </div>
                </div>
              ))}

              {customer.addresses.length === 0 && (
                <div className="text-center py-6 text-slate-400 text-xs font-medium space-y-1">
                  <MapPin className="w-6 h-6 text-slate-300 mx-auto" />
                  <p>No address book records found.</p>
                </div>
              )}
            </div>
          </div>

        </div>

        {/* Right Side: Order History */}
        <div className="lg:col-span-2">
          <div className="bg-white border border-slate-200 rounded-lg shadow-xs overflow-hidden">
            <div className="p-5 border-b border-slate-200 bg-slate-50/40">
              <h3 className="text-sm font-semibold text-slate-900 tracking-tight">Lifetime Order History</h3>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50">
                    <th className="px-5 py-3 font-semibold text-slate-500 uppercase tracking-wider">Order ID</th>
                    <th className="px-5 py-3 font-semibold text-slate-500 uppercase tracking-wider">Date</th>
                    <th className="px-5 py-3 font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                    <th className="px-5 py-3 font-semibold text-slate-500 uppercase tracking-wider">Total Amount</th>
                    <th className="px-5 py-3 font-semibold text-slate-500 uppercase tracking-wider text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {orders.map((order) => (
                    <tr key={order.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-5 py-4 font-mono font-semibold text-[#800020]">
                        {order.id}
                      </td>
                      <td className="px-5 py-4 text-slate-600">
                        {new Date(order.createdAt).toLocaleDateString("en-GB", {
                          day: "numeric", month: "short", year: "numeric"
                        })}
                      </td>
                      <td className="px-5 py-4">
                        <span className={`inline-block px-2.5 py-0.5 rounded text-[10px] font-semibold border uppercase ${statusColor[order.status] ?? "bg-slate-50 text-slate-600 border-slate-100"}`}>
                          {modifyStatus(order.status)}
                        </span>
                      </td>
                      <td className="px-5 py-4 font-bold text-slate-900">
                        ৳{order.totalAmount.toLocaleString()}
                      </td>
                      <td className="px-5 py-4 text-right">
                        <button
                          onClick={() => router.push(`/admin/orders/${order.id}`)}
                          className="h-7 w-7 inline-flex items-center justify-center bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 rounded transition-colors shadow-2xs"
                          title="View Order Details"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}

                  {orders.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-5 py-12 text-center text-slate-500 font-medium">
                        No orders associated with this profile.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            {orders.length > 0 && (
              <AdminPagination currentPage={currentPage} totalPages={totalPages} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
