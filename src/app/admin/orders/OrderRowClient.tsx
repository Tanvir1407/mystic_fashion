"use client";

import { updateOrderStatus, deleteOrder, restoreOrder } from "./actions";
import { validateStatusTransition } from "@/lib/utils";
import { useState, useEffect } from "react";
import Link from "next/link";
import { Eye, Trash2, RotateCcw } from "lucide-react";
import { useRouter } from "next/navigation";
import { StatusAlertModal } from "@/components/StatusAlertModal";
import { HoldReasonModal } from "@/components/HoldReasonModal";
import { formatDateTime } from "@/utils/formatDate";
import { formatBDT } from "@/utils/formatPrice";
import type { OrderStatus } from "@/generated/prisma/client";

const STATUS_LABELS: Record<OrderStatus, string> = {
  PENDING: "Placed",
  CONFIRMED: "Confirmed",
  PRINTING: "Printing",
  PACKAGING: "Packaged",
  SHIPPED: "Shipped",
  DELIVERED: "Delivered",
  RETURNED: "Returned",
  CANCELLED: "Cancelled",
  HOLD: "On Hold",
};

export default function OrderRowClient({
  order,
  items,
  isSelected,
  onSelect,
  canEdit,
  canDelete
}: {
  order: any,
  items: any[],
  isSelected?: boolean,
  onSelect?: () => void,
  canEdit: boolean,
  canDelete: boolean
}) {
  const [status, setStatus] = useState<OrderStatus>(order.status);
  const [isHoldModalOpen, setIsHoldModalOpen] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<OrderStatus | null>(null);
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

    if (newStatus === "RETURNED") {
      router.push(`/admin/odr_returns?orderId=${order.id}`);
      return;
    }

    if (newStatus === "HOLD") {
      setPendingStatus(newStatus);
      setIsHoldModalOpen(true);
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

  const handleHoldConfirm = async (reason: string) => {
    if (!pendingStatus) return;
    const oldStatus = status;
    setStatus(pendingStatus);
    setLoading(true);
    const result = await updateOrderStatus(order.id, pendingStatus, reason);
    if (!result?.success) {
      setAlert({
        isOpen: true,
        title: "Status Update Restricted",
        message: result?.error || "We encountered an issue while attempting to update the order status.",
        type: "error"
      });
      setStatus(oldStatus);
    } else {
      router.refresh();
    }
    setLoading(false);
    setIsHoldModalOpen(false);
    setPendingStatus(null);
  };

  const handleHoldClose = () => {
    setIsHoldModalOpen(false);
    setPendingStatus(null);
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to move this order to Trash?")) return;

    setLoading(true);
    const result = await deleteOrder(order.id);
    if (result.success) {
      router.refresh();
    } else {
      setAlert({
        isOpen: true,
        title: "Deletion Failed",
        message: result.error || "Failed to delete order",
        type: "error"
      });
      setLoading(false);
    }
  };

  const handleRestore = async () => {
    setLoading(true);
    const result = await restoreOrder(order.id);
    if (result.success) {
      router.refresh();
    } else {
      setAlert({
        isOpen: true,
        title: "Restore Failed",
        message: result.error || "Failed to restore order",
        type: "error"
      });
      setLoading(false);
    }
  };

  const getPostShipmentTag = () => {
    const postShippedStatuses: OrderStatus[] = ["SHIPPED", "DELIVERED", "RETURNED"];
    if (!postShippedStatuses.includes(status)) return null;

    // Exchange: either this IS an exchange order, or this order HAS exchange orders
    if (order.isExchange || (order.exchangeOrders && order.exchangeOrders.length > 0)) {
      return "EXCHANGE";
    }

    // Return check
    if (order.salesReturns && order.salesReturns.length > 0) {
      const totalQty = (order.items || items || []).reduce(
        (sum: number, i: any) => sum + i.quantity, 0
      );
      const returnedQty = order.salesReturns.reduce(
        (sum: number, r: any) => sum + r.quantity, 0
      );
      if (returnedQty >= totalQty) return "FULL_RETURN";
      return "PARTIAL_RETURN";
    }

    if (status === "DELIVERED") return "DELIVERED";
    return null;
  };

  const postShipmentTag = getPostShipmentTag();

  const TAG_CONFIG = {
    EXCHANGE: { label: "Exchange", className: "bg-orange-50 text-orange-700 border-orange-200" },
    FULL_RETURN: { label: "Full Return", className: "bg-rose-50 text-rose-700 border-rose-200" },
    PARTIAL_RETURN: { label: "Partial Return", className: "bg-yellow-50 text-yellow-700 border-yellow-200" },
    DELIVERED: { label: "Delivered", className: "bg-green-50 text-green-700 border-green-200" },
  };

  return (
    <tr className="hover:bg-slate-50/50 transition-colors group">
      <td className="px-3 py-2.5">
        <input
          type="checkbox"
          checked={isSelected || false}
          onChange={onSelect}
          className="rounded border-slate-300 text-indigo-600 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 cursor-pointer"
        />
      </td>
      <td className="px-2 py-2.5">

        <div className="flex flex-col gap-1">
          <span className="font-medium text-sm text-slate-900">
            {order.id}

          </span>
          <div className="flex flex-col items-start gap-1">
            <span className="text-[10px] text-slate-500 font-semibold">{formatDateTime(order.createdAt)}</span>
            {order.orderSource === "eCommerce" ? (
              <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 text-[10px] font-bold px-1.5 py-0.5 rounded border border-emerald-100 uppercase tracking-wider">
                🌐 eCommerce
              </span>
            ) : (
              <div className="flex flex-col items-start gap-0.5">
                <span className="inline-flex items-center gap-1 bg-violet-50 text-violet-700 text-[10px] font-bold px-1.5 py-0.5 rounded border border-violet-100 uppercase tracking-wider">
                  {order.createdBy?.username ? `👤 ${order.createdBy.username}` : "👤 Salesman"}
                </span>
              </div>
            )}
          </div>
        </div>

      </td>
      <td className="px-2 py-2.5">
        <div className="flex flex-col">
          <span className="font-medium text-sm text-slate-900">{order.customerName}</span>
          <span className="text-xs text-slate-500 mt-0.5">{order.phone}</span>
          {order.tags && order.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1.5">
              {order.tags.map((tag: string) => (
                <span
                  key={tag}
                  className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-slate-50 text-slate-600 border border-slate-200/60"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
      </td>
      <td className="px-2 py-2.5">
        <div className="flex flex-col items-start gap-1">
          <span className="text-sm text-slate-600 max-w-[250px] truncate" title={order.address}>{order.address}</span>
          <div className="flex items-center gap-2">
            <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider">{order.district}</span>          {postShipmentTag && TAG_CONFIG[postShipmentTag] && (
              <span className={`inline-flex text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded border whitespace-nowrap ${TAG_CONFIG[postShipmentTag].className}`}>
                {TAG_CONFIG[postShipmentTag].label}
              </span>
            )}
          </div>
        </div>
      </td>
      <td className="px-2 py-2.5">
        <div className="flex flex-col gap-0.5">
          {items.map((item) => (
            <div key={item.id} className="text-xs font-medium text-slate-600">
              <span className="text-slate-400">{item.quantity}x</span> {item.product.name} <span className="font-bold text-[#800020]">({item.size})</span>
            </div>
          ))}
        </div>
      </td>
      <td className="px-2 py-2.5 text-sm text-emerald-600 font-mono font-medium">
        {formatBDT(order.advancePaid)}
      </td>
      <td className="px-2 py-2.5 text-sm text-red-600 font-mono font-medium">
        {formatBDT(order.totalAmount - order.advancePaid)}
      </td>
      <td className="px-2 py-2.5 text-sm text-slate-900 font-mono font-medium">
        {formatBDT(order.totalAmount)}
      </td>
      <td className="px-2 py-2.5 text-right">
        <div className="inline-flex flex-col items-end relative">
          {canEdit ? (
            <select
              value={status}
              onChange={handleStatusChange}
              disabled={loading || status === "CANCELLED" || status === "RETURNED"}
              className={`w-32 text-[11px] font-black uppercase tracking-wider px-2 py-1.5 rounded-md border transition-all cursor-pointer outline-none focus:ring-2 focus:ring-opacity-50 ${status === "PENDING" ? "bg-amber-50 text-amber-700 border-amber-200 focus:ring-amber-500" :
                status === "CONFIRMED" ? "bg-blue-50 text-blue-700 border-blue-200 focus:ring-blue-500" :
                  status === "PRINTING" ? "bg-cyan-50 text-cyan-700 border-cyan-200 focus:ring-cyan-500" :
                    status === "PACKAGING" ? "bg-purple-50 text-purple-700 border-purple-200 focus:ring-purple-500" :
                      status === "SHIPPED" ? "bg-indigo-50 text-indigo-700 border-indigo-200 focus:ring-indigo-500" :
                        status === "DELIVERED" ? "bg-green-50 text-green-700 border-green-200 focus:ring-green-500" :
                          status === "RETURNED" ? "bg-rose-50 text-rose-700 border-rose-200 focus:ring-rose-500" :
                            status === "HOLD" ? "bg-pink-50 text-pink-700 border-pink-200 focus:ring-pink-500" :
                              "bg-red-50 text-red-700 border-red-200 focus:ring-red-500"
                }`}
            >
              <option value="PENDING" disabled={!validateStatusTransition(status, "PENDING").isValid}>Placed</option>
              <option value="CONFIRMED" disabled={!validateStatusTransition(status, "CONFIRMED").isValid}>Confirmed</option>
              <option value="PRINTING" disabled={!validateStatusTransition(status, "PRINTING").isValid}>Printing</option>
              <option value="PACKAGING" disabled={!validateStatusTransition(status, "PACKAGING").isValid}>Packaged</option>
              <option value="SHIPPED" disabled={!validateStatusTransition(status, "SHIPPED").isValid}>Shipped</option>
              <option value="DELIVERED" disabled={!validateStatusTransition(status, "DELIVERED").isValid}>Delivered</option>
              <option value="HOLD" disabled={!validateStatusTransition(status, "HOLD").isValid}>On Hold</option>
              <option value="RETURNED" disabled={!validateStatusTransition(status, "RETURNED").isValid}>Returned</option>
              <option value="CANCELLED" disabled={!validateStatusTransition(status, "CANCELLED").isValid}>Cancelled</option>
            </select>
          ) : (
            <span className={`inline-flex w-32 justify-center text-[11px] font-black uppercase tracking-wider px-2 py-1.5 rounded-md border ${status === "PENDING" ? "bg-amber-50 text-amber-700 border-amber-200" :
              status === "CONFIRMED" ? "bg-blue-50 text-blue-700 border-blue-200" :
                status === "PRINTING" ? "bg-cyan-50 text-cyan-700 border-cyan-200" :
                  status === "PACKAGING" ? "bg-purple-50 text-purple-700 border-purple-200" :
                    status === "SHIPPED" ? "bg-indigo-50 text-indigo-700 border-indigo-200" :
                      status === "DELIVERED" ? "bg-green-50 text-green-700 border-green-200" :
                        status === "RETURNED" ? "bg-rose-50 text-rose-700 border-rose-200" :
                          status === "HOLD" ? "bg-pink-50 text-pink-700 border-pink-200" :
                            "bg-red-50 text-red-700 border-red-200"
              }`}>
              {STATUS_LABELS[status] || status}
            </span>
          )}

        </div>
      </td>
      <td className="px-2 py-2.5 text-right">
        <div className="flex flex-col items-end gap-2">

          <div className="flex items-center justify-end gap-2">
            {order.deletedAt ? (
              <button
                onClick={handleRestore}
                disabled={loading}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-md hover:bg-indigo-100 hover:border-indigo-300 transition-colors disabled:opacity-50"
              >
                <RotateCcw className="w-4 h-4" />
                Restore
              </button>
            ) : (
              <>
                <Link
                  href={`/admin/orders/${order.id}`}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-indigo-600 bg-indigo-50 border border-indigo-200 rounded-md hover:bg-indigo-100 hover:border-indigo-300 transition-colors"
                >
                  <Eye className="w-4 h-4" />
                  View
                </Link>
                {canDelete && (
                  <button
                    onClick={handleDelete}
                    disabled={loading}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-red-600 bg-red-50 border border-red-200 rounded-md hover:bg-red-100 hover:border-red-300 transition-colors disabled:opacity-50"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </td>
      <HoldReasonModal
        isOpen={isHoldModalOpen}
        onClose={handleHoldClose}
        onConfirm={handleHoldConfirm}
      />
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
