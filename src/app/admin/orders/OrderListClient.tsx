"use client";

import { useState, useEffect } from "react";
import OrderRowClient from "./OrderRowClient";
import type { OrderStatus } from "@/generated/prisma/client";
import { bulkUpdateOrderStatus, bulkDeleteOrders } from "../actions";
import { Filter, Plus, Printer, Trash2, Search as SearchIcon, X, Truck } from "lucide-react";
import InvoicePrintView from "./InvoicePrintView";
import PathaoReviewModal from "./PathaoReviewModal";

import { useRouter } from "next/navigation";
import { AdminPagination } from "@/components/AdminPagination";
import { StatusAlertModal } from "@/components/StatusAlertModal";

export default function OrderListClient({
  initialOrders,
  currentPage = 1,
  totalPages = 1,
  currentFilter = "ALL",
  currentSearch = "",
}: {
  initialOrders: any[];
  currentPage?: number;
  totalPages?: number;
  currentFilter?: string;
  currentSearch?: string;
}) {
  const router = useRouter();
  const [searchValue, setSearchValue] = useState(currentSearch);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkStatus, setBulkStatus] = useState<OrderStatus>("PENDING");
  const [loading, setLoading] = useState(false);
  const [optimisticOrders, setOptimisticOrders] = useState(initialOrders);
  const [alert, setAlert] = useState<{ isOpen: boolean; title: string; message: string; type: "error" | "warning" }>({
    isOpen: false,
    title: "",
    message: "",
    type: "error"
  });

  const [showPathaoModal, setShowPathaoModal] = useState(false);

  useEffect(() => {
    setOptimisticOrders(initialOrders);
    setSearchValue(currentSearch);
  }, [initialOrders, currentSearch]);

  // Debounced Search Sync
  useEffect(() => {
    // Skip if the value matches the current URL state
    if (searchValue === currentSearch) return;

    const delayDebounceFn = setTimeout(() => {
      const params = new URLSearchParams(window.location.search);
      if (searchValue) params.set("search", searchValue);
      else params.delete("search");

      params.set("page", "1");
      router.push(`/admin/orders?${params.toString()}`);
    }, 400); // 400ms delay for a snappy feel

    return () => clearTimeout(delayDebounceFn);
  }, [searchValue, currentSearch, router]);

  const filteredOrders = optimisticOrders;

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIds(new Set(filteredOrders.map((o) => o.id)));
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

    setOptimisticOrders((prev) =>
      prev.map((o) => (selectedIds.has(o.id) ? { ...o, status: bulkStatus } : o))
    );

    try {
      const results = await bulkUpdateOrderStatus(Array.from(selectedIds), bulkStatus);
      const failures = results.filter(r => !r.success);

      if (failures.length > 0) {
        setAlert({
          isOpen: true,
          title: "Bulk Update Notice",
          message: `${failures.length} order(s) could not be updated due to status transition restrictions or inventory issues. Others may have succeeded.`,
          type: "warning"
        });
      }

      setSelectedIds(new Set());
      router.refresh();
    } catch (error) {
      setOptimisticOrders(initialOrders);
      setAlert({
        isOpen: true,
        title: "System Error",
        message: "A critical error occurred during the bulk update. Please refresh the page and try again.",
        type: "error"
      });
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    if (
      !confirm(
        `Are you sure you want to delete ${selectedIds.size} orders? This cannot be undone.`
      )
    )
      return;

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

  const selectedOrdersToPrint = filteredOrders.filter((o) => selectedIds.has(o.id));
  return (
    <div className="flex flex-col gap-6">
      <InvoicePrintView orders={selectedOrdersToPrint} />

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Orders</h1>
          <p className="text-sm text-slate-500 mt-1">Manage customer orders and fulfillments.</p>
        </div>
        <button
          onClick={() => router.push("/admin/orders/create")}
          className="flex items-center gap-2 px-4 py-2.5 bg-slate-900 text-white text-sm font-semibold rounded-lg hover:bg-slate-800 transition-colors shadow-sm whitespace-nowrap"
        >
          <Plus className="w-4 h-4" />
          Create Order
        </button>
      </div>

      {/* Toolbar, Search & Bulk Actions */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 flex flex-col xl:flex-row xl:items-center gap-4 justify-between">

          {/* Left Side: Search & Filter */}
          <div className="flex flex-col md:flex-row md:items-center gap-4 flex-1">
            {/* Search Block */}
            <div className="flex-1 relative group min-w-[250px]">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                <SearchIcon className="h-4 w-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
              </div>
              <input
                type="text"
                placeholder="Track by ID, Customer Name, or Phone..."
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                className="block w-full pl-10 pr-12 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 focus:bg-white transition-all outline-none font-medium text-slate-900 placeholder:text-slate-400"
              />
              <div className="absolute inset-y-0 right-0 pr-2 flex items-center">
                {searchValue && (
                  <button
                    onClick={() => {
                      setSearchValue("");
                    }}
                    className="p-1 hover:bg-slate-200 rounded-full transition-colors text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            <div className="h-8 w-px bg-slate-200 hidden md:block" />

            {/* Filter Block */}
            <div className="flex items-center gap-3">
              <div className="p-2 bg-slate-50 rounded-lg border border-slate-200">
                <Filter className="w-4 h-4 text-slate-500" />
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">
                  Status Filter
                </span>
                <select
                  value={currentFilter}
                  onChange={(e) => {
                    const val = e.target.value;
                    const params = new URLSearchParams(window.location.search);
                    params.set("filter", val);
                    params.set("page", "1");
                    setSelectedIds(new Set());
                    router.push(`/admin/orders?${params.toString()}`);
                  }}
                  className="w-40 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm font-semibold focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all cursor-pointer"
                >
                  {[
                    { value: "ALL", label: "All Statuses" },
                    { value: "PENDING", label: "Pending" },
                    { value: "CONFIRMED", label: "Confirmed" },
                    { value: "PACKAGING", label: "Packaging" },
                    { value: "SHIPPED", label: "Shipped" },
                    { value: "DELIVERED", label: "Delivered" },
                    { value: "CANCELLED", label: "Cancelled" },
                  ].map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Right Side: Bulk Actions */}
          {selectedIds.size > 0 && (
            <div className="flex flex-wrap items-center gap-2 lg:gap-3 bg-indigo-50/50 p-2 lg:px-3 lg:py-2 rounded-lg border border-indigo-100 w-full xl:w-auto mt-4 xl:mt-0">
              <span className="text-xs font-semibold text-indigo-700 px-2 whitespace-nowrap">
                {selectedIds.size} selected
              </span>

              <div className="flex items-center gap-2 flex-wrap">
                <select
                  value={bulkStatus}
                  onChange={(e) => setBulkStatus(e.target.value as OrderStatus)}
                  className="w-36 bg-white border border-indigo-200 rounded-md px-3 py-1.5 text-xs font-semibold text-indigo-700 focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all cursor-pointer"
                >
                  {[
                    { value: "PENDING", label: "Set Pending" },
                    { value: "CONFIRMED", label: "Set Confirmed" },
                    { value: "PACKAGING", label: "Set Packaging" },
                    { value: "SHIPPED", label: "Set Shipped" },
                    { value: "DELIVERED", label: "Set Delivered" },
                    { value: "CANCELLED", label: "Set Cancelled" },
                  ].map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>

                <button
                  onClick={handleBulkUpdate}
                  disabled={loading}
                  className="text-xs font-semibold text-white bg-indigo-600 px-3 py-1.5 rounded-md hover:bg-indigo-700 transition disabled:opacity-50"
                >
                  {loading ? "Updating..." : "Update"}
                </button>
                <button
                  onClick={handlePrintSelected}
                  className="flex items-center gap-1.5 text-xs font-semibold text-indigo-600 bg-white border border-indigo-200 px-3 py-1.5 rounded-md hover:bg-slate-50 transition"
                >
                  <Printer className="w-3.5 h-3.5" />
                  Print
                </button>
                <button
                  onClick={handleBulkDelete}
                  disabled={loading}
                  className="flex items-center gap-1.5 text-xs font-semibold text-red-600 bg-white border border-red-200 px-3 py-1.5 rounded-md hover:bg-red-50 transition disabled:opacity-50"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Delete
                </button>
                <button
                  onClick={() => setShowPathaoModal(true)}
                  disabled={loading}
                  className="flex items-center gap-1.5 text-xs font-semibold text-white bg-[#ee2e24] px-3 py-1.5 rounded-md hover:bg-[#d1281f] transition disabled:opacity-50 shadow-sm"
                >
                  <Truck className="w-3.5 h-3.5" />
                  Send to Pathao
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Data Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse whitespace-nowrap">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="px-6 py-4 w-10">
                  <input
                    type="checkbox"
                    onChange={handleSelectAll}
                    checked={
                      filteredOrders.length > 0 &&
                      selectedIds.size === filteredOrders.length
                    }
                    className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                  />
                </th>
                <th className="px-6 py-4 font-semibold text-xs text-slate-500 uppercase tracking-wider">ID</th>
                <th className="px-6 py-4 font-semibold text-xs text-slate-500 uppercase tracking-wider">Customer</th>
                <th className="px-6 py-4 font-semibold text-xs text-slate-500 uppercase tracking-wider">Address</th>
                <th className="px-6 py-4 font-semibold text-xs text-slate-500 uppercase tracking-wider">Items</th>
                <th className="px-6 py-4 font-semibold text-xs text-slate-500 uppercase tracking-wider">Advance</th>
                <th className="px-6 py-4 font-semibold text-xs text-slate-500 uppercase tracking-wider">Due</th>
                <th className="px-6 py-4 font-semibold text-xs text-slate-500 uppercase tracking-wider">Total</th>
                <th className="px-6 py-4 font-semibold text-xs text-slate-500 uppercase tracking-wider text-right">Status</th>
                <th className="px-6 py-4 font-semibold text-xs text-slate-500 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
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
                  <td colSpan={8} className="px-6 py-16 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="p-4 bg-slate-50 rounded-full border border-slate-100">
                        <SearchIcon className="w-8 h-8 text-slate-400" />
                      </div>
                      <div>
                        <p className="text-base text-slate-900 font-semibold">No orders found</p>
                        <p className="text-sm text-slate-500 mt-1 max-w-sm mx-auto">
                          Try adjusting your search query or removing the status filter to find what you're looking for.
                        </p>
                      </div>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination only shows if there are items or if explicitly managed by AdminPagination */}
        {filteredOrders.length > 0 && (
          <div className="border-t border-slate-100">
            <AdminPagination currentPage={currentPage} totalPages={totalPages} />
          </div>
        )}
      </div>
      <StatusAlertModal
        isOpen={alert.isOpen}
        onClose={() => setAlert({ ...alert, isOpen: false })}
        title={alert.title}
        message={alert.message}
        type={alert.type}
      />
      <PathaoReviewModal
        isOpen={showPathaoModal}
        onClose={() => setShowPathaoModal(false)}
        selectedOrders={filteredOrders.filter(o => selectedIds.has(o.id))}
        onSuccess={() => {
          setSelectedIds(new Set());
          setAlert({
            isOpen: true,
            title: "Success",
            message: "Successfully processed Pathao consignments.",
            type: "warning"
          });
        }}
      />
    </div>
  );
}