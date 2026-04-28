"use client";

import type { OrderStatus } from "@/generated/prisma/client";
import { updateOrderStatus } from "../actions";
import { useState, useEffect } from "react";
import Link from "next/link";
import { Eye, Trash2 } from "lucide-react";
import { deleteOrder } from "../actions";
import { useRouter } from "next/navigation";
import { StatusAlertModal } from "@/components/StatusAlertModal";
import { formatDate } from "@/utils/formatDate";

export default function OrderRowClient({
  order,
  items,
  isSelected,
  onSelect
}: {
  order: any,
  items: any[],
  isSelected?: boolean,
  onSelect?: () => void
}) {
  const [status, setStatus] = useState<OrderStatus>(order.status);
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState<{ isOpen: boolean; title: string; message: string; type: "error" | "warning" }>({
    isOpen: false,
    title: "",
    message: "",
    type: "error"
  });
  const router = useRouter();

  useEffect(() => {
    setStatus(order.status);
  }, [order.status]);

  const handleStatusChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newStatus = e.target.value as OrderStatus;
    const oldStatus = status;

    // Validate Status Transitions -> Must be CONFIRMED before Packaging, Shipped, etc.
    if (oldStatus === "PENDING" && ["PACKAGING", "SHIPPED", "DELIVERED"].includes(newStatus)) {
      setAlert({
        isOpen: true,
        title: "Action Restricted",
        message: "A Pending order must be 'Confirmed' before it can be marked as Packaging, Shipped, or Delivered.",
        type: "warning"
      });
      // React controlled component will snap back naturally since `status` state didn't change
      return;
    }

    if (oldStatus === "CANCELLED" && ["PENDING", "CONFIRMED", "PACKAGING", "SHIPPED", "DELIVERED"].includes(newStatus)) {
      setAlert({
        isOpen: true,
        title: "Action Restricted",
        message: "A Cancelled order can only be marked as 'Confirmed' if you wish to reactivate it.",
        type: "warning"
      });
      return;
    }

    setStatus(newStatus);
    setLoading(true);
    const result = await updateOrderStatus(order.id, newStatus);
    if (!result?.success) {
      setAlert({
        isOpen: true,
        title: "Status Update Restricted",
        message: result?.error || "We encountered an issue while attempting to update the order status. Please verify the transition rules and try again.",
        type: "error"
      });
      setStatus(oldStatus);
    }
    setLoading(false);
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this order? This action cannot be undone.")) return;

    setLoading(true);
    const result = await deleteOrder(order.id);
    if (result.success) {
      router.refresh();
    } else {
      alert(result.error || "Failed to delete order");
      setLoading(false);
    }
  };

  return (
    <tr className="hover:bg-slate-50/50 transition-colors group">
      <td className="px-6 py-4">
        <input
          type="checkbox"
          checked={isSelected || false}
          onChange={onSelect}
          className="rounded border-slate-300 text-indigo-600 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 cursor-pointer"
        />
      </td>
      <td className="px-2 py-4">

        <div className="flex flex-col">
          <span className="font-medium text-sm text-slate-900">
            {order.id}

          </span>
          <span className="text-xs text-slate-500 mt-0.5">{formatDate(order.createdAt)}</span>
        </div>

      </td>
      <td className="px-2 py-4">
        <div className="flex flex-col">
          <span className="font-medium text-sm text-slate-900">{order.customerName}</span>
          <span className="text-xs text-slate-500 mt-0.5">{order.phone}</span>
        </div>
      </td>
      <td className="px-2 py-4">
        <div className="flex flex-col items-start gap-1">
          <span className="text-sm text-slate-600 max-w-[250px] truncate" title={order.address}>{order.address}</span>
          <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider">{order.district}</span>
        </div>
      </td>
      <td className="px-2 py-4">
        <div className="flex flex-col gap-0.5">
          {items.map((item) => (
            <div key={item.id} className="text-xs font-medium text-slate-600">
              <span className="text-slate-400">{item.quantity}x</span> {item.product.name} <span className="font-bold text-[#800020]">({item.size})</span>
            </div>
          ))}
        </div>
      </td>
      <td className="px-2 py-4 text-sm text-slate-900 font-mono font-medium">
        ৳{order.advancePaid.toLocaleString("en-IN")}
      </td>
      <td className="px-2 py-4 text-sm text-red-600 font-mono font-medium">
        ৳{(order.totalAmount - order.advancePaid).toLocaleString("en-IN")}
      </td>
      <td className="px-2 py-4 text-sm text-slate-900 font-mono font-medium">
        ৳{order.totalAmount.toLocaleString("en-IN")}
      </td>
      <td className="px-2 py-4 text-right">
        <select
          value={status}
          onChange={handleStatusChange}
          disabled={loading}
          className={`w-32 text-[11px] font-black uppercase tracking-wider px-2 py-1.5 rounded-md border transition-all cursor-pointer outline-none focus:ring-2 focus:ring-opacity-50 ${status === "PENDING" ? "bg-amber-50 text-amber-700 border-amber-200 focus:ring-amber-500" :
            status === "CONFIRMED" ? "bg-blue-50 text-blue-700 border-blue-200 focus:ring-blue-500" :
              status === "PACKAGING" ? "bg-purple-50 text-purple-700 border-purple-200 focus:ring-purple-500" :
                status === "SHIPPED" ? "bg-indigo-50 text-indigo-700 border-indigo-200 focus:ring-indigo-500" :
                  status === "DELIVERED" ? "bg-green-50 text-green-700 border-green-200 focus:ring-green-500" :
                    "bg-red-50 text-red-700 border-red-200 focus:ring-red-500"
            }`}
        >
          <option value="PENDING" disabled={status === "CANCELLED" || status === "CONFIRMED" || status === "PACKAGING" || status === "SHIPPED" || status === "DELIVERED"}>Pending</option>
          <option value="CONFIRMED" disabled={status === "CANCELLED"}>Confirmed</option>
          <option value="PACKAGING" disabled={status === "PENDING" || status === "CANCELLED"}>Packaging</option>
          <option value="SHIPPED" disabled={status === "PENDING" || status === "CANCELLED"}>Shipped</option>
          <option value="DELIVERED" disabled={status === "PENDING" || status === "CANCELLED"}>Delivered</option>
          <option value="CANCELLED">Cancelled</option>
        </select>
      </td>
      <td className="px-2 py-4 text-right">
        <div className="flex items-center justify-end gap-2">
          <Link
            href={`/admin/orders/${order.id}`}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-indigo-600 bg-indigo-50 border border-indigo-200 rounded-md hover:bg-indigo-100 hover:border-indigo-300 transition-colors"
          >
            <Eye className="w-4 h-4" />
            View
          </Link>
          <button
            onClick={handleDelete}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-red-600 bg-red-50 border border-red-200 rounded-md hover:bg-red-100 hover:border-red-300 transition-colors disabled:opacity-50"
          >
            <Trash2 className="w-4 h-4" />
            Delete
          </button>
        </div>
      </td>
      <StatusAlertModal
        isOpen={alert.isOpen}
        onClose={() => setAlert({ ...alert, isOpen: false })}
        title={alert.title}
        message={alert.message}
        type={alert.type}
      />
    </tr>
  );
}
