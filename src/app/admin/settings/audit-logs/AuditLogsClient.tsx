"use client";

import { useState, useEffect } from "react";
import {
  getPaginatedAuditLogs,
  updateAuditLogSettings,
  pruneLogsNowAction
} from "./actions";
import {
  Calendar,
  Search,
  Filter,
  Trash2,
  Clock,
  ShieldAlert,
  User,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Eye,
  RefreshCw,
  Settings,
  Activity,
  CheckCircle,
  X,
  FileCode,
  Globe,
  Monitor
} from "lucide-react";
import { useAdminAuth } from "@/app/admin/AdminAuthContext";

const formatValue = (val: any, fieldKey?: string) => {
  if (val === null || val === undefined) return "None";
  if (Array.isArray(val)) {
    if (val.length === 0) return "None";
    if (fieldKey === "items" || (val[0] && typeof val[0] === "object" && "productId" in val[0])) {
      return val.map((item: any) => {
        const name = item.product?.name || item.productName || `Product (${item.productId?.slice(0, 8) || "Unknown"})`;
        const sizeInfo = item.size ? ` (${item.size})` : "";
        const printInfo = item.requiresPrint ? ` [Print: ${item.printName || "No Name"}/${item.printNumber || "No No"}]` : "";
        return `${item.quantity}x ${name}${sizeInfo} @ ৳${item.price}${printInfo}`;
      }).join("\n");
    }
    if (typeof val[0] === "object") {
      return JSON.stringify(val, null, 2);
    }
    return val.join(", ");
  }
  if (typeof val === "object") {
    return JSON.stringify(val, null, 2);
  }
  return String(val);
};

const cleanForCompare = (val: any): any => {
  if (val === null || val === undefined) return val;
  if (Array.isArray(val)) {
    return val.map(cleanForCompare);
  }
  if (typeof val === "object" && !(val instanceof Date)) {
    const cleaned: any = {};
    for (const key of Object.keys(val)) {
      if (key === "id" || key === "createdAt" || key === "updatedAt" || key === "orderId") {
        continue;
      }
      cleaned[key] = cleanForCompare(val[key]);
    }
    return cleaned;
  }
  return val;
};

export default function AuditLogsClient({
  initialSettings,
  distinctUsers,
  distinctEntities
}: {
  initialSettings: any;
  distinctUsers: any[];
  distinctEntities: string[];
}) {
  const { checkPermission } = useAdminAuth();
  const canEdit = checkPermission("EDIT", "ACTIVITY_LOGS");
  const canDelete = checkPermission("DELETE", "ACTIVITY_LOGS");

  // Tabs: 'logs' | 'settings'
  const [activeTab, setActiveTab] = useState<"logs" | "settings">("logs");

  // Logs States
  const [logs, setLogs] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(15);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(false);

  // Filters State
  const [search, setSearch] = useState("");
  const [selectedUser, setSelectedUser] = useState("all");
  const [selectedEntity, setSelectedEntity] = useState("all");
  const [selectedAction, setSelectedAction] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  // Settings State
  const [isIndefinite, setIsIndefinite] = useState(initialSettings.retentionDays === null);
  const [retentionDays, setRetentionDays] = useState<number>(initialSettings.retentionDays || 90);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [settingsMessage, setSettingsMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Pruning States
  const [isPruning, setIsPruning] = useState(false);
  const [showPruneConfirm, setShowPruneConfirm] = useState(false);

  // Detail Modal State
  const [selectedLog, setSelectedLog] = useState<any | null>(null);
  const [showModal, setShowModal] = useState(false);

  // Fetch Logs
  const fetchLogs = async () => {
    setIsLoading(true);
    try {
      const res = await getPaginatedAuditLogs({
        page,
        limit,
        userId: selectedUser,
        action: selectedAction,
        entityType: selectedEntity,
        search,
        dateFrom,
        dateTo
      });
      if (res.success && res.data) {
        setLogs(res.data.logs);
        setTotal(res.data.total);
        setTotalPages(res.data.totalPages);
      }
    } catch (err) {
      console.error("Error loading audit logs:", err);
    } finally {
      setIsLoading(false);
    }
  };

  // Trigger fetch when page or filters change
  useEffect(() => {
    fetchLogs();
  }, [page, selectedUser, selectedEntity, selectedAction, dateFrom, dateTo]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchLogs();
  };

  const clearFilters = () => {
    setSearch("");
    setSelectedUser("all");
    setSelectedEntity("all");
    setSelectedAction("all");
    setDateFrom("");
    setDateTo("");
    setPage(1);
  };

  // Settings Save
  const handleSaveSettings = async () => {
    setIsSavingSettings(true);
    setSettingsMessage(null);
    try {
      const days = isIndefinite ? null : retentionDays;
      const res = await updateAuditLogSettings(days);
      if (res.success) {
        setSettingsMessage({
          type: "success",
          text: `Settings updated successfully.${res.prunedCount ? ` Pruned ${res.prunedCount} older logs automatically.` : ""}`
        });
      } else {
        setSettingsMessage({ type: "error", text: res.error || "Failed to update settings." });
      }
    } catch (err: any) {
      setSettingsMessage({ type: "error", text: err.message || "An unexpected error occurred." });
    } finally {
      setIsSavingSettings(false);
    }
  };

  // Manual Prune
  const handleManualPrune = async () => {
    setIsPruning(true);
    setShowPruneConfirm(false);
    setSettingsMessage(null);
    try {
      const res = await pruneLogsNowAction();
      if (res.success) {
        setSettingsMessage({ type: "success", text: res.message || "Pruned logs successfully." });
        fetchLogs();
      } else {
        setSettingsMessage({ type: "error", text: res.error || "Failed to prune logs." });
      }
    } catch (err: any) {
      setSettingsMessage({ type: "error", text: err.message || "Failed to prune logs." });
    } finally {
      setIsPruning(false);
    }
  };

  // Helper to render action badge
  const renderActionBadge = (action: string) => {
    switch (action) {
      case "CREATE":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-md bg-emerald-50 text-emerald-700 border border-emerald-100">
            CREATE
          </span>
        );
      case "UPDATE":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-md bg-sky-50 text-sky-700 border border-sky-100">
            UPDATE
          </span>
        );
      case "DELETE":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-md bg-rose-50 text-rose-700 border border-rose-100">
            DELETE
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-md bg-slate-50 text-slate-700 border border-slate-100">
            {action}
          </span>
        );
    }
  };

  // Helper to format date
  const formatDateTime = (dateVal: string | Date) => {
    const d = new Date(dateVal);
    return d.toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    });
  };

  // JSON Diff Calculator Helper
  const getJsonDiff = (before: any, after: any) => {
    if (!before && !after) return [];

    const objBefore = typeof before === "string" ? JSON.parse(before) : before || {};
    const objAfter = typeof after === "string" ? JSON.parse(after) : after || {};

    const allKeys = Array.from(new Set([...Object.keys(objBefore), ...Object.keys(objAfter)]));
    const diff: { key: string; before: any; after: any; type: "ADD" | "UPDATE" | "DELETE" | "UNCHANGED" }[] = [];

    // Filter out internal system keys that just bloat the diff
    const ignoreKeys = ["createdAt", "updatedAt", "id"];

    for (const key of allKeys) {
      if (ignoreKeys.includes(key)) continue;

      const valBefore = objBefore[key];
      const valAfter = objAfter[key];

      const hasBefore = key in objBefore;
      const hasAfter = key in objAfter;

      // Handle simple equality check (nested object references skipped for simple display)
      const isStringBefore = typeof valBefore !== "object";
      const isStringAfter = typeof valAfter !== "object";

      if (hasBefore && !hasAfter) {
        diff.push({ key, before: valBefore, after: null, type: "DELETE" });
      } else if (!hasBefore && hasAfter) {
        diff.push({ key, before: null, after: valAfter, type: "ADD" });
      } else {
        const cleanBefore = cleanForCompare(valBefore);
        const cleanAfter = cleanForCompare(valAfter);

        const match = typeof cleanBefore !== "object" && typeof cleanAfter !== "object"
          ? String(cleanBefore) === String(cleanAfter)
          : JSON.stringify(cleanBefore) === JSON.stringify(cleanAfter);

        if (!match) {
          diff.push({ key, before: valBefore, after: valAfter, type: "UPDATE" });
        }
      }
    }
    return diff;
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2.5">
            <Activity className="w-6 h-6 text-maroon" />
            ERP Security Activity Log
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Track administrative operations, data state transformations, and authorization metrics.
          </p>
        </div>

        {/* Tab Selection */}
        <div className="flex bg-slate-100 p-1.5 rounded-lg border border-slate-200 self-start sm:self-center">
          <button
            onClick={() => setActiveTab("logs")}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-md transition-all ${activeTab === "logs"
              ? "bg-white text-slate-900 shadow-sm border border-slate-200/50"
              : "text-slate-500 hover:text-slate-900"
              }`}
          >
            <Activity className="w-3.5 h-3.5" />
            Activity Logs
          </button>
          <button
            onClick={() => setActiveTab("settings")}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-md transition-all ${activeTab === "settings"
              ? "bg-white text-slate-900 shadow-sm border border-slate-200/50"
              : "text-slate-500 hover:text-slate-900"
              }`}
          >
            <Settings className="w-3.5 h-3.5" />
            Retention & Maintenance
          </button>
        </div>
      </div>

      {/* Main Panel Content */}
      {activeTab === "logs" ? (
        <div className="flex flex-col gap-6">
          {/* Advanced Filter Panel */}
          <div className="bg-white border border-slate-200 rounded-xl shadow-[0_1px_3px_rgba(0,0,0,0.04)] p-5">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3 mb-5">
              <Filter className="w-4 h-4 text-slate-400" />
              <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Filter Operations</h2>
            </div>

            <form onSubmit={handleSearchSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Search Text */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Search Keywords</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search description, email..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="w-full text-xs pl-9 pr-4 py-2 border border-slate-200 bg-slate-50 focus:bg-white rounded-md focus:border-slate-400 focus:outline-none transition-colors"
                    />
                  </div>
                </div>

                {/* Actor (Staff Dropdown) */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Acting User</label>
                  <select
                    value={selectedUser}
                    onChange={(e) => setSelectedUser(e.target.value)}
                    className="w-full text-xs px-3 py-2 border border-slate-200 bg-slate-50 rounded-md focus:border-slate-400 focus:outline-none transition-colors"
                  >
                    <option value="all">All Users</option>
                    {distinctUsers.map((u) => (
                      <option key={u.userId} value={u.userId}>
                        {u.userEmail} ({u.userRole})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Entity Type Dropdown */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Entity Model</label>
                  <select
                    value={selectedEntity}
                    onChange={(e) => setSelectedEntity(e.target.value)}
                    className="w-full text-xs px-3 py-2 border border-slate-200 bg-slate-50 rounded-md focus:border-slate-400 focus:outline-none transition-colors"
                  >
                    <option value="all">All Models</option>
                    {distinctEntities.map((e) => (
                      <option key={e} value={e}>
                        {e}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Action Filter */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Action Type</label>
                  <select
                    value={selectedAction}
                    onChange={(e) => setSelectedAction(e.target.value)}
                    className="w-full text-xs px-3 py-2 border border-slate-200 bg-slate-50 rounded-md focus:border-slate-400 focus:outline-none transition-colors"
                  >
                    <option value="all">All Actions</option>
                    <option value="CREATE">CREATE</option>
                    <option value="UPDATE">UPDATE</option>
                    <option value="DELETE">DELETE</option>
                  </select>
                </div>
              </div>

              {/* Date Filters & Action buttons */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 border-t border-slate-100 pt-4">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                    <input
                      type="date"
                      value={dateFrom}
                      onChange={(e) => setDateFrom(e.target.value)}
                      className="text-xs pl-8 pr-3 py-1.5 border border-slate-200 rounded-md focus:outline-none focus:border-slate-400"
                    />
                  </div>
                  <span className="text-slate-400 text-xs font-semibold">to</span>
                  <div className="relative">
                    <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                    <input
                      type="date"
                      value={dateTo}
                      onChange={(e) => setDateTo(e.target.value)}
                      className="text-xs pl-8 pr-3 py-1.5 border border-slate-200 rounded-md focus:outline-none focus:border-slate-400"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={clearFilters}
                    className="flex-1 sm:flex-none text-xs font-semibold px-4 py-2 border border-slate-200 rounded-md hover:bg-slate-50 text-slate-600 transition-colors"
                  >
                    Clear Filter
                  </button>
                  <button
                    type="submit"
                    className="flex-1 sm:flex-none text-xs font-semibold px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-md transition-colors"
                  >
                    Apply Filter
                  </button>
                </div>
              </div>
            </form>
          </div>

          {/* Audit Logs Table */}
          <div className="bg-white border border-slate-200 rounded-xl shadow-[0_1px_3px_rgba(0,0,0,0.04)] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/50">
                    <th className="px-5 py-3.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Action</th>
                    <th className="px-5 py-3.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider">User</th>
                    <th className="px-5 py-3.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Description</th>
                    <th className="px-5 py-3.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Entity Type</th>
                    <th className="px-5 py-3.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Record ID</th>
                    <th className="px-5 py-3.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Date & Time</th>
                    <th className="px-5 py-3.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-right">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {isLoading ? (
                    <tr>
                      <td colSpan={7} className="text-center py-20 text-slate-400 font-semibold text-xs">
                        <div className="flex flex-col items-center gap-3">
                          <RefreshCw className="w-6 h-6 text-slate-300 animate-spin" />
                          Refreshing audit trail records...
                        </div>
                      </td>
                    </tr>
                  ) : logs.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-20 text-slate-400 font-semibold text-xs">
                        No activity audit logs match the specified filters.
                      </td>
                    </tr>
                  ) : (
                    logs.map((log) => (
                      <tr
                        key={log.id}
                        className="hover:bg-slate-50/50 transition-colors group cursor-pointer"
                        onClick={() => {
                          setSelectedLog(log);
                          setShowModal(true);
                        }}
                      >
                        <td className="px-5 py-3.5 whitespace-nowrap">{renderActionBadge(log.action)}</td>
                        <td className="px-5 py-3.5 whitespace-nowrap">
                          <div className="flex flex-col">
                            <span className="text-xs font-semibold text-slate-800">{log.userEmail || "anonymous"}</span>
                            <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wide mt-0.5">{log.userRole || "STAFF"}</span>
                          </div>
                        </td>
                        <td className="px-5 py-3.5 text-xs text-slate-700 font-medium max-w-xs truncate">{log.description}</td>
                        <td className="px-5 py-3.5 text-xs font-semibold text-slate-600 whitespace-nowrap">{log.entityType}</td>
                        <td className="px-5 py-3.5 text-[11px] font-mono text-slate-400 whitespace-nowrap truncate max-w-[120px]" title={log.entityId}>
                          {log.entityId}
                        </td>
                        <td className="px-5 py-3.5 text-xs text-slate-500 whitespace-nowrap">{formatDateTime(log.timestamp)}</td>
                        <td className="px-5 py-3.5 whitespace-nowrap text-right" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => {
                              setSelectedLog(log);
                              setShowModal(true);
                            }}
                            className="p-1.5 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-colors"
                            title="View log details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Paginating Controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-5 py-4 border-t border-slate-100 bg-slate-50/30">
                <span className="text-xs font-semibold text-slate-500">
                  Showing <span className="font-bold text-slate-800">{(page - 1) * limit + 1}</span> to{" "}
                  <span className="font-bold text-slate-800">{Math.min(page * limit, total)}</span> of{" "}
                  <span className="font-bold text-slate-800">{total}</span> actions
                </span>

                <div className="flex items-center gap-1.5">
                  <button
                    disabled={page === 1}
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    className="p-1.5 text-slate-500 hover:text-slate-900 border border-slate-200 rounded hover:bg-white bg-slate-50 disabled:opacity-40 transition-all cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>

                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter(p => Math.abs(p - page) <= 2 || p === 1 || p === totalPages)
                    .map((p, idx, arr) => {
                      const showDots = idx > 0 && p - arr[idx - 1] > 1;
                      return (
                        <div key={p} className="flex items-center">
                          {showDots && <span className="text-xs text-slate-400 px-1">...</span>}
                          <button
                            onClick={() => setPage(p)}
                            className={`w-7 h-7 text-xs font-bold rounded flex items-center justify-center transition-all cursor-pointer ${page === p
                              ? "bg-slate-900 text-white shadow-sm"
                              : "text-slate-500 hover:text-slate-900 hover:bg-slate-100 hover:border-slate-300 border border-transparent"
                              }`}
                          >
                            {p}
                          </button>
                        </div>
                      );
                    })}

                  <button
                    disabled={page === totalPages}
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    className="p-1.5 text-slate-500 hover:text-slate-900 border border-slate-200 rounded hover:bg-white bg-slate-50 disabled:opacity-40 transition-all cursor-pointer"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Retention Policy Configurations */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white border border-slate-200 rounded-xl shadow-[0_1px_3px_rgba(0,0,0,0.04)] p-6">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-3 mb-6">
                <Clock className="w-4 h-4 text-slate-400" />
                <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Retention Policy Configuration</h2>
              </div>

              {settingsMessage && (
                <div
                  className={`p-4 border rounded-lg text-xs flex items-center gap-2 mb-6 ${settingsMessage.type === "success"
                    ? "bg-emerald-50 border-emerald-100 text-emerald-700"
                    : "bg-rose-50 border-rose-100 text-rose-700"
                    }`}
                >
                  <CheckCircle className="w-4 h-4 flex-shrink-0" />
                  {settingsMessage.text}
                </div>
              )}

              <div className="space-y-6">
                <div className="flex items-start gap-3">
                  <input
                    type="radio"
                    id="indefinite"
                    checked={isIndefinite}
                    onChange={() => setIsIndefinite(true)}
                    className="mt-1 h-4 w-4 border-slate-300 text-slate-900 focus:ring-slate-900 accent-slate-900 cursor-pointer"
                  />
                  <label htmlFor="indefinite" className="cursor-pointer">
                    <span className="block text-sm font-bold text-slate-800">Keep Logs Indefinitely</span>
                    <span className="block text-xs text-slate-500 mt-1">
                      No logs will ever be deleted automatically. Maximum security audit completeness. Ideal for long-term legal audit compliance.
                    </span>
                  </label>
                </div>

                <div className="flex items-start gap-3 border-t border-slate-100 pt-5">
                  <input
                    type="radio"
                    id="days"
                    checked={!isIndefinite}
                    onChange={() => setIsIndefinite(false)}
                    className="mt-1 h-4 w-4 border-slate-300 text-slate-900 focus:ring-slate-900 accent-slate-900 cursor-pointer"
                  />
                  <label htmlFor="days" className="cursor-pointer flex-1">
                    <span className="block text-sm font-bold text-slate-800">Keep Logs for a Fixed Duration</span>
                    <span className="block text-xs text-slate-500 mt-1 mb-4">
                      Logs older than the configured threshold will be automatically pruned. Useful to maintain database compactness.
                    </span>

                    {!isIndefinite && (
                      <div className="flex items-center gap-3 max-w-xs mt-3 animate-in slide-in-from-top-2 duration-200">
                        <input
                          type="number"
                          min={1}
                          max={3650}
                          value={retentionDays}
                          onChange={(e) => setRetentionDays(Math.max(1, parseInt(e.target.value) || 0))}
                          className="w-24 text-xs px-3 py-2 border border-slate-200 rounded-md focus:outline-none focus:border-slate-400"
                        />
                        <span className="text-xs font-semibold text-slate-500">Days</span>
                      </div>
                    )}
                  </label>
                </div>

                <div className="border-t border-slate-100 pt-5 flex justify-end">
                  <button
                    onClick={handleSaveSettings}
                    disabled={isSavingSettings || !canEdit}
                    title={!canEdit ? "You do not have permission to save settings configuration." : "Save settings"}
                    className="text-xs font-bold px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-md transition-colors flex items-center gap-2 shadow-sm disabled:opacity-55"
                  >
                    {isSavingSettings ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        Saving configurations...
                      </>
                    ) : (
                      "Save Configuration"
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Danger Zone: Manual Maintenance */}
          <div className="space-y-6">
            <div className="bg-white border border-rose-100 rounded-xl shadow-[0_1px_3px_rgba(0,0,0,0.04)] overflow-hidden">
              <div className="flex items-center gap-2 px-6 py-4 border-b border-rose-50 bg-rose-50/20">
                <ShieldAlert className="w-4 h-4 text-rose-600" />
                <h2 className="text-sm font-bold text-rose-900 uppercase tracking-wider">Danger Zone & Maintenance</h2>
              </div>
              <div className="p-6 space-y-4">
                <p className="text-xs text-slate-500 leading-relaxed">
                  Manually force database cleaning of old logs. Prunes all database logs strictly older than the active configured threshold. This action is irreversible.
                </p>

                {showPruneConfirm ? (
                  <div className="bg-rose-50/50 border border-rose-100 p-4 rounded-lg space-y-3 animate-in zoom-in-95 duration-150">
                    <span className="block text-xs font-bold text-rose-900">Are you absolutely sure?</span>
                    <p className="text-[11px] text-rose-700 leading-relaxed">
                      Confirming this operation will permanently drop old logs. There is no backup undo mechanism.
                    </p>
                    <div className="flex items-center gap-2 pt-1">
                      <button
                        onClick={() => setShowPruneConfirm(false)}
                        className="text-[10px] font-bold px-3 py-1.5 border border-slate-200 hover:bg-slate-50 rounded bg-white text-slate-600"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleManualPrune}
                        disabled={isPruning}
                        className="text-[10px] font-bold px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded transition-all"
                      >
                        {isPruning ? "Pruning Database..." : "Yes, Prune Database"}
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowPruneConfirm(true)}
                    disabled={!canDelete}
                    title={!canDelete ? "You do not have permission to prune logs." : "Force prune database"}
                    className="w-full text-xs font-bold py-2 border border-rose-200 hover:bg-rose-50/30 text-rose-700 rounded-md transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-55"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Force Prune Database Logs
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Log Details Modal (Enterprise Side-drawer / Modal overlay) */}
      {showModal && selectedLog && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[85vh] overflow-hidden border border-slate-200 animate-in zoom-in-95 duration-200 flex flex-col">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50 shrink-0">
              <div className="flex items-center gap-3">
                {renderActionBadge(selectedLog.action)}
                <div>
                  <h2 className="text-md font-bold text-slate-900 flex items-center gap-2">
                    Action Details for {selectedLog.entityType}
                  </h2>
                  <span className="text-[11px] font-mono text-slate-400 mt-0.5 block">{selectedLog.id}</span>
                </div>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-md transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Scrollable Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Top Summary Banner */}
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Human readable description</span>
                <p className="text-sm font-bold text-slate-800 mt-1">{selectedLog.description}</p>
              </div>

              {/* Grid Metadata details */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* WHO column */}
                <div className="bg-slate-50/50 border border-slate-100 p-4 rounded-lg space-y-3">
                  <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
                    <User className="w-4 h-4 text-slate-400" />
                    <span className="text-xs font-bold uppercase text-slate-500 tracking-wider">Who</span>
                  </div>
                  <div className="space-y-1 text-xs">
                    <span className="block text-slate-500">Actor Email:</span>
                    <span className="block font-bold text-slate-800">{selectedLog.userEmail || "anonymous"}</span>
                    <span className="block text-slate-500 mt-2">Actor UUID:</span>
                    <span className="block font-mono text-[10px] text-slate-400 truncate" title={selectedLog.userId}>{selectedLog.userId}</span>
                    <span className="block text-slate-500 mt-2">Designated Role:</span>
                    <span className="block font-bold text-slate-800">{selectedLog.userRole || "STAFF"}</span>
                  </div>
                </div>

                {/* WHEN column */}
                <div className="bg-slate-50/50 border border-slate-100 p-4 rounded-lg space-y-3">
                  <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
                    <Clock className="w-4 h-4 text-slate-400" />
                    <span className="text-xs font-bold uppercase text-slate-500 tracking-wider">When</span>
                  </div>
                  <div className="space-y-1 text-xs">
                    <span className="block text-slate-500">Precise Timestamp:</span>
                    <span className="block font-bold text-slate-800">{formatDateTime(selectedLog.timestamp)}</span>
                    <span className="block text-slate-500 mt-2">Full ISO String:</span>
                    <span className="block font-mono text-[10px] text-slate-400">
                      {selectedLog.timestamp instanceof Date
                        ? selectedLog.timestamp.toISOString()
                        : new Date(selectedLog.timestamp).toISOString()}
                    </span>
                  </div>
                </div>

                {/* WHERE column */}
                <div className="bg-slate-50/50 border border-slate-100 p-4 rounded-lg space-y-3">
                  <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
                    <Globe className="w-4 h-4 text-slate-400" />
                    <span className="text-xs font-bold uppercase text-slate-500 tracking-wider">Where</span>
                  </div>
                  <div className="space-y-1 text-xs">
                    <span className="block text-slate-500">Client IP Address:</span>
                    <span className="block font-bold text-slate-800">
                      {(() => {
                        const ip = selectedLog.ipAddress;
                        if (!ip || ip === "unknown") return "Unknown";
                        if (ip === "::1" || ip === "127.0.0.1") return "127.0.0.1 (Localhost)";
                        return ip;
                      })()}
                    </span>
                    <span className="block text-slate-500 mt-2">Operating User Agent:</span>
                    <span className="block text-slate-600 text-[11px] wrap-normal" title={selectedLog.userAgent}>
                      {selectedLog.userAgent || "No Agent Metadata"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Data transformations diff matrix */}
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 border-b border-slate-100 pb-2 mb-4">
                  Data Snapshot State Diff
                </h3>

                {/* Diff Viewer Grid */}
                {(() => {
                  const diff = getJsonDiff(selectedLog.dataBefore, selectedLog.dataAfter);

                  if (selectedLog.action === "CREATE") {
                    const createdData = selectedLog.dataAfter ? (typeof selectedLog.dataAfter === "string" ? JSON.parse(selectedLog.dataAfter) : selectedLog.dataAfter) : null;
                    if (!createdData) return <span className="text-xs text-slate-500">No snapshot records captured.</span>;

                    return (
                      <div className="border border-slate-200 rounded-lg overflow-hidden">
                        <div className="bg-emerald-50 px-4 py-2 border-b border-emerald-100 flex items-center gap-2">
                          <CheckCircle className="w-4 h-4 text-emerald-600" />
                          <span className="text-xs font-bold text-emerald-800">Fresh record successfully instantiated:</span>
                        </div>
                        <div className="p-4 bg-slate-50/50 max-h-[300px] overflow-y-auto">
                          <pre className="text-[11px] font-mono text-slate-600">{JSON.stringify(createdData, null, 2)}</pre>
                        </div>
                      </div>
                    );
                  }

                  if (selectedLog.action === "DELETE") {
                    const deletedData = selectedLog.dataBefore ? (typeof selectedLog.dataBefore === "string" ? JSON.parse(selectedLog.dataBefore) : selectedLog.dataBefore) : null;
                    if (!deletedData) return <span className="text-xs text-slate-500">No snapshot records captured.</span>;

                    return (
                      <div className="border border-slate-200 rounded-lg overflow-hidden">
                        <div className="bg-rose-50 px-4 py-2 border-b border-rose-100 flex items-center gap-2">
                          <Trash2 className="w-4 h-4 text-rose-600" />
                          <span className="text-xs font-bold text-rose-800">Dropped/Deleted database state:</span>
                        </div>
                        <div className="p-4 bg-slate-50/50 max-h-[300px] overflow-y-auto">
                          <pre className="text-[11px] font-mono text-slate-600">{JSON.stringify(deletedData, null, 2)}</pre>
                        </div>
                      </div>
                    );
                  }

                  if (diff.length === 0) {
                    return (
                      <div className="bg-slate-50/50 border border-slate-200 p-4 rounded-lg text-xs text-slate-500 text-center">
                        No auditable field transformations registered between snapshot states.
                      </div>
                    );
                  }

                  return (
                    <div className="border border-slate-200 rounded-lg overflow-hidden">
                      <div className="bg-sky-50 px-4 py-2 border-b border-sky-100 flex items-center gap-2">
                        <FileCode className="w-4 h-4 text-sky-600" />
                        <span className="text-xs font-bold text-sky-800">Modified fields & state properties ({diff.length}):</span>
                      </div>
                      <div className="divide-y divide-slate-100 bg-white">
                        {diff.map((item) => (
                          <div key={item.key} className="grid grid-cols-1 md:grid-cols-12 gap-3 p-3.5 hover:bg-slate-50/50 transition-colors">
                            {/* Property name */}
                            <div className="md:col-span-3 flex items-center">
                              <span className="text-xs font-bold text-slate-700 font-mono tracking-tight">{item.key}</span>
                            </div>

                            {/* Before change */}
                            <div className="md:col-span-4 bg-rose-50/50 border border-rose-100/50 p-2.5 rounded text-xs flex flex-col justify-center min-h-[50px]">
                              <span className="text-[9px] font-bold text-rose-500 uppercase tracking-wide mb-1">Before Mutation</span>
                              <div className="font-mono text-[11px] text-rose-700 line-through whitespace-pre-wrap break-words">
                                {formatValue(item.before, item.key)}
                              </div>
                            </div>

                            {/* Center Arrow */}
                            <div className="md:col-span-1 flex items-center justify-center">
                              <ArrowRight className="w-4 h-4 text-slate-400" />
                            </div>

                            {/* After change */}
                            <div className="md:col-span-4 bg-emerald-50/50 border border-emerald-100/50 p-2.5 rounded text-xs flex flex-col justify-center min-h-[50px]">
                              <span className="text-[9px] font-bold text-emerald-500 uppercase tracking-wide mb-1">After Mutation</span>
                              <div className="font-mono text-[11px] text-emerald-800 font-semibold whitespace-pre-wrap break-words">
                                {formatValue(item.after, item.key)}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end shrink-0">
              <button
                onClick={() => setShowModal(false)}
                className="h-10 px-5 border border-slate-200 hover:bg-slate-100 rounded-md text-sm font-semibold text-slate-700 bg-white transition-colors cursor-pointer"
              >
                Close details
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
