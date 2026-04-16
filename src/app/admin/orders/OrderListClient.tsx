"use client";

import { useState, useEffect } from "react";
import OrderRowClient from "./OrderRowClient";
import type { OrderStatus } from "@/generated/prisma/client";
import { bulkUpdateOrderStatus, bulkDeleteOrders } from "../actions";
import { Filter, Plus, Printer, Trash2 } from "lucide-react";
import InvoicePrintView from "./InvoicePrintView";

import { useRouter } from "next/navigation";
import { AdminPagination } from "@/components/AdminPagination";

export default function OrderListClient({
  initialOrders,
  currentPage = 1,
  totalPages = 1,
  currentFilter = "ALL"
}: {
  initialOrders: any[],
  currentPage?: number,
  totalPages?: number,
  currentFilter?: string
}) {
  const router = useRouter();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkStatus, setBulkStatus] = useState<OrderStatus>("PENDING");
  const [loading, setLoading] = useState(false);
  const [optimisticOrders, setOptimisticOrders] = useState(initialOrders);

  useEffect(() => {
    setOptimisticOrders(initialOrders);
  }, [initialOrders]);

  const filteredOrders = optimisticOrders; // Filtering is now done on the server

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIds(new Set(filteredOrders.map(o => o.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const handleBulkUpdate = async () => {
    if (selectedIds.size === 0) return;
    setLoading(true);

    // Optimistic Update
    setOptimisticOrders(prev => prev.map(o =>
      selectedIds.has(o.id) ? { ...o, status: bulkStatus } : o
    ));

    try {
      await bulkUpdateOrderStatus(Array.from(selectedIds), bulkStatus);
      setSelectedIds(new Set());
      router.refresh();
    } catch (error) {
      // Revert if error
      setOptimisticOrders(initialOrders);
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`Are you sure you want to delete ${selectedIds.size} orders? This cannot be undone.`)) return;

    setLoading(true);
    try {
      await bulkDeleteOrders(Array.from(selectedIds));
      setSelectedIds(new Set());
      router.refresh();
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handlePrintSelected = () => {
    if (selectedIds.size === 0) return;
    window.print();
  };

  const selectedOrdersToPrint = filteredOrders.filter(o => selectedIds.has(o.id));
  return (
    <div className="flex flex-col gap-6">
      <InvoicePrintView orders={selectedOrdersToPrint} />
      {/* Header */}
      <div className="flex items-start sm:items-center justify-between flex-col sm:flex-row gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Orders</h1>
          <p className="text-sm text-slate-500 mt-1">Manage customer orders and fulfillments.</p>
        </div>
        <button
          onClick={() => router.push("/admin/orders/create")}
          className="flex items-center gap-2 px-4 py-2.5 bg-slate-900 text-white text-xs font-bold rounded-md hover:bg-slate-700 transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Create Order
        </button>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-white border border-slate-200 rounded-lg shadow-sm">
        <div className="flex items-center gap-3">
          <Filter className="w-4 h-4 text-slate-400" />
          <select
            value={currentFilter}
            onChange={e => {
              const newFilter = e.target.value;
              setSelectedIds(new Set());
              router.push(`/admin/orders?filter=${newFilter}&page=1`);
            }}
            className="text-sm border-0 font-medium text-slate-700 bg-transparent py-1 pl-1 pr-6 focus:ring-0 cursor-pointer focus:outline-none"
          >
            <option value="ALL">All Statuses</option>
            <option value="PENDING">Pending</option>
            <option value="CONFIRMED">Confirmed</option>
            <option value="PACKAGING">Packaging</option>
            <option value="SHIPPED">Shipped</option>
            <option value="DELIVERED">Delivered</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
        </div>

        {selectedIds.size > 0 && (
          <div className="flex items-center gap-3 bg-indigo-50 px-3 py-1.5 rounded-md border border-indigo-100">
            <span className="text-xs font-semibold text-indigo-700">
              {selectedIds.size} selected
            </span>
            <select
              value={bulkStatus}
              onChange={e => setBulkStatus(e.target.value as OrderStatus)}
              className="px-2 py-1 text-xs border border-indigo-200 rounded text-indigo-700 bg-white focus:outline-none"
            >
              <option value="PENDING">Set Pending</option>
              <option value="CONFIRMED">Set Confirmed</option>
              <option value="PACKAGING">Set Packaging</option>
              <option value="SHIPPED">Set Shipped</option>
              <option value="DELIVERED">Set Delivered</option>
              <option value="CANCELLED">Set Cancelled</option>
            </select>

            <button
              onClick={handleBulkUpdate}
              disabled={loading}
              className="text-xs font-bold text-white bg-indigo-600 px-3 py-1 rounded hover:bg-indigo-700 transition"
            >
              {loading ? "Updating..." : "Update Selected"}
            </button>
            <button
              onClick={handlePrintSelected}
              className="flex items-center gap-1.5 text-xs font-bold text-indigo-600 bg-white border border-indigo-200 px-3 py-1 rounded hover:bg-slate-50 transition"
            >
              <Printer className="w-3.5 h-3.5" />
              Print Selected
            </button>
            <button
              onClick={handleBulkDelete}
              disabled={loading}
              className="flex items-center gap-1.5 text-xs font-bold text-red-600 bg-white border border-red-200 px-3 py-1 rounded hover:bg-red-50 transition"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Delete Selected
            </button>
          </div>
        )}
      </div>

      {/* Data Table */}
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="px-6 py-3 w-10">
                  <input
                    type="checkbox"
                    onChange={handleSelectAll}
                    checked={filteredOrders.length > 0 && selectedIds.size === filteredOrders.length}
                    className="rounded border-slate-300 text-indigo-600 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                  />
                </th>
                <th className="px-6 py-3 font-semibold text-xs text-slate-500 uppercase tracking-wider">ID</th>
                <th className="px-6 py-3 font-semibold text-xs text-slate-500 uppercase tracking-wider">Customer</th>
                <th className="px-6 py-3 font-semibold text-xs text-slate-500 uppercase tracking-wider">Address</th>
                <th className="px-6 py-3 font-semibold text-xs text-slate-500 uppercase tracking-wider">Items</th>
                <th className="px-6 py-3 font-semibold text-xs text-slate-500 uppercase tracking-wider">Total</th>
                <th className="px-6 py-3 font-semibold text-xs text-slate-500 uppercase tracking-wider text-right">Status</th>
                <th className="px-6 py-3 font-semibold text-xs text-slate-500 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredOrders.map((order) => (
                <OrderRowClient
                  key={order.id}
                  order={order}
                  items={order.items}
                  isSelected={selectedIds.has(order.id)}
                  onSelect={() => handleSelect(order.id)}
                />
              ))}
              {filteredOrders.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center">
                    <p className="text-sm text-slate-500 font-medium">No orders matched.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <AdminPagination currentPage={currentPage} totalPages={totalPages} />
      </div>
    </div>
  );
}
