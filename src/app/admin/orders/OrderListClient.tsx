"use client";

import { useState, useEffect, useRef } from "react";
import OrderRowClient from "./OrderRowClient";
import type { OrderStatus } from "@/generated/prisma/client";
import { bulkUpdateOrderStatus, bulkDeleteOrders } from "./actions";
import { Filter, Plus, Printer, Trash2, Search as SearchIcon, X, Truck, Sparkles, ScanLine, Calendar } from "lucide-react";
import ScanScreen from "./ScanScreen";
import InvoicePrintView from "./InvoicePrintView";
import ThermalPrintView from "./ThermalPrintView";
import PathaoReviewModal from "./PathaoReviewModal";

import { useRouter } from "next/navigation";
import { AdminPagination } from "@/components/AdminPagination";
import { StatusAlertModal } from "@/components/StatusAlertModal";
import { CustomSelect } from "@/components/CustomSelect";
import { motion, AnimatePresence } from "framer-motion";

export default function OrderListClient({
  initialOrders,
  currentPage = 1,
  totalPages = 1,
  currentFilter = "ALL",
  currentSource = "ALL",
  currentSearch = "",
  currentTab = "active",
  currentTag = "",
  availableTags = [],
  storePhone = "01920240230",
  storeAddress = "H# 68, R# 12, Sector 10, Uttara, Dhaka - 1230, Bangladesh",
  posFooter = "Thank you for shopping with Mystic. We hope you love your purchase!",
  canCreate,
  canEdit,
  canDelete,
  currentStartDate = "",
  currentEndDate = ""
}: {
  initialOrders: any[];
  currentPage?: number;
  totalPages?: number;
  currentFilter?: string;
  currentSource?: string;
  currentSearch?: string;
  currentTab?: string;
  currentTag?: string;
  availableTags?: string[];
  storePhone?: string;
  storeAddress?: string;
  posFooter?: string;
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
  currentStartDate?: string;
  currentEndDate?: string;
}) {
  const router = useRouter();
  const [searchValue, setSearchValue] = useState(currentSearch);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkStatus, setBulkStatus] = useState<OrderStatus>("PENDING");
  const [loading, setLoading] = useState(false);
  const [optimisticOrders, setOptimisticOrders] = useState(initialOrders);
  const [printType, setPrintType] = useState<"A4" | "80MM" | null>(null);
  const [alert, setAlert] = useState<{ isOpen: boolean; title: string; message: string; type: "error" | "warning" }>({
    isOpen: false,
    title: "",
    message: "",
    type: "error"
  });

  useEffect(() => {
    if (printType !== null) {
      const timer = setTimeout(() => {
        window.print();
        setPrintType(null);
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [printType]);

  const [showPathaoModal, setShowPathaoModal] = useState(false);

  // Date Filtering States
  const [showDatePopover, setShowDatePopover] = useState(false);
  const [dateMode, setDateMode] = useState<"single" | "range">(
    currentStartDate && currentEndDate && currentStartDate !== currentEndDate ? "range" : "single"
  );
  const [startDateInput, setStartDateInput] = useState(currentStartDate || "");
  const [endDateInput, setEndDateInput] = useState(currentEndDate || "");
  const datePopoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (datePopoverRef.current && !datePopoverRef.current.contains(event.target as Node)) {
        setShowDatePopover(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const formatDateLabel = (dateStr: string) => {
    if (!dateStr) return "";
    const parts = dateStr.split("-");
    if (parts.length !== 3) return dateStr;
    const year = parts[0];
    const monthIndex = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const month = months[monthIndex] || parts[1];
    return `${day} ${month} ${year.slice(-2)}`;
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
    setSelectedIds(new Set());
    setShowDatePopover(false);
    router.push(`/admin/orders?${params.toString()}`);
  };

  const handleClearDateFilter = () => {
    const params = new URLSearchParams(window.location.search);
    params.delete("startDate");
    params.delete("endDate");
    params.set("page", "1");
    setStartDateInput("");
    setEndDateInput("");
    setSelectedIds(new Set());
    setShowDatePopover(false);
    router.push(`/admin/orders?${params.toString()}`);
  };

  useEffect(() => {
    setOptimisticOrders(initialOrders);
    setSearchValue(currentSearch);
    setStartDateInput(currentStartDate || "");
    setEndDateInput(currentEndDate || "");
    setDateMode(
      currentStartDate && currentEndDate && currentStartDate !== currentEndDate ? "range" : "single"
    );
  }, [initialOrders, currentSearch, currentStartDate, currentEndDate]);

  const handleSearch = () => {
    const params = new URLSearchParams(window.location.search);
    if (searchValue) params.set("search", searchValue);
    else params.delete("search");

    params.set("page", "1");
    router.push(`/admin/orders?${params.toString()}`);
  };
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
    setPrintType("A4");
  };

  const handlePrint80mmSelected = () => {
    if (selectedIds.size === 0) return;
    setPrintType("80MM");
  };

  const selectedOrdersToPrint = filteredOrders.filter((o) => selectedIds.has(o.id));
  return (
    <div className="flex flex-col gap-6">
      {/* Invoice print view — only this is visible during printing */}
      {printType === "A4" && <InvoicePrintView orders={selectedOrdersToPrint} />}
      {printType === "80MM" && (
        <ThermalPrintView
          orders={selectedOrdersToPrint}
          storePhone={storePhone}
          storeAddress={storeAddress}
          posFooter={posFooter}
        />
      )}

      {/* no-print: everything below is hidden by @media print in globals.css */}
      <div className="no-print flex flex-col gap-3">

        {/* Header + Tabs row */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h1 className="text-lg font-bold tracking-tight text-slate-900">Orders</h1>
            <p className="text-xs text-slate-400 mt-0.5">Manage customer orders and fulfillments.</p>
          </div>
          {canCreate && currentTab === "active" && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => router.push("/admin/orders/ai-create")}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-violet-600 to-indigo-600 text-white text-sm font-semibold rounded-lg hover:from-violet-700 hover:to-indigo-700 transition-all shadow-sm shadow-violet-200 whitespace-nowrap"
              >
                <Sparkles className="w-4 h-4" />
                AI Create
              </button>
              <button
                onClick={() => router.push("/admin/orders/create")}
                className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white text-sm font-semibold rounded-lg hover:bg-slate-800 transition-colors shadow-sm whitespace-nowrap"
              >
                <Plus className="w-4 h-4" />
                Create Order
              </button>
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 bg-slate-100/70 border border-slate-200 rounded-lg p-0.5 w-fit">
          <button
            onClick={() => {
              const params = new URLSearchParams(window.location.search);
              params.set("tab", "active");
              params.set("page", "1");
              router.push(`/admin/orders?${params.toString()}`);
            }}
            className={`px-3 py-1.5 text-[11px] font-bold uppercase tracking-wide rounded-md transition-all ${
              currentTab === "active"
                ? "bg-white text-slate-900 shadow-sm border border-slate-200"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            Active Orders
          </button>
          <button
            onClick={() => {
              const params = new URLSearchParams(window.location.search);
              params.set("tab", "trash");
              params.set("page", "1");
              router.push(`/admin/orders?${params.toString()}`);
            }}
            className={`px-3 py-1.5 text-[11px] font-bold uppercase tracking-wide rounded-md transition-all ${
              currentTab === "trash"
                ? "bg-white text-slate-900 shadow-sm border border-slate-200"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            Trash Bin
          </button>
          <button
            onClick={() => {
              const params = new URLSearchParams(window.location.search);
              params.set("tab", "scan");
              router.push(`/admin/orders?${params.toString()}`);
            }}
            className={`px-3 py-1.5 text-[11px] font-bold uppercase tracking-wide rounded-md transition-all flex items-center gap-1 ${
              currentTab === "scan"
                ? "bg-white text-indigo-700 shadow-sm border border-indigo-100"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            <ScanLine className="w-3 h-3" />
            Scan Screen
          </button>
        </div>

        {/* Scan Screen Tab */}
        {currentTab === "scan" && <ScanScreen />}

        {currentTab !== "scan" && <>
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm">
          <div className="px-3 py-2.5 flex flex-col xl:flex-row xl:items-center gap-2.5 justify-between">

            {/* Left Side: Search & Filter */}
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
                      router.push(`/admin/orders?${params.toString()}`);
                    }
                  }}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
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
                        router.push(`/admin/orders?${params.toString()}`);
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

              {/* Filter Block */}
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
                    setSelectedIds(new Set());
                    router.push(`/admin/orders?${params.toString()}`);
                  }}
                  heightClass="h-[32px]"
                  className="w-36"
                />

                <CustomSelect
                  options={[
                    { value: "ALL", label: "All Channels" },
                    { value: "eCommerce", label: "eCommerce" },
                    { value: "Salesman", label: "Salesman" },
                  ]}
                  value={currentSource}
                  onChange={(val) => {
                    const params = new URLSearchParams(window.location.search);
                    params.set("source", val);
                    params.set("page", "1");
                    setSelectedIds(new Set());
                    router.push(`/admin/orders?${params.toString()}`);
                  }}
                  heightClass="h-[32px]"
                  className="w-32"
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
                    setSelectedIds(new Set());
                    router.push(`/admin/orders?${params.toString()}`);
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
                    <Calendar className={`w-3.5 h-3.5 ${currentStartDate ? "text-amber-400" : "text-slate-400"}`} />
                    <span className="truncate">
                      {currentStartDate
                        ? currentStartDate === currentEndDate
                          ? formatDateLabel(currentStartDate)
                          : `${formatDateLabel(currentStartDate)} - ${formatDateLabel(currentEndDate || currentStartDate)}`
                        : "Date Filter"}
                    </span>
                    {currentStartDate && (
                      <span
                        onClick={(e) => {
                          e.stopPropagation();
                          handleClearDateFilter();
                        }}
                        className="p-0.5 hover:bg-white/20 rounded transition-colors text-white/80 hover:text-white flex items-center justify-center animate-fade-in"
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
                            disabled={!startDateInput || (dateMode === "range" && !endDateInput)}
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

          {/* Dedicated Bulk Actions Section below the Search and Filter section */}
          {selectedIds.size > 0 && (
            <div className="border-t border-slate-100 bg-indigo-50/20 px-3 py-2 flex flex-col lg:flex-row lg:items-center justify-between gap-2 animate-fade-in transition-all rounded-b-xl">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-indigo-600 text-white font-bold text-[10px]">
                  {selectedIds.size}
                </span>
                <span className="text-xs font-semibold text-slate-700">
                  orders selected for bulk operations
                </span>
                <button
                  onClick={() => setSelectedIds(new Set())}
                  className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold underline underline-offset-2 ml-2 transition-colors"
                >
                  Deselect all
                </button>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {canEdit && currentTab === "active" && (
                  <>
                    <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-lg p-1 shadow-sm">
                      <select
                        value={bulkStatus}
                        onChange={(e) => setBulkStatus(e.target.value as OrderStatus)}
                        className="bg-transparent border-0 rounded px-2 py-1 text-xs font-semibold text-slate-700 outline-none cursor-pointer focus:ring-0 focus:border-0"
                      >
                        {[
                          { value: "PENDING", label: "Set Placed" },
                          { value: "CONFIRMED", label: "Set Confirmed" },
                          { value: "PRINTING", label: "Set Printing" },
                          { value: "PACKAGING", label: "Set Packaged" },
                          { value: "SHIPPED", label: "Set Shipped" },
                          { value: "DELIVERED", label: "Set Delivered" },
                          { value: "HOLD", label: "Set On Hold" },
                          { value: "CANCELLED", label: "Set Cancelled" },
                          { value: "RETURNED", label: "Set Returned" },
                        ].map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>

                      <button
                        onClick={handleBulkUpdate}
                        disabled={loading}
                        className="text-xs font-semibold text-white bg-indigo-600 px-3 py-1 rounded-md hover:bg-indigo-700 transition disabled:opacity-50 shadow-sm"
                      >
                        {loading ? "Updating..." : "Update"}
                      </button>
                    </div>

                    <div className="w-px h-5 bg-slate-200 mx-1 hidden lg:block" />
                  </>
                )}

                <button
                  onClick={handlePrintSelected}
                  className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 px-3 py-1.5 rounded-lg hover:bg-slate-50 transition shadow-sm"
                >
                  <Printer className="w-3.5 h-3.5" />
                  Print
                </button>
                <button
                  onClick={handlePrint80mmSelected}
                  className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 px-3 py-1.5 rounded-lg hover:bg-slate-50 transition shadow-sm"
                >
                  <Printer className="w-3.5 h-3.5" />
                  POS Print
                </button>
                {canEdit && currentTab === "active" && (
                  <button
                    onClick={() => setShowPathaoModal(true)}
                    disabled={loading}
                    className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 px-3 py-1.5 rounded-lg hover:bg-slate-50 transition disabled:opacity-50 shadow-sm"
                  >
                    <Truck className="w-3.5 h-3.5 text-[#ee2e24]" />
                    Send to Pathao
                  </button>
                )}
                {canDelete && currentTab === "active" && (
                  <button
                    onClick={handleBulkDelete}
                    disabled={loading}
                    className="flex items-center gap-1.5 text-xs font-semibold text-red-600 bg-red-50 border border-red-100 px-3 py-1.5 rounded-lg hover:bg-red-100 hover:border-red-200 transition disabled:opacity-50 shadow-sm"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Delete
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Data Table */}
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse whitespace-nowrap">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="px-3 py-2.5 w-10">
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
                  <th className="px-2 py-2.5 font-semibold text-xs text-slate-500 uppercase tracking-wider">ID</th>
                  <th className="px-2 py-2.5 font-semibold text-xs text-slate-500 uppercase tracking-wider">Customer</th>
                  <th className="px-2 py-2.5 font-semibold text-xs text-slate-500 uppercase tracking-wider">Address</th>
                  <th className="px-2 py-2.5 font-semibold text-xs text-slate-500 uppercase tracking-wider">Items</th>
                  <th className="px-2 py-2.5 font-semibold text-xs text-slate-500 uppercase tracking-wider">Advance</th>
                  <th className="px-2 py-2.5 font-semibold text-xs text-slate-500 uppercase tracking-wider">Due</th>
                  <th className="px-2 py-2.5 font-semibold text-xs text-slate-500 uppercase tracking-wider">Total</th>
                  <th className="px-2 py-2.5 font-semibold text-xs text-slate-500 uppercase tracking-wider text-right">Status</th>
                  <th className="px-2 py-2.5 font-semibold text-xs text-slate-500 uppercase tracking-wider text-right">Actions</th>
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
                    canEdit={canEdit}
                    canDelete={canDelete}
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
              message: "Pickup request sent to Pathao. Orders will remain in Packaged status until the rider picks up.",
              type: "warning"
            });
          }}
        />
        </> }
      </div>{/* end no-print */}
    </div>
  );
}