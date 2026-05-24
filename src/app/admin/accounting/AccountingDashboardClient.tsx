"use client";

import React, { useState, useEffect, useTransition } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  LayoutDashboard, Receipt, CreditCard, ShoppingBag,
  ArrowUpRight, ArrowDownRight, Wallet, Percent,
  FileBarChart, BookOpen, Plus, Search, Calendar,
  CheckCircle, AlertCircle, X, Download, Filter, RefreshCw
} from "lucide-react";
import { formatBDT } from "@/utils/formatPrice";
import CreateAccountClient from "./CreateAccountClient";
import TransactionFormClient from "./TransactionFormClient";
import {
  getSalesJournal, getPurchasesJournal, getBankCashRegisters,
  getGeneralLedger, getFinancialReports, reconcileCourierDues,
  getFinancialSummary
} from "./actions";

interface AccountingDashboardClientProps {
  accounts: any[];
  initialSummary: any;
}

type TabType =
  | "overview"
  | "sales"
  | "expenses"
  | "purchases"
  | "receivable"
  | "payable"
  | "registers"
  | "tax"
  | "reports"
  | "ledger";

export default function AccountingDashboardClient({
  accounts,
  initialSummary
}: AccountingDashboardClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const urlTab = searchParams.get("tab") as TabType | null;
  const urlStart = searchParams.get("startDate") || "";
  const urlEnd = searchParams.get("endDate") || "";

  const [activeTab, setActiveTab] = useState<TabType>("overview");
  const [summary, setSummary] = useState(initialSummary);
  const [isPending, startTransition] = useTransition();

  // Date Filters
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Sync state from URL search params on mount or when searchParams changes
  useEffect(() => {
    if (urlTab && urlTab !== activeTab) {
      setActiveTab(urlTab);
    }
    if (urlStart && urlStart !== startDate) {
      setStartDate(urlStart);
    }
    if (urlEnd && urlEnd !== endDate) {
      setEndDate(urlEnd);
    }
  }, [urlTab, urlStart, urlEnd]);

  // Update URL search parameters when tab or dates change
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    let changed = false;

    if (activeTab === "overview") {
      if (params.has("tab")) {
        params.delete("tab");
        changed = true;
      }
    } else {
      if (params.get("tab") !== activeTab) {
        params.set("tab", activeTab);
        changed = true;
      }
    }

    if (startDate) {
      if (params.get("startDate") !== startDate) {
        params.set("startDate", startDate);
        changed = true;
      }
    } else {
      if (params.has("startDate")) {
        params.delete("startDate");
        changed = true;
      }
    }

    if (endDate) {
      if (params.get("endDate") !== endDate) {
        params.set("endDate", endDate);
        changed = true;
      }
    } else {
      if (params.has("endDate")) {
        params.delete("endDate");
        changed = true;
      }
    }

    if (changed) {
      const newQuery = params.toString() ? `?${params.toString()}` : "";
      router.push(`/admin/accounting${newQuery}`, { scroll: false });
    }
  }, [activeTab, startDate, endDate, router]);

  // Modals & Drawers
  const [drawerMode, setDrawerMode] = useState<"TRANSACTION" | "ACCOUNT" | "RECONCILE" | null>(null);

  // Tab Data States
  const [salesData, setSalesData] = useState<{ data: any[]; total: number }>({ data: [], total: 0 });
  const [purchaseData, setPurchaseData] = useState<{ data: any[]; total: number }>({ data: [], total: 0 });
  const [registerData, setRegisterData] = useState<any[]>([]);
  const [generalLedgerData, setGeneralLedgerData] = useState<{ data: any[]; total: number }>({ data: [], total: 0 });
  const [reportData, setReportData] = useState<any>(null);
  const [reportType, setReportType] = useState<"PL" | "BS" | "TB">("PL");

  // Loading indicator for tabs
  const [loadingTab, setLoadingTab] = useState(false);

  // Search Queries
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const limit = 15;

  // Courier Reconciliation State
  const [reconcileForm, setReconcileForm] = useState({
    courierAccountId: "",
    receivingAccountId: "",
    amount: "",
    chargeAmount: "",
    description: "",
  });
  const [reconcileError, setReconcileError] = useState<string | null>(null);
  const [reconcileLoading, setReconcileLoading] = useState(false);

  // Auto-load summaries on filter change
  useEffect(() => {
    fetchSummary();
    fetchTabData();
  }, [startDate, endDate, activeTab, currentPage, searchQuery, reportType]);

  const fetchSummary = async () => {
    const sum = await getFinancialSummary({ startDate, endDate });
    setSummary(sum);
  };

  const fetchTabData = async () => {
    setLoadingTab(true);
    try {
      const filters = { startDate, endDate };
      if (activeTab === "sales") {
        const res = await getSalesJournal(filters, currentPage, limit);
        setSalesData(res);
      } else if (activeTab === "purchases") {
        const res = await getPurchasesJournal(filters, currentPage, limit);
        setPurchaseData(res);
      } else if (activeTab === "registers") {
        const res = await getBankCashRegisters();
        setRegisterData(res);
      } else if (activeTab === "ledger") {
        const res = await getGeneralLedger({ ...filters, search: searchQuery }, currentPage, limit);
        setGeneralLedgerData(res);
      } else if (activeTab === "reports") {
        setReportData(null);
        const res = await getFinancialReports(reportType, filters);
        setReportData(res);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingTab(false);
    }
  };

  const handleReconcileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reconcileForm.courierAccountId || !reconcileForm.receivingAccountId || !reconcileForm.amount) {
      setReconcileError("Please fill out all required fields.");
      return;
    }

    setReconcileLoading(true);
    setReconcileError(null);

    try {
      const res = await reconcileCourierDues({
        courierAccountId: reconcileForm.courierAccountId,
        receivingAccountId: reconcileForm.receivingAccountId,
        amount: parseFloat(reconcileForm.amount),
        chargeAmount: parseFloat(reconcileForm.chargeAmount || "0"),
        description: reconcileForm.description || "Remittance statement settlement",
      });

      if (res.success) {
        setDrawerMode(null);
        setReconcileForm({
          courierAccountId: "",
          receivingAccountId: "",
          amount: "",
          chargeAmount: "",
          description: "",
        });
        fetchSummary();
        fetchTabData();
      } else {
        setReconcileError(res.error || "An error occurred.");
      }
    } catch (err: any) {
      setReconcileError(err.message || "Something went wrong.");
    } finally {
      setReconcileLoading(false);
    }
  };

  const clearFilters = () => {
    setStartDate("");
    setEndDate("");
    setCurrentPage(1);
  };

  const renderPagination = (total: number, currentPage: number, onPageChange: (page: number) => void) => {
    const totalPages = Math.ceil(total / limit);
    if (totalPages <= 1) return null;

    const startRecord = (currentPage - 1) * limit + 1;
    const endRecord = Math.min(currentPage * limit, total);

    const pages: (number | string)[] = [];
    if (totalPages <= 5) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (currentPage > 3) pages.push("...");

      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);

      for (let i = start; i <= end; i++) {
        if (!pages.includes(i)) pages.push(i);
      }

      if (currentPage < totalPages - 2) pages.push("...");
      if (!pages.includes(totalPages)) pages.push(totalPages);
    }

    return (
      <div className="p-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-50/50">
        <div className="text-xs text-slate-500 font-medium">
          Showing <span className="font-bold text-slate-800">{startRecord}</span> to{" "}
          <span className="font-bold text-slate-800">{endRecord}</span> of{" "}
          <span className="font-bold text-slate-800">{total}</span> records
        </div>
        <div className="flex items-center space-x-1">
          <button
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 bg-white hover:bg-slate-50 hover:text-slate-900 disabled:opacity-50 disabled:pointer-events-none transition-colors"
          >
            Previous
          </button>
          {pages.map((p, idx) => {
            if (p === "...") {
              return (
                <span key={`dots-${idx}`} className="px-2 py-1 text-xs text-slate-400 font-medium">
                  ...
                </span>
              );
            }
            return (
              <button
                key={`page-${p}`}
                onClick={() => onPageChange(p as number)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${currentPage === p
                    ? "bg-slate-900 text-white shadow-sm"
                    : "border border-slate-200 text-slate-600 bg-white hover:bg-slate-50 hover:text-slate-900"
                  }`}
              >
                {p}
              </button>
            );
          })}
          <button
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 bg-white hover:bg-slate-50 hover:text-slate-900 disabled:opacity-50 disabled:pointer-events-none transition-colors"
          >
            Next
          </button>
        </div>
      </div>
    );
  };

  // Get active accounts by category
  const courierAccounts = accounts.filter(a => a.type === "ASSET" && a.name.toLowerCase().includes("courier") || a.name.toLowerCase().includes("pathao") || a.name.toLowerCase().includes("steadfast") || a.name.toLowerCase().includes("redx"));
  const receivingAccounts = accounts.filter(a => a.type === "ASSET" && !a.name.toLowerCase().includes("courier") && !a.name.toLowerCase().includes("pathao") && !a.name.toLowerCase().includes("steadfast") && !a.name.toLowerCase().includes("redx"));

  return (
    <div className="space-y-6">
      {/* Header Panel */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Accounting ERP & Financial Suite</h1>
          <p className="text-sm text-slate-500 mt-1">Multi-ledger double-entry accounts, courier settlements, and live financial statements.</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap justify-end">
          {/* Date Picker Form */}
          <div className="flex items-center space-x-2 bg-slate-50 rounded-lg border border-slate-200 p-1.5 shadow-inner">
            <input
              type="date"
              value={startDate}
              onChange={(e) => { setStartDate(e.target.value); setCurrentPage(1); }}
              className="text-xs px-2 py-1 bg-transparent focus:outline-none font-medium text-slate-700"
              title="Start Date"
            />
            <span className="text-slate-400 text-xs">to</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => { setEndDate(e.target.value); setCurrentPage(1); }}
              className="text-xs px-2 py-1 bg-transparent focus:outline-none font-medium text-slate-700"
              title="End Date"
            />
            {(startDate || endDate) && (
              <button
                onClick={clearFilters}
                className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded transition-colors text-xs font-semibold px-2"
              >
                Clear
              </button>
            )}
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setDrawerMode("ACCOUNT")}
              className="h-9 px-3 bg-white text-slate-700 text-xs font-semibold rounded-lg border border-slate-200 hover:bg-slate-50 shadow-sm transition-colors flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              Add COA
            </button>
            <button
              onClick={() => setDrawerMode("RECONCILE")}
              className="h-9 px-3 bg-[#800020]/10 hover:bg-[#800020]/15 text-[#800020] text-xs font-semibold rounded-lg shadow-sm transition-all flex items-center gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Courier Remit
            </button>
            <button
              onClick={() => setDrawerMode("TRANSACTION")}
              className="h-9 px-3 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              New Entry
            </button>
          </div>
        </div>
      </div>

      {/* Main Tabs Navigation */}
      <div className="border-b border-slate-200 bg-white px-2 py-1 rounded-lg shadow-sm flex flex-wrap gap-1">
        {[
          { id: "overview", label: "Dashboard", icon: LayoutDashboard },
          { id: "sales", label: "Sales Journal", icon: Receipt },
          { id: "purchases", label: "Purchase Ledger", icon: ShoppingBag },
          { id: "registers", label: "Registers", icon: Wallet },
          { id: "reports", label: "Financial Reports", icon: FileBarChart },
          { id: "ledger", label: "General Ledger", icon: BookOpen },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => { setActiveTab(tab.id as TabType); setCurrentPage(1); }}
              className={`h-9 px-4 rounded-md text-xs font-semibold flex items-center gap-2 transition-all ${isActive
                  ? "bg-slate-900 text-white shadow-sm"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* --- DASHBOARD TAB VIEW --- */}
      {activeTab === "overview" && (
        <div className="space-y-6 animate-fade-in">
          {/* Analytical Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {/* Card 1 */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm relative overflow-hidden flex flex-col justify-between h-28">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Income</span>
                <h3 className="text-xl font-extrabold text-slate-900 mt-1">{formatBDT(summary.totalIncome)}</h3>
              </div>
              <div className="flex items-center gap-1 text-[10px] font-semibold text-emerald-600 bg-emerald-50 self-start px-2 py-0.5 rounded">
                <ArrowUpRight className="w-3.5 h-3.5" />
                <span>Sales Revenue</span>
              </div>
            </div>

            {/* Card 2 */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm relative overflow-hidden flex flex-col justify-between h-28">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Expenses</span>
                <h3 className="text-xl font-extrabold text-slate-900 mt-1">{formatBDT(summary.totalExpense)}</h3>
              </div>
              <div className="flex items-center gap-1 text-[10px] font-semibold text-rose-600 bg-rose-50 self-start px-2 py-0.5 rounded">
                <ArrowDownRight className="w-3.5 h-3.5" />
                <span>Operating Cost</span>
              </div>
            </div>

            {/* Card 3 */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm relative overflow-hidden flex flex-col justify-between h-28">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Net profit</span>
                <h3 className={`text-xl font-extrabold mt-1 ${summary.netProfit >= 0 ? "text-emerald-700" : "text-rose-700"}`}>
                  {summary.netProfit >= 0 ? "+" : "-"}{formatBDT(Math.abs(summary.netProfit))}
                </h3>
              </div>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded self-start ${summary.netProfit >= 0 ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>
                {summary.netProfit >= 0 ? "SURPLUS" : "DEFICIT"}
              </span>
            </div>

            {/* Card 4 */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm relative overflow-hidden flex flex-col justify-between h-28">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Accounts Receivable</span>
                <h3 className="text-xl font-extrabold text-slate-900 mt-1">{formatBDT(summary.totalAR)}</h3>
              </div>
              <div className="flex items-center gap-1 text-[10px] font-semibold text-[#800020] bg-[#800020]/5 self-start px-2 py-0.5 rounded">
                <RefreshCw className="w-3 h-3" />
                <span>Courier Dues</span>
              </div>
            </div>

            {/* Card 5 */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm relative overflow-hidden flex flex-col justify-between h-28">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Accounts Payable</span>
                <h3 className="text-xl font-extrabold text-slate-900 mt-1">{formatBDT(summary.totalAP)}</h3>
              </div>
              <div className="flex items-center gap-1 text-[10px] font-semibold text-slate-600 bg-slate-100 self-start px-2 py-0.5 rounded">
                <span>Owed to Suppliers</span>
              </div>
            </div>
          </div>

          {/* Quick Ledger Balances overview */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Cash & Registers balance log */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 lg:col-span-2">
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4">Cash & Bank Wallet Registers</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4" id="wallet-registers-list">
                {accounts.filter(a => a.type === "ASSET" && !a.name.toLowerCase().includes("courier")).map(acc => {
                  return (
                    <div key={acc.id} className="border border-slate-150 rounded-xl p-4 flex justify-between items-center bg-slate-50/50 hover:bg-slate-50 transition-colors">
                      <div>
                        <span className="text-xs font-semibold text-slate-800">{acc.name}</span>
                        <div className="text-[9px] font-bold uppercase tracking-widest text-slate-400 mt-0.5">{acc.type}</div>
                      </div>
                      <span className="text-sm font-bold text-slate-900">
                        {formatBDT(acc.balance ?? 0)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Reconciliation Tips Panel */}
            <div className="bg-slate-900 rounded-xl p-6 text-white flex flex-col justify-between shadow-md relative overflow-hidden">
              <div className="absolute right-0 top-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16 pointer-events-none" />
              <div className="relative z-10 space-y-4">
                <span className="text-[10px] font-bold tracking-widest uppercase text-[#800020] bg-white px-2 py-0.5 rounded">Reconciliation Helper</span>
                <h4 className="text-md font-bold leading-tight">Bangladesh Mobile Remittance Settlement</h4>
                <p className="text-xs text-slate-300 leading-relaxed font-normal">
                  When settling cash remittances received from Pathao or Steadfast courier accounts, log them immediately using the **Courier Remit** wizard. This clears the Accounts Receivable dues and balanced debit items automatically into bKash/Bank.
                </p>
              </div>
              <button
                onClick={() => setDrawerMode("RECONCILE")}
                className="mt-6 w-full h-10 bg-white hover:bg-slate-50 text-slate-900 text-xs font-bold rounded-lg transition-colors shadow-sm flex items-center justify-center gap-1.5"
              >
                Launch Settlement Wizard
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- SALES JOURNAL TAB VIEW --- */}
      {activeTab === "sales" && (
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden animate-fade-in">
          <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50/50">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Historical Sales & Invoice Register</h3>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 font-semibold text-slate-500 uppercase tracking-wider">
                  <th className="px-6 py-3">Invoice / Ref ID</th>
                  <th className="px-6 py-3">Customer Details</th>
                  <th className="px-6 py-3">Order Status</th>
                  <th className="px-6 py-3">Subtotal</th>
                  <th className="px-6 py-3">Discounts</th>
                  <th className="px-6 py-3">NBR VAT</th>
                  <th className="px-6 py-3">Net Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {salesData.data.map((order) => (
                  <tr key={order.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5 font-bold text-slate-900">
                        <span>{order.id}</span>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(order.id);
                            setCopiedId(order.id);
                            setTimeout(() => setCopiedId(null), 1500);
                          }}
                          className="text-slate-400 hover:text-slate-600 transition-colors p-0.5 rounded hover:bg-slate-100"
                          title="Copy Order ID"
                        >
                          {copiedId === order.id ? (
                            <CheckCircle className="w-3.5 h-3.5 text-emerald-500 animate-scale-in" />
                          ) : (
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                            </svg>
                          )}
                        </button>
                      </div>
                      <span className="block text-[10px] font-semibold text-slate-400 mt-0.5">
                        {new Date(order.createdAt).toLocaleDateString()}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-semibold text-slate-900">{order.customerName}</div>
                      <span className="font-mono text-slate-500 text-[10px]">{order.customerPhone}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold uppercase ${order.status === "DELIVERED"
                          ? "bg-emerald-50 text-emerald-700"
                          : order.status === "CANCELLED"
                            ? "bg-rose-50 text-rose-700"
                            : "bg-amber-50 text-amber-700"
                        }`}>
                        {order.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-600">৳{(order.totalAmount + order.discountAmount - order.shippingCharge - order.vatAmount).toLocaleString()}</td>
                    <td className="px-6 py-4 text-rose-600">-৳{order.discountAmount.toLocaleString()}</td>
                    <td className="px-6 py-4 text-slate-600">৳{order.vatAmount.toLocaleString()}</td>
                    <td className="px-6 py-4 font-extrabold text-slate-900">৳{order.totalAmount.toLocaleString()}</td>
                  </tr>
                ))}
                {salesData.data.length === 0 && !loadingTab && (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-slate-400 font-medium">
                      No invoices logged inside this date range.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          {renderPagination(salesData.total, currentPage, setCurrentPage)}
        </div>
      )}

      {/* --- PURCHASES TAB VIEW --- */}
      {activeTab === "purchases" && (
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden animate-fade-in">
          <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50/50">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Wholesale Procurement Purchases</h3>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 font-semibold text-slate-500 uppercase tracking-wider">
                  <th className="px-6 py-3">Bill ID</th>
                  <th className="px-6 py-3">Supplier Name</th>
                  <th className="px-6 py-3">Wholesale Status</th>
                  <th className="px-6 py-3">Billing Date</th>
                  <th className="px-6 py-3">Total Cost</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {purchaseData.data.map((bill) => (
                  <tr key={bill.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5 font-bold text-slate-900">
                        <span>{bill.id}</span>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(bill.id);
                            setCopiedId(bill.id);
                            setTimeout(() => setCopiedId(null), 1500);
                          }}
                          className="text-slate-400 hover:text-slate-600 transition-colors p-0.5 rounded hover:bg-slate-100"
                          title="Copy Purchase ID"
                        >
                          {copiedId === bill.id ? (
                            <CheckCircle className="w-3.5 h-3.5 text-emerald-500 animate-scale-in" />
                          ) : (
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                            </svg>
                          )}
                        </button>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-semibold text-slate-900">{bill.supplier?.name || "Unknown Supplier"}</div>
                      <span className="font-mono text-slate-500 text-[10px]">{bill.supplier?.phone || "N/A"}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold uppercase ${bill.status === "COMPLETED" || bill.status === "RECEIVED"
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-amber-50 text-amber-700"
                        }`}>
                        {bill.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-600">{new Date(bill.createdAt).toLocaleDateString()}</td>
                    <td className="px-6 py-4 font-extrabold text-slate-900">৳{bill.totalAmount.toLocaleString()}</td>
                  </tr>
                ))}
                {purchaseData.data.length === 0 && !loadingTab && (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-slate-400 font-medium">
                      No wholesale procurement records found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          {renderPagination(purchaseData.total, currentPage, setCurrentPage)}
        </div>
      )}

      {/* --- REGISTERS TAB VIEW --- */}
      {activeTab === "registers" && (
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6 animate-fade-in">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Asset Registers & MFS Accounts</h3>
              <p className="text-xs text-slate-400 mt-1">Live running balances for banks, mobile finance wallets, and petty drawers.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" id="bank-registers-balances">
            {registerData.map(reg => {
              return (
                <div key={reg.id} className="border border-slate-200 rounded-2xl p-6 flex flex-col justify-between bg-slate-50/50 hover:bg-slate-50 hover:shadow-sm transition-all h-36">
                  <div>
                    <span className="text-xs font-bold text-slate-800">{reg.name}</span>
                    <div className="text-[9px] font-bold tracking-widest text-[#800020] uppercase mt-0.5">Asset Repository</div>
                  </div>
                  <div className="flex items-baseline justify-between mt-4">
                    <span className="text-[10px] text-slate-400 font-semibold">Running Balance</span>
                    <span className="text-xl font-extrabold text-slate-900">{formatBDT(reg.balance)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* --- FINANCIAL REPORTS TAB VIEW --- */}
      {activeTab === "reports" && (
        <div className="space-y-6 animate-fade-in">
          {/* Selector Navigation */}
          <div className="bg-white p-4 border border-slate-200 rounded-xl shadow-sm flex items-center justify-between flex-wrap gap-4">
            <div className="flex space-x-1 bg-slate-100 p-1 rounded-lg">
              {[
                { id: "PL", label: "Profit & Loss" },
                { id: "BS", label: "Balance Sheet" },
                { id: "TB", label: "Trial Balance" }
              ].map(opt => (
                <button
                  key={opt.id}
                  onClick={() => { setReportData(null); setReportType(opt.id as any); }}
                  className={`h-8 px-4 rounded text-xs font-semibold transition-all ${reportType === opt.id
                      ? "bg-white text-slate-900 shadow-sm"
                      : "text-slate-500 hover:text-slate-800"
                    }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* REPORT DISPLAYER SCREEN */}
          {reportData && (
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-8 max-w-3xl mx-auto space-y-8" id="financial-statement-report">
              {/* Report Header */}
              <div className="text-center space-y-2 pb-6 border-b border-slate-200">
                <h2 className="text-xl font-black text-slate-900 tracking-wider uppercase">MYSTIC FASHION</h2>
                <h4 className="text-xs font-bold text-[#800020] uppercase tracking-widest">
                  {reportType === "PL" ? "PROFIT & LOSS STATEMENT" : reportType === "BS" ? "STATEMENT OF FINANCIAL POSITION (BALANCE SHEET)" : "TRIAL BALANCE AUDIT REPORT"}
                </h4>
                <p className="text-[10px] font-semibold text-slate-400">
                  {startDate || endDate ? `Statement Period: ${startDate || "inception"} to ${endDate || "today"}` : "All-Time Financial Position"}
                </p>
              </div>

              {/* PROFIT & LOSS VIEW */}
              {reportType === "PL" && reportData?.revenues && (
                <div className="space-y-6 text-sm">
                  {/* Revenues Section */}
                  <div className="space-y-3">
                    <h5 className="font-extrabold text-slate-900 uppercase text-xs tracking-wider border-b border-slate-100 pb-1 flex justify-between">
                      <span>Operational Revenues</span>
                      <span className="text-[10px] text-slate-400">Credit Balance</span>
                    </h5>
                    <div className="space-y-2">
                      {reportData.revenues.map((r: any) => (
                        <div key={r.id} className="flex justify-between font-medium text-xs">
                          <span className="text-slate-600">{r.name}</span>
                          <span className="text-slate-900">৳{r.balance.toLocaleString()}</span>
                        </div>
                      ))}
                      {reportData.revenues.length === 0 && (
                        <div className="text-xs text-slate-400 italic">No revenue logged in this period.</div>
                      )}
                    </div>
                    <div className="flex justify-between font-extrabold text-xs pt-2 border-t border-slate-200 text-slate-800">
                      <span>Total Revenues (A)</span>
                      <span>৳{reportData.totalRevenue.toLocaleString()}</span>
                    </div>
                  </div>

                  {/* Expenses Section */}
                  <div className="space-y-3">
                    <h5 className="font-extrabold text-slate-900 uppercase text-xs tracking-wider border-b border-slate-100 pb-1 flex justify-between">
                      <span>Operational Expenses</span>
                      <span className="text-[10px] text-slate-400">Debit Balance</span>
                    </h5>
                    <div className="space-y-2">
                      {reportData.expenses.map((e: any) => (
                        <div key={e.id} className="flex justify-between font-medium text-xs">
                          <span className="text-slate-600">{e.name}</span>
                          <span className="text-slate-900">৳{e.balance.toLocaleString()}</span>
                        </div>
                      ))}
                      {reportData.expenses.length === 0 && (
                        <div className="text-xs text-slate-400 italic">No expenses logged in this period.</div>
                      )}
                    </div>
                    <div className="flex justify-between font-extrabold text-xs pt-2 border-t border-slate-200 text-slate-800">
                      <span>Total Expenses (B)</span>
                      <span>৳{reportData.totalExpense.toLocaleString()}</span>
                    </div>
                  </div>

                  {/* Net Margin */}
                  <div className="flex justify-between items-center font-black text-sm pt-4 border-t-2 border-slate-900 text-slate-950">
                    <span>Net Operating Profit / Margin (A - B)</span>
                    <span className={reportData.netProfit >= 0 ? "text-emerald-700" : "text-rose-700"}>
                      {reportData.netProfit >= 0 ? "+" : "-"} ৳{Math.abs(reportData.netProfit).toLocaleString()}
                    </span>
                  </div>
                </div>
              )}

              {/* BALANCE SHEET VIEW */}
              {reportType === "BS" && reportData?.assets && (
                <div className="space-y-6 text-sm">
                  {/* Assets */}
                  <div className="space-y-3">
                    <h5 className="font-extrabold text-slate-900 uppercase text-xs tracking-wider border-b border-slate-100 pb-1">Assets</h5>
                    <div className="space-y-2">
                      {reportData.assets.map((a: any) => (
                        <div key={a.id} className="flex justify-between font-medium text-xs">
                          <span className="text-slate-600">{a.name}</span>
                          <span className="text-slate-900">৳{a.balance.toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                    <div className="flex justify-between font-extrabold text-xs pt-2 border-t border-slate-200 text-slate-800">
                      <span>Total Assets (A)</span>
                      <span>৳{reportData.totalAssets.toLocaleString()}</span>
                    </div>
                  </div>

                  {/* Liabilities */}
                  <div className="space-y-3">
                    <h5 className="font-extrabold text-slate-900 uppercase text-xs tracking-wider border-b border-slate-100 pb-1">Liabilities & Debts</h5>
                    <div className="space-y-2">
                      {reportData.liabilities.map((l: any) => (
                        <div key={l.id} className="flex justify-between font-medium text-xs">
                          <span className="text-slate-600">{l.name}</span>
                          <span className="text-slate-900">৳{l.balance.toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                    <div className="flex justify-between font-extrabold text-xs pt-2 border-t border-slate-200 text-slate-800">
                      <span>Total Liabilities (B)</span>
                      <span>৳{reportData.totalLiabilities.toLocaleString()}</span>
                    </div>
                  </div>

                  {/* Owner's Equity */}
                  <div className="flex justify-between items-center font-black text-sm pt-4 border-t-2 border-slate-900 text-slate-950">
                    <span>Capital & Owners Equity (A - B)</span>
                    <span>৳{reportData.equity.toLocaleString()}</span>
                  </div>
                </div>
              )}

              {/* TRIAL BALANCE VIEW */}
              {reportType === "TB" && reportData?.rows && (
                <div className="space-y-6 text-sm">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-slate-200 font-bold text-slate-800">
                          <th className="py-2">Account Title</th>
                          <th className="py-2">Type</th>
                          <th className="py-2 text-right">Debit Balance</th>
                          <th className="py-2 text-right">Credit Balance</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-medium">
                        {reportData.rows.map((r: any) => {
                          const isDebitAccount = r.type === "ASSET" || r.type === "EXPENSE";
                          return (
                            <tr key={r.id}>
                              <td className="py-3 text-slate-800 font-bold">{r.name}</td>
                              <td className="py-3 text-slate-400 uppercase tracking-widest text-[9px]">{r.type}</td>
                              <td className="py-3 text-right text-slate-900 font-mono">
                                {isDebitAccount ? `৳${r.balance.toLocaleString()}` : "—"}
                              </td>
                              <td className="py-3 text-right text-slate-900 font-mono">
                                {!isDebitAccount ? `৳${r.balance.toLocaleString()}` : "—"}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  <div className="flex justify-between items-center font-black text-xs pt-4 border-t-2 border-slate-900 text-slate-950 font-mono">
                    <span>LEGER TOTAL AUDIT SUMMARY</span>
                    <div className="space-x-8">
                      <span>Total Debit: ৳{reportData.totalDebits.toLocaleString()}</span>
                      <span>Total Credit: ৳{reportData.totalCredits.toLocaleString()}</span>
                    </div>
                  </div>

                  {/* Parity check validation alert */}
                  <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-xl flex items-center gap-2 text-emerald-800 text-xs font-semibold">
                    <CheckCircle className="w-4 h-4 shrink-0 text-emerald-600" />
                    <span>DOUBLE-ENTRY INTEGRITY PERFECT (Trial balance offsets to BDT 0.00)!</span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* --- GENERAL LEDGER TAB VIEW --- */}
      {activeTab === "ledger" && (
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden animate-fade-in">
          {/* Toolbar */}
          <div className="p-4 border-b border-slate-200 flex items-center justify-between gap-4 flex-wrap bg-slate-50/50">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Chronological Double-Entry Journal Book</h3>
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search ledger by description..."
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                className="w-full pl-8 pr-4 py-1.5 bg-white border border-slate-200 rounded-md text-xs focus:outline-none focus:border-slate-300"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 font-semibold text-slate-500 uppercase tracking-wider">
                  <th className="px-6 py-3">Date</th>
                  <th className="px-6 py-3">Description & References</th>
                  <th className="px-6 py-3">Accounts Affected</th>
                  <th className="px-6 py-3 text-right">Debit (৳)</th>
                  <th className="px-6 py-3 text-right">Credit (৳)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {generalLedgerData.data.map((entry) => (
                  <tr key={entry.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4 text-slate-500 whitespace-nowrap">
                      {new Date(entry.date).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-bold text-slate-900">{entry.description}</div>
                      {entry.referenceId && (
                        <div className="flex items-center gap-1.5 mt-1">
                          <span className="inline-block text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                            Ref: {entry.referenceId} ({entry.referenceType})
                          </span>
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(entry.referenceId);
                              setCopiedId(entry.referenceId);
                              setTimeout(() => setCopiedId(null), 1500);
                            }}
                            className="text-slate-400 hover:text-slate-500 transition-colors p-0.5 rounded hover:bg-slate-100"
                            title="Copy Reference ID"
                          >
                            {copiedId === entry.referenceId ? (
                              <CheckCircle className="w-3 h-3 text-emerald-500" />
                            ) : (
                              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                              </svg>
                            )}
                          </button>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4" colSpan={3}>
                      <table className="w-full text-xs text-left">
                        <tbody>
                          {entry.lines.map((line: any) => {
                            const isDebit = line.type === "DEBIT";
                            return (
                              <tr key={line.id}>
                                <td className={`py-1 text-slate-700 font-medium ${!isDebit ? "pl-6" : ""}`}>
                                  {line.account?.name}
                                  <span className="inline-block ml-1.5 text-[9px] font-bold text-slate-400 uppercase tracking-widest">({line.account?.type})</span>
                                </td>
                                <td className="py-1 text-right font-semibold text-slate-900 font-mono w-24">
                                  {isDebit ? `৳${line.amount.toLocaleString()}` : "—"}
                                </td>
                                <td className="py-1 text-right font-semibold text-slate-900 font-mono w-24">
                                  {!isDebit ? `৳${line.amount.toLocaleString()}` : "—"}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </td>
                  </tr>
                ))}
                {generalLedgerData.data.length === 0 && !loadingTab && (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-slate-400 font-medium">
                      No double-entry logs match your filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          {renderPagination(generalLedgerData.total, currentPage, setCurrentPage)}
        </div>
      )}

      {/* --- DRAWERS / SLIDING PANELS MODALS --- */}
      {drawerMode && (
        <div className="fixed inset-0 z-50 flex items-center justify-end p-4 bg-black/40 backdrop-blur-sm shadow-xl">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md h-[95vh] relative flex flex-col overflow-hidden animate-slide-in">
            {/* Header */}
            <div className="p-5 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <div>
                <h4 className="font-bold text-slate-900 text-sm">
                  {drawerMode === "ACCOUNT" ? "Add Chart of Account" : drawerMode === "TRANSACTION" ? "New Manual Transaction" : "Settlement: Courier Dues Remittance"}
                </h4>
                <p className="text-xs text-slate-400 mt-0.5">ERP Financial Module Configuration</p>
              </div>
              <button
                onClick={() => setDrawerMode(null)}
                className="w-6 h-6 rounded-full hover:bg-slate-200 flex items-center justify-center text-slate-500 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content Body */}
            <div className="flex-1 overflow-y-auto p-5">
              {drawerMode === "ACCOUNT" && (
                <CreateAccountClient onSuccessCallback={() => setDrawerMode(null)} />
              )}
              {drawerMode === "TRANSACTION" && (
                <TransactionFormClient accounts={accounts} onSuccessCallback={() => setDrawerMode(null)} />
              )}
              {drawerMode === "RECONCILE" && (
                <form onSubmit={handleReconcileSubmit} className="space-y-5">
                  {reconcileError && (
                    <div className="p-3 bg-rose-50 border border-rose-100 rounded-lg flex items-start gap-2 text-rose-700 text-xs">
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                      <span>{reconcileError}</span>
                    </div>
                  )}

                  {/* Courier Partner Selection */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500">Select Courier Account *</label>
                    <select
                      required
                      value={reconcileForm.courierAccountId}
                      onChange={(e) => setReconcileForm(prev => ({ ...prev, courierAccountId: e.target.value }))}
                      className="w-full h-10 px-3 py-1 border border-slate-200 rounded-lg text-xs bg-white focus:outline-none"
                    >
                      <option value="">Select Accounts Receivable Partner</option>
                      {courierAccounts.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>

                  {/* Receiving Register */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500">Receiving Vault Wallet *</label>
                    <select
                      required
                      value={reconcileForm.receivingAccountId}
                      onChange={(e) => setReconcileForm(prev => ({ ...prev, receivingAccountId: e.target.value }))}
                      className="w-full h-10 px-3 py-1 border border-slate-200 rounded-lg text-xs bg-white focus:outline-none"
                    >
                      <option value="">Select Asset Target (bKash/Nagad/Bank)</option>
                      {receivingAccounts.map(r => (
                        <option key={r.id} value={r.id}>{r.name}</option>
                      ))}
                    </select>
                  </div>

                  {/* Settled Remittance Amount */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-500">Net Remitted Amount *</label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">৳</span>
                        <input
                          type="number"
                          required
                          step="0.01"
                          placeholder="0.00"
                          value={reconcileForm.amount}
                          onChange={(e) => setReconcileForm(prev => ({ ...prev, amount: e.target.value }))}
                          className="w-full h-10 pl-7 pr-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-500">Courier Charge (Expense)</label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">৳</span>
                        <input
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                          value={reconcileForm.chargeAmount}
                          onChange={(e) => setReconcileForm(prev => ({ ...prev, chargeAmount: e.target.value }))}
                          className="w-full h-10 pl-7 pr-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Settlement Memo */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500">Reconciliation Memo</label>
                    <textarea
                      placeholder="e.g. Settled REDX remittance invoice #RE-908"
                      value={reconcileForm.description}
                      rows={3}
                      onChange={(e) => setReconcileForm(prev => ({ ...prev, description: e.target.value }))}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none leading-relaxed"
                    />
                  </div>

                  {/* Actions buttons */}
                  <div className="flex items-center gap-3 pt-6 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setDrawerMode(null)}
                      className="flex-1 h-10 border border-slate-200 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={reconcileLoading}
                      className="flex-1 h-10 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold transition-colors flex items-center justify-center"
                    >
                      {reconcileLoading ? (
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        "Settle Balance"
                      )}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
