"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { formatDateTime } from "@/utils/formatDate";
import { formatBDT } from "@/utils/formatPrice";
import {

  Plus,
  ShoppingBag,
  ExternalLink,
  Search as SearchIcon,
  X,
  Calendar,
} from "lucide-react";
import { CustomSelect } from "@/components/CustomSelect";
import { AdminPagination } from "@/components/AdminPagination";
import { motion, AnimatePresence } from "framer-motion";

const STATUS_LABELS: Record<string, string> = {
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

const STATUS_STYLES: Record<string, string> = {
  PENDING: "bg-amber-50 text-amber-700 border-amber-200",
  CONFIRMED: "bg-blue-50 text-blue-700 border-blue-200",
  PRINTING: "bg-cyan-50 text-cyan-700 border-cyan-200",
  PACKAGING: "bg-purple-50 text-purple-700 border-purple-200",
  SHIPPED: "bg-indigo-50 text-indigo-700 border-indigo-200",
  DELIVERED: "bg-green-50 text-green-700 border-green-200",
  RETURNED: "bg-rose-50 text-rose-700 border-rose-200",
  CANCELLED: "bg-red-50 text-red-700 border-red-200",
  HOLD: "bg-pink-50 text-pink-700 border-pink-200",
};

interface StaffOrderListClientProps {
  initialOrders: any[];
  currentPage?: number;
  totalPages?: number;
  currentFilter?: string;
  currentSearch?: string;
  currentView?: string;
  currentTag?: string;
  availableTags?: string[];
  totalCount: number;
  currentStartDate?: string;
  currentEndDate?: string;
}

export default function StaffOrderListClient({
  initialOrders,
  currentPage = 1,
  totalPages = 1,
  currentFilter = "ALL",
  currentSearch = "",
  currentView = "my",
  currentTag = "",
  availableTags = [],
  totalCount,
  currentStartDate = "",
  currentEndDate = "",
}: StaffOrderListClientProps) {
  const router = useRouter();
  const [searchValue, setSearchValue] = useState(currentSearch);
  const [showDatePopover, setShowDatePopover] = useState(false);
  const [dateMode, setDateMode] = useState<"single" | "range">(
    currentStartDate && currentEndDate && currentStartDate !== currentEndDate
      ? "range"
      : "single"
  );
  const [startDateInput, setStartDateInput] = useState(currentStartDate || "");
  const [endDateInput, setEndDateInput] = useState(currentEndDate || "");
  const datePopoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        datePopoverRef.current &&
        !datePopoverRef.current.contains(event.target as Node)
      ) {
        setShowDatePopover(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    setSearchValue(currentSearch);
    setStartDateInput(currentStartDate || "");
    setEndDateInput(currentEndDate || "");
    setDateMode(
      currentStartDate && currentEndDate && currentStartDate !== currentEndDate
        ? "range"
        : "single"
    );
  }, [currentSearch, currentStartDate, currentEndDate]);

  const formatDateLabel = (dateStr: string) => {
    if (!dateStr) return "";
    const parts = dateStr.split("-");
    if (parts.length !== 3) return dateStr;
    const year = parts[0];
    const monthIndex = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    const months = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];
    const month = months[monthIndex] || parts[1];
    return `${day} ${month} ${year.slice(-2)}`;
  };

  const handleSearch = () => {
    const params = new URLSearchParams(window.location.search);
    if (searchValue) {
      params.set("search", searchValue);
    } else {
      params.delete("search");
    }
    params.set("page", "1");
    router.push(`/staff/orders?${params.toString()}`);
  };

  const handleApplyDateFilter = () => {
    const params = new URLSearchParams(window.location.search);
    if (dateMode === "single") {
      if (startDateInput) {
        params.set("startDate", startDateInput);
        params.set("endDate", startDateInput);
      } else {
        params.delete("startDate");
        params.delete("endDate");
      }
    } else {
      if (startDateInput) {
        params.set("startDate", startDateInput);
      } else {
        params.delete("startDate");
      }
      if (endDateInput) {
        params.set("endDate", endDateInput);
      } else {
        params.delete("endDate");
      }
    }
    params.set("page", "1");
    setShowDatePopover(false);
    router.push(`/staff/orders?${params.toString()}`);
  };

  const handleClearDateFilter = () => {
    const params = new URLSearchParams(window.location.search);
    params.delete("startDate");
    params.delete("endDate");
    params.set("page", "1");
    setStartDateInput("");
    setEndDateInput("");
    setShowDatePopover(false);
    router.push(`/staff/orders?${params.toString()}`);
  };

  return (
    <div className="space-y-5 max-w-8xl">
      {/* Header and Action Button */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">
            {currentView === "all" ? "All Orders" : "My Orders"}
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {totalCount} total orders
          </p>
        </div>
        <Link
          href="/staff/orders/create"
          className="flex items-center gap-1.5 px-4 py-2 bg-[#1a3a5c] text-white text-sm font-medium rounded-lg hover:bg-[#15304f] transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Order
        </Link>
      </div>

      {/* View Toggle (My Orders vs All Orders) */}
      <div className="flex items-center gap-1 bg-slate-100/70 border border-slate-200 rounded-lg p-0.5 w-fit">
        <button
          onClick={() => {
            const params = new URLSearchParams(window.location.search);
            params.set("view", "my");
            params.set("page", "1");
            router.push(`/staff/orders?${params.toString()}`);
          }}
          className={`px-4 py-1.5 text-xs font-semibold rounded-md transition-all ${
            currentView === "my"
              ? "bg-white text-slate-900 shadow-sm border border-slate-200"
              : "text-slate-500 hover:text-slate-700"
          }`}
        >
          My Orders
        </button>
        <button
          onClick={() => {
            const params = new URLSearchParams(window.location.search);
            params.set("view", "all");
            params.set("page", "1");
            router.push(`/staff/orders?${params.toString()}`);
          }}
          className={`px-4 py-1.5 text-xs font-semibold rounded-md transition-all ${
            currentView === "all"
              ? "bg-white text-slate-900 shadow-sm border border-slate-200"
              : "text-slate-500 hover:text-slate-700"
          }`}
        >
          All Orders
        </button>
      </div>

      {/* Filters Bar */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm">
        <div className="px-3 py-2.5 flex flex-col xl:flex-row xl:items-center gap-2.5 justify-between">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 flex-1">
            {/* Search Block */}
            <div className="flex-1 relative group max-w-[400px]">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                <SearchIcon className="h-4 w-4 text-slate-400 group-focus-within:text-slate-900 transition-colors" />
              </div>
              <input
                type="text"
                placeholder="Track by ID, Customer Name, or Phone..."
                value={searchValue}
                onChange={(e) => {
                  const val = e.target.value;
                  setSearchValue(val);
                  if (val === "") {
                    const params = new URLSearchParams(window.location.search);
                    params.delete("search");
                    params.set("page", "1");
                    router.push(`/staff/orders?${params.toString()}`);
                  }
                }}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                className="block w-full pl-9 pr-20 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-500/10 focus:border-slate-300 focus:bg-white transition-all outline-none font-medium text-slate-900 placeholder:text-slate-400"
              />
              <div className="absolute inset-y-0 right-0 pr-1 flex items-center gap-1">
                {searchValue && (
                  <button
                    onClick={() => {
                      setSearchValue("");
                      const params = new URLSearchParams(window.location.search);
                      params.delete("search");
                      params.set("page", "1");
                      router.push(`/staff/orders?${params.toString()}`);
                    }}
                    className="p-1.5 hover:bg-slate-200 rounded-md transition-colors text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
                <button
                  onClick={handleSearch}
                  className="px-3 py-1.5 bg-slate-900 text-white text-xs font-semibold rounded-md hover:bg-slate-800 transition-colors"
                >
                  Search
                </button>
              </div>
            </div>

            <div className="h-6 w-px bg-slate-200 hidden md:block" />

            {/* Dropdowns Block */}
            <div className="flex items-center gap-2">
              <CustomSelect
                options={[
                  { value: "ALL", label: "All Statuses" },
                  { value: "PENDING", label: "Placed" },
                  { value: "CONFIRMED", label: "Confirmed" },
                  { value: "PRINTING", label: "Printing" },
                  { value: "PACKAGING", label: "Packaged" },
                  { value: "SHIPPED", label: "Shipped" },
                  { value: "DELIVERED", label: "Delivered" },
                  { value: "HOLD", label: "On Hold" },
                  { value: "RETURNED", label: "Returned" },
                  { value: "CANCELLED", label: "Cancelled" },
                ]}
                value={currentFilter}
                onChange={(val) => {
                  const params = new URLSearchParams(window.location.search);
                  params.set("filter", val);
                  params.set("page", "1");
                  router.push(`/staff/orders?${params.toString()}`);
                }}
                heightClass="h-[32px]"
                className="w-36"
              />

              <CustomSelect
                options={[
                  { value: "ALL", label: "All Tags" },
                  ...availableTags.map((t) => ({ value: t, label: t })),
                ]}
                value={currentTag || "ALL"}
                onChange={(val) => {
                  const params = new URLSearchParams(window.location.search);
                  if (val && val !== "ALL") params.set("tag", val);
                  else params.delete("tag");
                  params.set("page", "1");
                  router.push(`/staff/orders?${params.toString()}`);
                }}
                heightClass="h-[32px]"
                className="w-32"
                searchable={availableTags.length > 5}
              />

              {/* Date Filter */}
              <div className="relative" ref={datePopoverRef}>
                <button
                  type="button"
                  onClick={() => setShowDatePopover(!showDatePopover)}
                  className={`h-[32px] px-3 flex items-center gap-1.5 border rounded-lg text-xs font-semibold transition-all duration-150 outline-none select-none ${
                    currentStartDate
                      ? "bg-slate-900 border-slate-900 text-white hover:bg-slate-800"
                      : "bg-slate-50 border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-100"
                  }`}
                >
                  <Calendar
                    className={`w-3.5 h-3.5 ${
                      currentStartDate ? "text-amber-400" : "text-slate-400"
                    }`}
                  />
                  <span className="truncate">
                    {currentStartDate
                      ? currentStartDate === currentEndDate
                        ? formatDateLabel(currentStartDate)
                        : `${formatDateLabel(currentStartDate)} - ${formatDateLabel(
                            currentEndDate || currentStartDate
                          )}`
                      : "Date Filter"}
                  </span>
                  {currentStartDate && (
                    <span
                      onClick={(e) => {
                        e.stopPropagation();
                        handleClearDateFilter();
                      }}
                      className="p-0.5 hover:bg-white/20 rounded transition-colors text-white/80 hover:text-white flex items-center justify-center"
                    >
                      <X className="w-3 h-3" />
                    </span>
                  )}
                </button>

                <AnimatePresence>
                  {showDatePopover && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.15 }}
                      className="absolute right-0 mt-2 z-50 w-72 bg-white border border-slate-200 shadow-xl rounded-xl p-4 space-y-4"
                    >
                      {/* Tab Selector */}
                      <div className="flex border-b border-slate-100 pb-0.5">
                        <button
                          type="button"
                          onClick={() => {
                            setDateMode("single");
                            setEndDateInput("");
                          }}
                          className={`flex-1 pb-2 text-xs font-bold text-center border-b-2 transition-all outline-none ${
                            dateMode === "single"
                              ? "border-slate-900 text-slate-900"
                              : "border-transparent text-slate-400 hover:text-slate-600"
                          }`}
                        >
                          Single Date
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setDateMode("range");
                            if (!endDateInput) setEndDateInput(startDateInput);
                          }}
                          className={`flex-1 pb-2 text-xs font-bold text-center border-b-2 transition-all outline-none ${
                            dateMode === "range"
                              ? "border-slate-900 text-slate-900"
                              : "border-transparent text-slate-400 hover:text-slate-600"
                          }`}
                        >
                          Date Range
                        </button>
                      </div>

                      {/* Date Inputs */}
                      {dateMode === "single" ? (
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">
                            Select Date
                          </label>
                          <input
                            type="date"
                            value={startDateInput}
                            onChange={(e) => setStartDateInput(e.target.value)}
                            className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 text-slate-800 bg-slate-50 focus:bg-white transition-all font-semibold"
                          />
                        </div>
                      ) : (
                        <div className="space-y-3">
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">
                              Start Date
                            </label>
                            <input
                              type="date"
                              value={startDateInput}
                              onChange={(e) => setStartDateInput(e.target.value)}
                              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 text-slate-800 bg-slate-50 focus:bg-white transition-all font-semibold"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">
                              End Date
                            </label>
                            <input
                              type="date"
                              value={endDateInput}
                              onChange={(e) => setEndDateInput(e.target.value)}
                              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 text-slate-800 bg-slate-50 focus:bg-white transition-all font-semibold"
                            />
                          </div>
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex gap-2 pt-1">
                        <button
                          type="button"
                          onClick={handleClearDateFilter}
                          className="flex-1 py-2 text-xs font-semibold text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 hover:border-slate-300 transition-all outline-none"
                        >
                          Clear
                        </button>
                        <button
                          type="button"
                          onClick={handleApplyDateFilter}
                          disabled={
                            !startDateInput ||
                            (dateMode === "range" && !endDateInput)
                          }
                          className="flex-1 py-2 text-xs font-bold text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-1 shadow-sm outline-none"
                        >
                          Apply Filter
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Orders Table */}
      {initialOrders.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center shadow-sm">
          <ShoppingBag className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="text-sm font-medium text-slate-600">No orders found</p>
          <p className="text-xs text-slate-400 mt-1">
            Try adjusting your search query or filters.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    Order
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    Customer
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    Date & Time
                  </th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    Amount
                  </th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    Commission
                  </th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    Status
                  </th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {initialOrders.map((order) => {
                  const commission = order.commission;
                  const isDelivered = order.status === "DELIVERED";
                  const isCancelled = order.status === "CANCELLED";
                  const statusStyle =
                    STATUS_STYLES[order.status] ??
                    "bg-slate-50 text-slate-600 border-slate-200";
                  const statusLabel =
                    STATUS_LABELS[order.status] ?? order.status;
                  const itemCount = order.items.reduce(
                    (s: number, i: any) => s + i.quantity,
                    0
                  );

                  return (
                    <tr
                      key={order.id}
                      className="hover:bg-slate-50 transition-colors"
                    >
                      <td className="px-4 py-3">
                        <p className="font-mono text-xs font-medium text-slate-700">
                          {order.id}
                        </p>
                        <p className="text-xs text-slate-400 mt-0.5">
                          {itemCount} item{itemCount !== 1 ? "s" : ""}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-slate-900">
                          {order.customerName}
                        </p>
                        <p className="text-xs text-slate-400">{order.phone}</p>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">
                        {formatDateTime(order.createdAt)}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-slate-900">
                        {formatBDT(order.totalAmount)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {commission === null ? (
                          <span className="text-slate-400 text-xs">—</span>
                        ) : isCancelled ? (
                          <span className="text-slate-400 text-xs">—</span>
                        ) : isDelivered ? (
                          <span className="font-semibold text-green-700">
                            {formatBDT(commission)}
                          </span>
                        ) : (
                          <div>
                            <p className="text-xs text-slate-500 text-right">
                              {formatBDT(commission)}
                            </p>
                            <p className="text-xs text-amber-500 text-right">
                              pending
                            </p>
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className={`inline-flex px-2.5 py-1 rounded-md text-[11px] font-black uppercase tracking-wider border ${statusStyle}`}
                        >
                          {statusLabel}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Link
                          href={`/staff/orders/${order.id}`}
                          className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-slate-600 border border-slate-200 rounded-md hover:bg-slate-50 transition-colors"
                        >
                          <ExternalLink className="w-3 h-3" />
                          View
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="border-t border-slate-100">
            <AdminPagination
              currentPage={currentPage}
              totalPages={totalPages}
            />
          </div>
        </div>
      )}
    </div>
  );
}
