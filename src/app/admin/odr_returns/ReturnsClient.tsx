"use client";

import { useState, useTransition, useMemo, useEffect, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  History,
  Save,
  Loader2,
  ArrowLeft,
  AlertCircle,
  PlusCircle,
  Truck,
  Trash2,
  Boxes,
  Search,
  TrendingDown,
  Package,
  User,
} from "lucide-react";
import Link from "next/link";
import UploadedImage from "@/components/UploadedImage";
import { processSalesReturn, processFullSalesReturn, searchOrdersForReturn } from "../orders/actions";
import { StatusAlertModal } from "@/components/StatusAlertModal";
import { ReturnStatus } from "@/generated/prisma";
import { CustomSelect } from "@/components/CustomSelect";
import { formatBDT } from "@/utils/formatPrice";

interface OrderItem {
  id: string;
  productId: string;
  size: string;
  quantity: number;
  price: number;
  requiresPrint: boolean;
  printCost: number;
  variant?: { size: string; color?: string } | null;
  product: {
    name: string;
    price: number;
    purchasePrice: number | null;
    images: string[];
  };
}

interface Order {
  id: string;
  customerName: string;
  phone: string;
  items: OrderItem[];
  salesReturns?: { orderItemId: string; quantity: number }[];
}

interface SalesReturn {
  id: string;
  orderId: string;
  orderItemId: string;
  variantId: string;
  quantity: number;
  returnReason: string;
  status: ReturnStatus;
  deliveryLoss: number;
  productLoss: number;
  printingLoss: number;
  returnCost: number;
  returnCostPaid: boolean;
  createdAt: Date;
  order: { customerName: string };
  orderItem: { product: { name: string } };
  variant: { size: string };
}

export default function ReturnsClient({
  orders,
  initialReturns,
}: {
  orders: Order[];
  initialReturns: SalesReturn[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [returns, setReturns] = useState<SalesReturn[]>(initialReturns);
  const [fetchedOrders, setFetchedOrders] = useState<Order[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [activeTab, setActiveTab] = useState<"create" | "logs">("create");
  const [returnMode, setReturnMode] = useState<"FULL" | "PARTIAL">("FULL");
  const [logSearchQuery, setLogSearchQuery] = useState("");

  const allOrders = useMemo(() => {
    const merged = [...orders, ...fetchedOrders];
    return Array.from(new Map(merged.map((o) => [o.id, o])).values());
  }, [orders, fetchedOrders]);

  const [selectedOrderId, setSelectedOrderId] = useState("");
  const [selectedOrderItemId, setSelectedOrderItemId] = useState("");
  const [returnAction, setReturnAction] = useState<ReturnStatus>("RESTOCKED");
  const [deliveryLossAmount, setDeliveryLossAmount] = useState<number | "">(0);
  const [returnCost, setReturnCost] = useState<number | "">(0);
  const [returnCostPaid, setReturnCostPaid] = useState(false);
  const [returnReason, setReturnReason] = useState("");
  const [returnQty, setReturnQty] = useState<number | "">("");

  const searchParams = useSearchParams();
  const queryOrderId = searchParams.get("orderId");

  useEffect(() => {
    setSelectedOrderId(queryOrderId || "");
    if (queryOrderId && !allOrders.some((o) => o.id === queryOrderId)) {
      handleSearch(queryOrderId);
    }
  }, [queryOrderId, allOrders]);

  useEffect(() => {
    if (selectedOrderId && allOrders) {
      const order = allOrders.find((o) => o.id === selectedOrderId);
      if (order && order.items.length === 1) {
        handleItemChange(order.items[0].id);
      } else {
        setSelectedOrderItemId("");
      }
    } else {
      setSelectedOrderItemId("");
    }
  }, [selectedOrderId, orders]);

  const [isErrorModalOpen, setIsErrorModalOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  const orderOptions = useMemo(
    () => allOrders.map((o) => ({ value: o.id, label: `${o.id} - ${o.customerName} (${o.phone})` })),
    [allOrders]
  );

  const selectedOrder = useMemo(
    () => allOrders.find((o) => o.id === selectedOrderId),
    [allOrders, selectedOrderId]
  );

  const handleSearch = useCallback(async (val: string) => {
    const trimmed = val.trim();
    if (trimmed.length >= 3) {
      setIsSearching(true);
      try {
        const res = await searchOrdersForReturn(trimmed);
        if (res.success && res.data) {
          setFetchedOrders((prev) => {
            const merged = [...prev, ...(res.data as any[])];
            return Array.from(new Map(merged.map((o) => [o.id, o])).values());
          });
        }
      } catch (error) {
        console.error("Failed to search orders:", error);
      } finally {
        setIsSearching(false);
      }
    }
  }, []);

  const selectedItem = useMemo(() => {
    if (!selectedOrder) return null;
    return selectedOrder.items.find((i) => i.id === selectedOrderItemId);
  }, [selectedOrder, selectedOrderItemId]);

  const selectedItemRemainingQty = useMemo(() => {
    if (!selectedItem || !selectedOrder) return 0;
    const alreadyReturned = (selectedOrder.salesReturns || [])
      .filter((r) => r.orderItemId === selectedItem.id)
      .reduce((sum, r) => sum + r.quantity, 0);
    return Math.max(0, selectedItem.quantity - alreadyReturned);
  }, [selectedItem, selectedOrder]);

  const handleItemChange = (itemId: string) => {
    setSelectedOrderItemId(itemId);
    const item = selectedOrder?.items.find((i) => i.id === itemId);
    if (item) {
      setReturnAction(item.requiresPrint ? "WASTAGE" : "RESTOCKED");
      const alreadyReturned = (selectedOrder?.salesReturns || [])
        .filter((r) => r.orderItemId === itemId)
        .reduce((sum, r) => sum + r.quantity, 0);
      const rem = Math.max(0, item.quantity - alreadyReturned);
      setReturnQty(rem > 1 ? 1 : rem);
    } else {
      setReturnQty("");
    }
  };

  const summaries = useMemo(() => {
    let deliveryLoss = 0, wastageLoss = 0, restockedCount = 0, returnCostTotal = 0;
    returns.forEach((r) => {
      deliveryLoss += r.deliveryLoss;
      returnCostTotal += r.returnCost;
      if (r.status === "WASTAGE") wastageLoss += r.productLoss + r.printingLoss;
      else if (r.status === "RESTOCKED") restockedCount += r.quantity;
    });
    return { deliveryLoss, wastageLoss, restockedCount, returnCost: returnCostTotal };
  }, [returns]);

  const filteredReturns = useMemo(() => {
    if (!logSearchQuery.trim()) return returns;
    const query = logSearchQuery.toLowerCase().trim();
    return returns.filter(
      (r) =>
        r.orderId.toLowerCase().includes(query) ||
        r.order.customerName.toLowerCase().includes(query) ||
        r.orderItem.product.name.toLowerCase().includes(query)
    );
  }, [returns, logSearchQuery]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrderId || returnReason.trim() === "") return;
    if (returnMode === "PARTIAL" && !selectedOrderItemId) return;

    startTransition(async () => {
      if (returnMode === "FULL") {
        const res = await processFullSalesReturn({
          orderId: selectedOrderId,
          deliveryLossAmount: Number(deliveryLossAmount ?? 0),
          returnReason: returnReason.trim(),
          returnCost: Number(returnCost ?? 0),
          returnCostPaid,
        });
        if (res.success) {
          router.refresh();
          setReturnReason(""); setDeliveryLossAmount(0); setReturnCost(0);
          setReturnCostPaid(false); setSelectedOrderId(""); setSelectedOrderItemId(""); setReturnQty("");
          setSuccessMessage("Full return processed successfully! All items returned.");
          setIsSuccessModalOpen(true); setActiveTab("logs");
        } else {
          setErrorMessage(res.error || "An error occurred."); setIsErrorModalOpen(true);
        }
      } else {
        const res = await processSalesReturn({
          orderId: selectedOrderId,
          orderItemId: selectedOrderItemId,
          returnReason: returnReason.trim(),
          deliveryLossAmount: Number(deliveryLossAmount ?? 0),
          returnActionType: returnAction,
          returnCost: Number(returnCost ?? 0),
          returnCostPaid,
          quantity: returnQty !== "" ? Number(returnQty) : undefined,
        });
        if (res.success) {
          const returnedData = res.data;
          const newReturn: SalesReturn = {
            ...returnedData,
            createdAt: new Date(returnedData.createdAt),
            order: { customerName: selectedOrder?.customerName || "Unknown" },
            orderItem: { product: { name: selectedItem?.product.name || "Unknown" } },
            variant: { size: selectedItem?.variant?.size || "M" },
          };
          setReturns([newReturn, ...returns]);
          setReturnReason(""); setDeliveryLossAmount(0); setReturnCost(0);
          setReturnCostPaid(false); setSelectedOrderId(""); setSelectedOrderItemId(""); setReturnQty("");
          setSuccessMessage("Partial return processed successfully!");
          setIsSuccessModalOpen(true); setActiveTab("logs");
        } else {
          setErrorMessage(res.error || "An error occurred."); setIsErrorModalOpen(true);
        }
      }
    });
  };

  const inputCls = "w-full px-3.5 py-2.5 border border-slate-200 rounded-xl bg-white text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-[#800020]/40 focus:ring-2 focus:ring-[#800020]/10 transition-all";

  return (
    <div className="flex flex-col">
      <StatusAlertModal isOpen={isErrorModalOpen} onClose={() => setIsErrorModalOpen(false)} title="Operation Failed" message={errorMessage} />
      <StatusAlertModal isOpen={isSuccessModalOpen} onClose={() => setIsSuccessModalOpen(false)} title="Success" message={successMessage} />

      {/* Page Header */}
      <div className="flex items-center gap-4 mb-7">
        <Link href="/admin" className="p-2 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl transition-colors text-slate-400 shadow-sm">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Sales Returns & Wastage</h1>
          <p className="text-xs text-slate-400 mt-0.5">Process cancellations, calculate losses, and restock items.</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl w-fit mb-7">
        <button
          onClick={() => setActiveTab("create")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
            activeTab === "create"
              ? "bg-white text-slate-900 shadow-sm"
              : "text-slate-500 hover:text-slate-700"
          }`}
        >
          <PlusCircle className="w-3.5 h-3.5" />
          Create Return
        </button>
        <button
          onClick={() => setActiveTab("logs")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
            activeTab === "logs"
              ? "bg-white text-slate-900 shadow-sm"
              : "text-slate-500 hover:text-slate-700"
          }`}
        >
          <History className="w-3.5 h-3.5" />
          Return Logs
          <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-bold ${
            activeTab === "logs" ? "bg-slate-100 text-slate-600" : "bg-slate-200 text-slate-500"
          }`}>
            {returns.length}
          </span>
        </button>
      </div>

      {activeTab === "create" ? (
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* ── Left: Single unified card ── */}
            <div className="lg:col-span-2">
              <div className="bg-white border border-slate-200 rounded-2xl shadow-sm">

                {/* Section 1: Return Type */}
                <div className="px-6 py-5 border-b border-slate-100">
                  <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-3">Return Type</p>
                  <div className="flex gap-3">
                    {[
                      { mode: "FULL" as const, label: "Full Return", desc: "All items at once" },
                      { mode: "PARTIAL" as const, label: "Partial Return", desc: "Select a specific item" },
                    ].map(({ mode, label, desc }) => (
                      <button
                        key={mode}
                        type="button"
                        onClick={() => { setReturnMode(mode); setSelectedOrderItemId(""); setReturnQty(""); }}
                        className={`flex-1 flex items-center gap-3 py-3 px-4 rounded-xl border-2 transition-all text-left ${
                          returnMode === mode
                            ? "border-[#800020] bg-[#800020]/[0.03]"
                            : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                        }`}
                      >
                        <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${
                          returnMode === mode ? "border-[#800020]" : "border-slate-300"
                        }`}>
                          {returnMode === mode && <div className="w-2 h-2 rounded-full bg-[#800020]" />}
                        </div>
                        <div>
                          <p className={`text-sm font-semibold leading-none ${returnMode === mode ? "text-[#800020]" : "text-slate-700"}`}>{label}</p>
                          <p className="text-[11px] text-slate-400 mt-1">{desc}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Section 2: Order Search — z-index lifted so dropdown floats above sections below */}
                <div className="px-6 py-5 border-b border-slate-100 relative z-20">
                  <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-3">Select Order</p>
                  <CustomSelect
                    label=""
                    placeholder="Search by Order ID, customer name or phone..."
                    options={orderOptions}
                    value={selectedOrderId}
                    onChange={(val) => { setSelectedOrderId(val); setSelectedOrderItemId(""); setReturnQty(""); }}
                    searchable={true}
                    onSearchValueChange={handleSearch}
                    isLoading={isSearching}
                    className="text-sm"
                  />
                </div>

                {/* Section 3: Order Items */}
                {selectedOrder && (
                  <div className="border-b border-slate-100 animate-in fade-in duration-200">
                    <div className="px-6 py-4 flex items-center justify-between">
                      <div>
                        <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Order Items</p>
                        <p className="text-xs text-slate-500 mt-0.5">{selectedOrder.items.length} item{selectedOrder.items.length !== 1 ? "s" : ""}</p>
                      </div>
                      <span className={`text-[10px] font-semibold px-2.5 py-1 rounded-full ${
                        returnMode === "FULL"
                          ? "bg-rose-50 text-rose-600 border border-rose-100"
                          : "bg-blue-50 text-blue-600 border border-blue-100"
                      }`}>
                        {returnMode === "FULL" ? "All items" : "Pick one"}
                      </span>
                    </div>
                    <div className="divide-y divide-slate-100">
                      {selectedOrder.items.map((item) => {
                        const alreadyReturned = (selectedOrder.salesReturns || [])
                          .filter((r) => r.orderItemId === item.id)
                          .reduce((sum, r) => sum + r.quantity, 0);
                        const rem = Math.max(0, item.quantity - alreadyReturned);
                        const isSelected = selectedOrderItemId === item.id;
                        const fullyReturned = rem <= 0;
                        return (
                          <div
                            key={item.id}
                            onClick={() => returnMode === "PARTIAL" && !fullyReturned ? handleItemChange(item.id) : undefined}
                            className={`flex items-center gap-4 px-6 py-4 transition-all ${
                              returnMode === "PARTIAL" && !fullyReturned ? "cursor-pointer" : ""
                            } ${isSelected && returnMode === "PARTIAL" ? "bg-[#800020]/[0.03]" : "hover:bg-slate-50/70"}
                            ${fullyReturned ? "opacity-40" : ""}`}
                          >
                            <div className="w-11 h-14 relative bg-slate-100 rounded-lg overflow-hidden border border-slate-100 shrink-0">
                              {item.product.images?.[0] ? (
                                <UploadedImage src={item.product.images[0]} alt={item.product.name} fill className="object-cover" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                  <Package className="w-4 h-4 text-slate-300" />
                                </div>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-slate-800 truncate">{item.product.name}</p>
                              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                                {item.variant?.size && (
                                  <span className="text-[10px] font-bold bg-slate-800 text-white px-2 py-0.5 rounded tracking-wider">{item.variant.size}</span>
                                )}
                                <span className="text-xs text-slate-400">Qty: <span className="font-semibold text-slate-600">{rem}</span></span>
                                <span className="text-xs text-slate-400">{formatBDT(item.price)}</span>
                              </div>
                              {fullyReturned && <p className="text-[10px] text-slate-400 mt-1">Already returned</p>}
                            </div>
                            <div className="flex items-center gap-3 shrink-0">
                              <span className={`text-[10px] font-semibold px-2.5 py-1 rounded-full ${
                                item.requiresPrint
                                  ? "bg-rose-50 text-rose-600 border border-rose-100"
                                  : "bg-emerald-50 text-emerald-600 border border-emerald-100"
                              }`}>
                                {item.requiresPrint ? "Wastage" : "Restock"}
                              </span>
                              {returnMode === "PARTIAL" && !fullyReturned && (
                                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${
                                  isSelected ? "border-[#800020] bg-[#800020]" : "border-slate-300 bg-white"
                                }`}>
                                  {isSelected && <div className="w-2 h-2 rounded-full bg-white" />}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Section 4: Partial item details */}
                {returnMode === "PARTIAL" && selectedItem && (
                  <div className="px-6 py-5 border-b border-slate-100 space-y-4 animate-in fade-in duration-200 relative z-10">
                    <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Item Details</p>
                    {selectedItemRemainingQty > 1 && (
                      <div className="space-y-2">
                        <label className="text-xs font-semibold text-slate-600 block">Return Quantity</label>
                        <select value={returnQty} onChange={(e) => setReturnQty(Number(e.target.value))} className={inputCls}>
                          {Array.from({ length: selectedItemRemainingQty }, (_, i) => i + 1).map((qty) => (
                            <option key={qty} value={qty}>{qty} of {selectedItemRemainingQty}</option>
                          ))}
                        </select>
                      </div>
                    )}
                    <CustomSelect
                      label="Return Action"
                      placeholder="Select action..."
                      options={[
                        { value: "RESTOCKED", label: "Restock to Inventory" },
                        { value: "WASTAGE", label: "Mark as Wastage" },
                      ]}
                      value={returnAction}
                      onChange={(val) => setReturnAction(val as ReturnStatus)}
                      className="text-sm"
                    />
                    {returnAction === "RESTOCKED" && selectedItem.requiresPrint && (
                      <div className="p-4 bg-amber-50 border border-amber-100 rounded-xl text-amber-700 text-xs flex items-start gap-3">
                        <AlertCircle className="w-4 h-4 shrink-0 text-amber-500 mt-0.5" />
                        <div><span className="font-semibold block mb-0.5">Manual Restock Override</span>This item has DTF printing. Verify print is reusable before restocking.</div>
                      </div>
                    )}
                    {returnAction === "WASTAGE" && !selectedItem.requiresPrint && (
                      <div className="p-4 bg-orange-50 border border-orange-100 rounded-xl text-orange-700 text-xs flex items-start gap-3">
                        <AlertCircle className="w-4 h-4 shrink-0 text-orange-500 mt-0.5" />
                        <div><span className="font-semibold block mb-0.5">Manual Wastage Override</span>Purchase price will be written off as financial loss.</div>
                      </div>
                    )}
                  </div>
                )}

                {/* Section 5: Financial + Submit */}
                {selectedOrderId && (
                  <div className="px-6 py-5 space-y-4 animate-in fade-in duration-200">
                    <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Financial Details</p>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-xs font-semibold text-slate-600 block">
                          Courier Loss (BDT){returnMode === "FULL" && <span className="text-slate-400 font-normal ml-1">— split evenly</span>}
                        </label>
                        <input type="number" value={deliveryLossAmount} onChange={(e) => setDeliveryLossAmount(e.target.value === "" ? "" : Number(e.target.value))} min="0" placeholder="0" className={inputCls} />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-semibold text-slate-600 block">Return Pickup Cost (BDT)</label>
                        <input type="number" value={returnCost} onChange={(e) => setReturnCost(e.target.value === "" ? "" : Number(e.target.value))} min="0" placeholder="0" className={inputCls} />
                      </div>
                    </div>

                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={returnCostPaid}
                        onChange={(e) => setReturnCostPaid(e.target.checked)}
                        className="w-4 h-4 rounded border-slate-300 text-[#800020] accent-[#800020] cursor-pointer shrink-0"
                      />
                      <span className="text-sm font-medium text-slate-700">
                        Return Cost Paid
                        <span className="text-slate-400 font-normal ml-1">(check if the courier pickup fee has been paid)</span>
                      </span>
                    </label>

                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-slate-600 block">Return Reason <span className="text-rose-400">*</span></label>
                      <textarea
                        value={returnReason}
                        onChange={(e) => setReturnReason(e.target.value)}
                        placeholder="e.g. Customer rejected at doorstep"
                        rows={3}
                        required
                        className={`${inputCls} resize-none`}
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={isPending || !selectedOrderId || returnReason.trim() === "" || (returnMode === "PARTIAL" && !selectedOrderItemId)}
                      className="w-full h-11 bg-[#800020] hover:bg-[#600018] disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
                    >
                      {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : (
                        <><Save className="w-4 h-4" />{returnMode === "FULL" ? "Process Full Return" : "Process Partial Return"}</>
                      )}
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* ── Right Sidebar: Single card ── */}
            <div>
              <div className="bg-white border border-slate-200 rounded-2xl shadow-sm sticky top-6">
                {selectedOrder ? (
                  <>
                    {/* Customer */}
                    <div className="px-5 py-5 border-b border-slate-100">
                      <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-3">Customer</p>
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-[#800020]/10 border border-[#800020]/15 flex items-center justify-center shrink-0 text-[#800020] font-bold text-sm">
                          {selectedOrder.customerName.charAt(0)}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-slate-800">{selectedOrder.customerName}</p>
                          <p className="text-xs text-slate-400 mt-0.5">{selectedOrder.phone}</p>
                        </div>
                      </div>
                    </div>
                    {/* Order Info */}
                    <div className="px-5 py-5 border-b border-slate-100 space-y-3">
                      <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Order</p>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-slate-400">Order ID</span>
                        <span className="text-xs font-mono font-bold text-slate-800">{selectedOrder.id}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-slate-400">Items</span>
                        <span className="text-xs font-semibold text-slate-700">{selectedOrder.items.length} item{selectedOrder.items.length !== 1 ? "s" : ""}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-slate-400">Return Type</span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${returnMode === "FULL" ? "bg-rose-50 text-rose-600" : "bg-blue-50 text-blue-600"}`}>
                          {returnMode}
                        </span>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="px-5 py-8 text-center">
                    <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3">
                      <User className="w-5 h-5 text-slate-300" />
                    </div>
                    <p className="text-xs text-slate-400">Select an order to see details</p>
                  </div>
                )}
                {/* How it works */}
                <div className="px-5 py-5">
                  <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">How it works</p>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    {returnMode === "FULL"
                      ? "All items returned at once. Printed items → Wastage. Non-printed items → Restocked."
                      : "Select one item and choose Restock or Wastage. Order stays active unless all items are returned."}
                  </p>
                </div>
              </div>
            </div>

          </div>
        </form>
      ) : (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: "Delivery Loss", value: formatBDT(summaries.deliveryLoss), icon: <Truck className="w-4 h-4" />, color: "text-rose-500 bg-rose-50" },
              { label: "Wastage Loss", value: formatBDT(summaries.wastageLoss), icon: <Trash2 className="w-4 h-4" />, color: "text-orange-500 bg-orange-50" },
              { label: "Restocked", value: `${summaries.restockedCount} pcs`, icon: <Boxes className="w-4 h-4" />, color: "text-emerald-500 bg-emerald-50" },
              { label: "Return Cost", value: formatBDT(summaries.returnCost), icon: <TrendingDown className="w-4 h-4" />, color: "text-violet-500 bg-violet-50" },
            ].map(({ label, value, icon, color }) => (
              <div key={label} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center mb-3 ${color}`}>
                  {icon}
                </div>
                <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">{label}</p>
                <p className="text-xl font-bold text-slate-900 mt-1 font-mono">{value}</p>
              </div>
            ))}
          </div>

          {/* Return Logs Table */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <History className="w-4 h-4 text-slate-400" />
                <h2 className="text-sm font-semibold text-slate-900">Return Logs</h2>
                <span className="text-[11px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md">{filteredReturns.length}</span>
              </div>
              <div className="relative w-full sm:w-60">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search by order, customer..."
                  value={logSearchQuery}
                  onChange={(e) => setLogSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-slate-300 focus:bg-white transition-all"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/50">
                    <th className="px-6 py-3.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Date</th>
                    <th className="px-6 py-3.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Order / Customer</th>
                    <th className="px-6 py-3.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Product</th>
                    <th className="px-6 py-3.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider text-center">Status</th>
                    <th className="px-6 py-3.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider text-right">Total Loss</th>
                    <th className="px-6 py-3.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider text-right">Return Cost</th>
                    <th className="px-6 py-3.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Reason</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredReturns.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-20 text-center">
                        <div className="flex flex-col items-center gap-2">
                          <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center">
                            <History className="w-5 h-5 text-slate-300" />
                          </div>
                          <p className="text-sm text-slate-400 font-medium">No return records found</p>
                          <p className="text-xs text-slate-300">Returns you process will appear here</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredReturns.map((ret) => {
                      const totalLoss = ret.deliveryLoss + ret.productLoss + ret.printingLoss;
                      return (
                        <tr key={ret.id} className="hover:bg-slate-50/60 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap text-xs text-slate-500">
                            {new Date(ret.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                          </td>
                          <td className="px-6 py-4">
                            <p className="text-xs font-bold text-slate-800 font-mono">{ret.orderId}</p>
                            <p className="text-[11px] text-slate-400 mt-0.5">{ret.order?.customerName}</p>
                          </td>
                          <td className="px-6 py-4">
                            <p className="text-xs font-semibold text-slate-800 truncate max-w-[180px]">{ret.orderItem.product.name}</p>
                            <p className="text-[11px] text-slate-400 mt-0.5">Size {ret.variant.size} · Qty {ret.quantity}</p>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-semibold ${
                              ret.status === "RESTOCKED"
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
                                : "bg-rose-50 text-rose-700 border border-rose-100"
                            }`}>
                              {ret.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right font-mono text-xs font-bold text-slate-900 whitespace-nowrap">
                            {formatBDT(totalLoss)}
                          </td>
                          <td className="px-6 py-4 text-right whitespace-nowrap">
                            <p className="text-xs font-bold font-mono text-slate-900">{formatBDT(ret.returnCost)}</p>
                            <p className={`text-[10px] font-semibold mt-0.5 ${ret.returnCostPaid ? "text-emerald-500" : "text-rose-400"}`}>
                              {ret.returnCostPaid ? "Paid" : "Unpaid"}
                            </p>
                          </td>
                          <td className="px-6 py-4">
                            <p className="text-xs text-slate-500 max-w-[200px] break-words whitespace-normal leading-relaxed">{ret.returnReason}</p>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
