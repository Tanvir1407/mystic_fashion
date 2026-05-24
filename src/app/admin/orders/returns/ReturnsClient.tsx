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
  User,
  Phone,
  Check,
  Search,
  TrendingDown
} from "lucide-react";
import Link from "next/link";
import { processSalesReturn, processFullSalesReturn, getOrderById, searchOrdersForReturn } from "../../actions";
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
  product: {
    name: string;
    price: number;
    purchasePrice: number | null;
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
  order: {
    customerName: string;
  };
  orderItem: {
    product: {
      name: string;
    };
  };
  variant: {
    size: string;
  };
}

export default function ReturnsClient({
  orders,
  initialReturns
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

  // Return Mode State
  const [returnMode, setReturnMode] = useState<"FULL" | "PARTIAL">("FULL");

  // Return logs search query
  const [logSearchQuery, setLogSearchQuery] = useState("");

  // Merge default orders with fetched orders
  const allOrders = useMemo(() => {
    const merged = [...orders, ...fetchedOrders];
    // Filter unique by ID
    return Array.from(new Map(merged.map((o) => [o.id, o])).values());
  }, [orders, fetchedOrders]);

  // Form State
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
    if (queryOrderId && !allOrders.some(o => o.id === queryOrderId)) {
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

  // Modal State
  const [isErrorModalOpen, setIsErrorModalOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  const orderOptions = useMemo(() => {
    return allOrders.map((o) => ({
      value: o.id,
      label: `${o.id} - ${o.customerName} (${o.phone})`
    }));
  }, [allOrders]);

  const selectedOrder = useMemo(() => {
    return allOrders.find((o) => o.id === selectedOrderId);
  }, [allOrders, selectedOrderId]);

  const handleSearch = useCallback(async (val: string) => {
    const trimmed = val.trim();
    if (trimmed.length >= 3) {
      setIsSearching(true);
      try {
        const res = await searchOrdersForReturn(trimmed);
        if (res.success && res.data) {
          setFetchedOrders(prev => {
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
    const itemReturns = selectedOrder.salesReturns || [];
    const alreadyReturned = itemReturns
      .filter((r) => r.orderItemId === selectedItem.id)
      .reduce((sum, r) => sum + r.quantity, 0);
    return Math.max(0, selectedItem.quantity - alreadyReturned);
  }, [selectedItem, selectedOrder]);
 
  const handleItemChange = (itemId: string) => {
    setSelectedOrderItemId(itemId);
    const item = selectedOrder?.items.find((i) => i.id === itemId);
    if (item) {
      setReturnAction(item.requiresPrint ? "WASTAGE" : "RESTOCKED");
      const itemReturns = selectedOrder?.salesReturns || [];
      const alreadyReturned = itemReturns
        .filter((r) => r.orderItemId === itemId)
        .reduce((sum, r) => sum + r.quantity, 0);
      const rem = Math.max(0, item.quantity - alreadyReturned);
      setReturnQty(rem > 1 ? 1 : rem);
    } else {
      setReturnQty("");
    }
  };

  // Summaries
  const summaries = useMemo(() => {
    let deliveryLoss = 0;
    let wastageLoss = 0;
    let restockedCount = 0;
    let returnCost = 0;

    returns.forEach((r) => {
      deliveryLoss += r.deliveryLoss;
      returnCost += r.returnCost;
      if (r.status === "WASTAGE") {
        wastageLoss += r.productLoss + r.printingLoss;
      } else if (r.status === "RESTOCKED") {
        restockedCount += r.quantity;
      }
    });

    return { deliveryLoss, wastageLoss, restockedCount, returnCost };
  }, [returns]);

  // Filtered Returns for Logs search
  const filteredReturns = useMemo(() => {
    if (!logSearchQuery.trim()) return returns;
    const query = logSearchQuery.toLowerCase().trim();
    return returns.filter(r =>
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
        // Full return — process all items at once
        const res = await processFullSalesReturn({
          orderId: selectedOrderId,
          deliveryLossAmount: Number(deliveryLossAmount ?? 0),
          returnReason: returnReason.trim(),
          returnCost: Number(returnCost ?? 0),
          returnCostPaid,
        });

        if (res.success) {
          router.refresh();
          setReturnReason("");
          setDeliveryLossAmount(0);
          setReturnCost(0);
          setReturnCostPaid(false);
          setSelectedOrderId("");
          setSelectedOrderItemId("");
          setReturnQty("");
          setSuccessMessage("Full return processed successfully! All items returned.");
          setIsSuccessModalOpen(true);
          setActiveTab("logs");
        } else {
          setErrorMessage(res.error || "An error occurred.");
          setIsErrorModalOpen(true);
        }
      } else {
        // Partial return — existing single-item flow
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
            variant: { size: selectedItem?.size || "M" },
          };
          setReturns([newReturn, ...returns]);
          setReturnReason("");
          setDeliveryLossAmount(0);
          setReturnCost(0);
          setReturnCostPaid(false);
          setSelectedOrderId("");
          setSelectedOrderItemId("");
          setReturnQty("");
          setSuccessMessage("Partial return processed successfully!");
          setIsSuccessModalOpen(true);
          setActiveTab("logs");
        } else {
          setErrorMessage(res.error || "An error occurred.");
          setIsErrorModalOpen(true);
        }
      }
    });
  };

  return (
    <div className="flex flex-col max-w-8xl">
      <StatusAlertModal
        isOpen={isErrorModalOpen}
        onClose={() => setIsErrorModalOpen(false)}
        title="Operation Failed"
        message={errorMessage}
      />

      <StatusAlertModal
        isOpen={isSuccessModalOpen}
        onClose={() => setIsSuccessModalOpen(false)}
        title="Success"
        message={successMessage}
      />

      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Link href="/admin" className="p-2 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors text-slate-500">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Sales Returns & Wastage</h1>
          <p className="text-sm text-slate-500 mt-1">Manage Cash on Delivery (COD) cancellations, calculate financial wastage, and restock non-printed items.</p>
        </div>
      </div>

      {/* Tabs Bar */}
      <div className="flex border-b border-slate-200 mb-6 gap-6">
        <button
          onClick={() => setActiveTab("create")}
          className={`pb-3 text-sm font-bold uppercase tracking-wider border-b-2 transition-all flex items-center gap-2 ${activeTab === "create"
              ? "border-indigo-600 text-indigo-600 font-extrabold"
              : "border-transparent text-slate-400 hover:text-slate-600"
            }`}
        >
          <PlusCircle className="w-4 h-4" />
          Create Return
        </button>
        <button
          onClick={() => setActiveTab("logs")}
          className={`pb-3 text-sm font-bold uppercase tracking-wider border-b-2 transition-all flex items-center gap-2 ${activeTab === "logs"
              ? "border-indigo-600 text-indigo-600 font-extrabold"
              : "border-transparent text-slate-400 hover:text-slate-600"
            }`}
        >
          <History className="w-4 h-4" />
          Return Logs
          <span className="bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full text-xs font-bold font-mono">
            {returns.length}
          </span>
        </button>
      </div>

      {/* Conditional Rendering of Tabs */}
      {activeTab === "create" ? (
        <div className="bg-white border border-slate-200  p-8 shadow-sm max-w-8xl mx-auto w-full">
          <h2 className="text-base font-bold text-slate-900 mb-6 flex items-center gap-2 border-b border-slate-100 pb-4">
            <PlusCircle className="w-5 h-5 text-indigo-500" />
            Process Return Entry
          </h2>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Return Mode Selector */}
            <div className="grid grid-cols-2 gap-2 mb-6">
              <button
                type="button"
                onClick={() => { setReturnMode("FULL"); setSelectedOrderItemId(""); setReturnQty(""); }}
                className={`py-2.5 px-3 text-xs font-black uppercase tracking-wider rounded-md border transition-all ${
                  returnMode === "FULL"
                    ? "bg-slate-900 text-white border-slate-900 shadow-sm font-bold"
                    : "bg-white text-slate-500 border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                }`}
              >
                Full Return
              </button>
              <button
                type="button"
                onClick={() => { setReturnMode("PARTIAL"); setReturnQty(""); }}
                className={`py-2.5 px-3 text-xs font-black uppercase tracking-wider rounded-md border transition-all ${
                  returnMode === "PARTIAL"
                    ? "bg-slate-900 text-white border-slate-900 shadow-sm font-bold"
                    : "bg-white text-slate-500 border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                }`}
              >
                Partial Return
              </button>
            </div>

            {/* Mode description */}
            <div className="mb-4 p-3 bg-slate-50 border border-slate-200 rounded-md text-xs text-slate-700 font-medium">
              {returnMode === "FULL" 
                ? "All items in the order will be returned. Printed items → Wastage. Non-printed items → Restocked."
                : "Select a specific item and return quantity. Order status stays as-is unless all items are returned."
              }
            </div>

            {/* Order Select — same as before */}
            <CustomSelect
              label="Select Order *"
              placeholder="Search by Order ID..."
              options={orderOptions}
              value={selectedOrderId}
              onChange={(val) => { setSelectedOrderId(val); setSelectedOrderItemId(""); setReturnQty(""); }}
              searchable={true}
              onSearchValueChange={handleSearch}
              isLoading={isSearching}
              className="text-sm"
            />

            {/* Full Return: show order summary */}
            {returnMode === "FULL" && selectedOrder && (
              <div className="mt-3 p-3 bg-slate-50 border border-slate-200 rounded-md space-y-1.5 animate-in fade-in slide-in-from-top-1 duration-200">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">
                  Items to be returned
                </p>
                {selectedOrder.items.map((item: any) => {
                  const itemReturns = selectedOrder.salesReturns || [];
                  const alreadyReturned = itemReturns
                    .filter((r: any) => r.orderItemId === item.id)
                    .reduce((sum: number, r: any) => sum + r.quantity, 0);
                  const rem = Math.max(0, item.quantity - alreadyReturned);

                  if (rem <= 0) return null; // skip fully returned items

                  return (
                    <div key={item.id} className="flex justify-between items-center text-xs">
                      <span className="text-slate-700 font-medium">
                        {item.product.name} 
                        <span className="text-slate-400 ml-1">({item.size})</span>
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-slate-600">x{rem}</span>
                        <span className={`text-[9px] font-black px-1.5 py-0.5 rounded uppercase ${
                          item.requiresPrint 
                            ? "bg-red-50 text-red-600 border border-red-100" 
                            : "bg-emerald-50 text-emerald-600 border border-emerald-100"
                        }`}>
                          {item.requiresPrint ? "Wastage" : "Restock"}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Partial Return: item selector */}
            {returnMode === "PARTIAL" && selectedOrderId && (
              <div className="space-y-6 animate-in fade-in slide-in-from-top-1 duration-200">
                <div className="mt-3">
                  <CustomSelect
                    label="Select Item to Return *"
                    placeholder="Choose item..."
                    options={selectedOrder.items.map((item) => {
                      const itemReturns = selectedOrder.salesReturns || [];
                      const alreadyReturned = itemReturns
                        .filter((r) => r.orderItemId === item.id)
                        .reduce((sum, r) => sum + r.quantity, 0);
                      const rem = Math.max(0, item.quantity - alreadyReturned);
                      return {
                        value: item.id,
                        label: `${item.product.name} (Size: ${item.size}, Qty: ${rem} remaining)`
                      };
                    })}
                    value={selectedOrderItemId}
                    onChange={handleItemChange}
                    className="text-sm"
                  />
                </div>

                {selectedItem && (
                  <div className="space-y-6 animate-in fade-in duration-200">
                    {/* Return Quantity Selector if remainingQty > 1 */}
                    {selectedItemRemainingQty > 1 && (
                      <div className="mt-3 space-y-1.5">
                        <label className="text-xs font-semibold text-slate-900 block">
                          Return Quantity *
                        </label>
                        <select
                          value={returnQty}
                          onChange={(e) => setReturnQty(Number(e.target.value))}
                          className="w-full px-4 py-2 border border-slate-300 rounded-md focus:outline-none focus:border-slate-500 focus:ring-1 focus:ring-slate-500 text-sm font-mono bg-white"
                        >
                          {Array.from({ length: selectedItemRemainingQty }, (_, i) => i + 1).map((qty) => (
                            <option key={qty} value={qty}>
                              {qty} of {selectedItemRemainingQty}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    <div className="mt-3">
                      <CustomSelect
                        label="Return Action *"
                        placeholder="Select action..."
                        options={[
                          { value: "RESTOCKED", label: "Restock to Inventory" },
                          { value: "WASTAGE", label: "Mark as Wastage" }
                        ]}
                        value={returnAction}
                        onChange={(val) => setReturnAction(val as ReturnStatus)}
                        className="text-sm"
                      />
                    </div>

                    {/* Existing warning cards — keep them exactly as they are */}
                    {returnAction === "RESTOCKED" && selectedItem.requiresPrint === true && (
                      <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-xs flex items-start gap-3">
                        <AlertCircle className="w-5 h-5 shrink-0 text-amber-500 mt-0.5" />
                        <div>
                          <span className="font-bold block mb-0.5">Manual Restock Override Warning</span>
                          This item is customized with DTF printing. Ensure the custom print is reusable/standard before restocking.
                        </div>
                      </div>
                    )}

                    {returnAction === "WASTAGE" && selectedItem.requiresPrint === false && (
                      <div className="p-4 bg-orange-50 border border-orange-200 rounded-xl text-orange-800 text-xs flex items-start gap-3">
                        <AlertCircle className="w-5 h-5 shrink-0 text-orange-500 mt-0.5" />
                        <div>
                          <span className="font-bold block mb-0.5">Manual Wastage Override Warning</span>
                          You are marking a non-customized item as wastage. Purchase price will be written off as financial loss.
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Common fields — shown for both modes when order is selected */}
            {selectedOrderId && (
              <div className="mt-4 space-y-4 border-t border-slate-100 pt-4 animate-in fade-in duration-200">
                {/* Courier/Delivery Loss */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-900">
                    Courier Loss Amount (BDT)
                    {returnMode === "FULL" && (
                      <span className="text-slate-400 font-normal ml-1">— split equally across items</span>
                    )}
                  </label>
                  <input
                    type="number"
                    value={deliveryLossAmount}
                    onChange={(e) => setDeliveryLossAmount(e.target.value === "" ? "" : Number(e.target.value))}
                    min="0"
                    placeholder="e.g. 120"
                    className="w-full px-4 py-2 border border-slate-300 rounded-md focus:outline-none focus:border-slate-500 focus:ring-1 focus:ring-slate-500 text-sm font-mono"
                  />
                </div>

                {/* Return Pickup Cost */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-900">Return Pickup Cost (BDT)</label>
                  <input
                    type="number"
                    value={returnCost}
                    onChange={(e) => setReturnCost(e.target.value === "" ? "" : Number(e.target.value))}
                    min="0"
                    placeholder="Cost to collect this return (e.g. 80)"
                    className="w-full px-4 py-2 border border-slate-300 rounded-md focus:outline-none focus:border-slate-500 focus:ring-1 focus:ring-slate-500 text-sm font-mono"
                  />
                </div>

                {/* Return Cost Paid toggle */}
                <div className="flex items-center justify-between py-2.5 px-3 bg-slate-50 border border-slate-200 rounded-md">
                  <span className="text-xs font-semibold text-slate-700">Return Cost Paid?</span>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-bold ${returnCostPaid ? "text-emerald-600" : "text-rose-500"}`}>
                      {returnCostPaid ? "Paid" : "Unpaid"}
                    </span>
                    <input
                      type="checkbox"
                      checked={returnCostPaid}
                      onChange={(e) => setReturnCostPaid(e.target.checked)}
                      className="w-4 h-4 cursor-pointer accent-emerald-600"
                    />
                  </div>
                </div>

                {/* Return Reason */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-900">Return Reason *</label>
                  <textarea
                    value={returnReason}
                    onChange={(e) => setReturnReason(e.target.value)}
                    placeholder="e.g. Customer rejected at doorstep"
                    rows={3}
                    required
                    className="w-full px-4 py-2 border border-slate-300 rounded-md focus:outline-none focus:border-slate-500 focus:ring-1 focus:ring-slate-500 text-sm resize-none"
                  />
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={
                    isPending ||
                    !selectedOrderId ||
                    returnReason.trim() === "" ||
                    (returnMode === "PARTIAL" && !selectedOrderItemId)
                  }
                  className="w-full h-10 text-white text-sm font-bold rounded-md transition-colors disabled:opacity-50 flex items-center justify-center gap-2 shadow-sm bg-black hover:bg-slate-900"
                >
                  {isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      {returnMode === "FULL" ? "Process Full Return" : "Process Partial Return"}
                    </>
                  )}
                </button>
              </div>
            )}
          </form>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Financial Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm flex items-center gap-4 animate-in fade-in duration-200">
              <div className="p-3.5 bg-red-50 text-red-600 rounded-lg">
                <Truck className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Total Delivery Loss</span>
                <span className="text-2xl font-black font-mono text-slate-900 mt-1 block">{formatBDT(summaries.deliveryLoss)}</span>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm flex items-center gap-4 animate-in fade-in duration-300">
              <div className="p-3.5 bg-orange-50 text-orange-600 rounded-lg">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Total Wastage Loss</span>
                <span className="text-2xl font-black font-mono text-slate-900 mt-1 block">{formatBDT(summaries.wastageLoss)}</span>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm flex items-center gap-4 animate-in fade-in duration-400">
              <div className="p-3.5 bg-emerald-50 text-emerald-600 rounded-lg">
                <Boxes className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Total Restocked Items</span>
                <span className="text-2xl font-black font-mono text-slate-900 mt-1 block">{summaries.restockedCount} Items</span>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm flex items-center gap-4 animate-in fade-in duration-500">
              <div className="p-3.5 bg-violet-50 text-violet-600 rounded-lg">
                <TrendingDown className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Total Return Cost</span>
                <span className="text-2xl font-black font-mono text-slate-900 mt-1 block">{formatBDT(summaries.returnCost)}</span>
              </div>
            </div>
          </div>

          {/* History Logs Table Card */}
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden animate-in fade-in duration-300">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                <History className="w-4 h-4 text-slate-400" />
                Recent Return Logs
              </h2>
              {/* Search Return Logs */}
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search logs by Order, Customer..."
                  value={logSearchQuery}
                  onChange={(e) => setLogSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-1.5 bg-white border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-slate-400 transition-colors"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/50">
                    <th className="px-6 py-3 font-semibold text-[10px] text-slate-500 uppercase tracking-wider">Date</th>
                    <th className="px-6 py-3 font-semibold text-[10px] text-slate-500 uppercase tracking-wider">Order / Customer</th>
                    <th className="px-6 py-3 font-semibold text-[10px] text-slate-500 uppercase tracking-wider">Product Info</th>
                    <th className="px-6 py-3 font-semibold text-[10px] text-slate-500 uppercase tracking-wider text-center">Status</th>
                    <th className="px-6 py-3 font-semibold text-[10px] text-slate-500 uppercase tracking-wider text-center">Type</th>
                    <th className="px-6 py-3 font-semibold text-[10px] text-slate-500 uppercase tracking-wider text-right">Total Loss</th>
                    <th className="px-6 py-3 font-semibold text-[10px] text-slate-500 uppercase tracking-wider text-right">Return Cost</th>
                    <th className="px-6 py-3 font-semibold text-[10px] text-slate-500 uppercase tracking-wider">Reason</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {filteredReturns.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-6 py-16 text-center text-sm text-slate-400 italic font-medium">
                        No return records match your query.
                      </td>
                    </tr>
                  ) : (
                    filteredReturns.map((ret) => {
                      const returnLoss = ret.deliveryLoss + ret.productLoss + ret.printingLoss;
                      return (
                        <tr key={ret.id} className="hover:bg-slate-50/30 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="text-xs text-slate-500 font-medium">
                              {new Date(ret.createdAt).toLocaleDateString("en-GB", {
                                day: "numeric",
                                month: "short",
                                year: "numeric"
                              })}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex flex-col">
                              <span className="text-xs font-bold text-slate-800">{ret.orderId}</span>
                              <span className="text-[10px] text-slate-400 mt-0.5">{ret.order?.customerName}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex flex-col gap-0.5">
                              <span className="text-xs font-bold text-slate-800 truncate max-w-[200px]" title={ret.orderItem.product.name}>
                                {ret.orderItem.product.name}
                              </span>
                              <span className="text-[9px] text-slate-400 uppercase font-black tracking-tight mt-0.5">
                                Size: {ret.variant.size} • Qty: {ret.quantity}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-center whitespace-nowrap">
                            <span
                              className={`px-2.5 py-1 rounded text-[9px] font-black tracking-widest uppercase ${ret.status === "RESTOCKED"
                                  ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
                                  : "bg-red-50 text-red-700 border border-red-100"
                                }`}
                            >
                              {ret.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-center whitespace-nowrap">
                            —
                          </td>
                          <td className="px-6 py-4 text-right font-mono text-xs font-black text-slate-900 whitespace-nowrap">
                            {formatBDT(returnLoss)}
                          </td>
                          <td className="px-6 py-4 text-right whitespace-nowrap">
                            <div className="text-xs font-bold font-mono text-slate-900">{formatBDT(ret.returnCost)}</div>
                            <div className={`text-[9px] font-bold uppercase tracking-wider mt-0.5 ${
                              ret.returnCostPaid ? "text-emerald-600" : "text-rose-500"
                            }`}>
                              {ret.returnCostPaid ? "Paid" : "Unpaid"}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <p className="text-xs text-slate-500 max-w-[180px] truncate leading-relaxed" title={ret.returnReason}>
                              {ret.returnReason}
                            </p>
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
