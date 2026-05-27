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
import { processSalesReturn, processFullSalesReturn, searchOrdersForReturn } from "../actions";
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
            variant: { size: selectedItem?.size || "M" },
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

  return (
    <div className="flex flex-col">
      <StatusAlertModal isOpen={isErrorModalOpen} onClose={() => setIsErrorModalOpen(false)} title="Operation Failed" message={errorMessage} />
      <StatusAlertModal isOpen={isSuccessModalOpen} onClose={() => setIsSuccessModalOpen(false)} title="Success" message={successMessage} />

      {/* Page Header */}
      <div className="flex items-center gap-4 mb-6">
        <Link href="/admin" className="p-2 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg transition-colors text-slate-500 shadow-sm">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Sales Returns & Wastage</h1>
          <p className="text-xs text-slate-500 mt-0.5">Process COD cancellations, calculate wastage, and restock non-printed items.</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 mb-6 gap-1">
        <button
          onClick={() => setActiveTab("create")}
          className={`px-4 pb-3 text-sm font-semibold border-b-2 transition-all flex items-center gap-2 ${
            activeTab === "create"
              ? "border-slate-900 text-slate-900"
              : "border-transparent text-slate-400 hover:text-slate-600"
          }`}
        >
          <PlusCircle className="w-4 h-4" />
          Create Return
        </button>
        <button
          onClick={() => setActiveTab("logs")}
          className={`px-4 pb-3 text-sm font-semibold border-b-2 transition-all flex items-center gap-2 ${
            activeTab === "logs"
              ? "border-slate-900 text-slate-900"
              : "border-transparent text-slate-400 hover:text-slate-600"
          }`}
        >
          <History className="w-4 h-4" />
          Return Logs
          <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full text-xs font-bold">
            {returns.length}
          </span>
        </button>
      </div>

      {activeTab === "create" ? (
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* ── Left Main Column ── */}
            <div className="lg:col-span-2 space-y-4">

              {/* Return Mode Card */}
              <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                <div className="px-5 py-3.5 border-b border-slate-100">
                  <h2 className="text-sm font-semibold text-slate-900">Return Type</h2>
                </div>
                <div className="p-5">
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => { setReturnMode("FULL"); setSelectedOrderItemId(""); setReturnQty(""); }}
                      className={`py-3 px-4 text-sm font-semibold rounded-lg border-2 transition-all text-left ${
                        returnMode === "FULL"
                          ? "bg-slate-900 text-white border-slate-900"
                          : "bg-white text-slate-500 border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                      }`}
                    >
                      <div className="font-bold">Full Return</div>
                      <div className={`text-[11px] mt-0.5 ${returnMode === "FULL" ? "text-slate-300" : "text-slate-400"}`}>All items in the order</div>
                    </button>
                    <button
                      type="button"
                      onClick={() => { setReturnMode("PARTIAL"); setReturnQty(""); }}
                      className={`py-3 px-4 text-sm font-semibold rounded-lg border-2 transition-all text-left ${
                        returnMode === "PARTIAL"
                          ? "bg-slate-900 text-white border-slate-900"
                          : "bg-white text-slate-500 border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                      }`}
                    >
                      <div className="font-bold">Partial Return</div>
                      <div className={`text-[11px] mt-0.5 ${returnMode === "PARTIAL" ? "text-slate-300" : "text-slate-400"}`}>Select specific item</div>
                    </button>
                  </div>
                </div>
              </div>

              {/* Order Search Card */}
              <div className="bg-white border border-slate-200 rounded-xl shadow-sm">
                <div className="px-5 py-3.5 border-b border-slate-100 rounded-t-xl">
                  <h2 className="text-sm font-semibold text-slate-900">Select Order</h2>
                </div>
                <div className="p-5">
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
              </div>

              {/* Products Card */}
              {selectedOrder && (
                <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between">
                    <h2 className="text-sm font-semibold text-slate-900">
                      Products
                      <span className="text-slate-400 font-normal ml-1.5 text-xs">({selectedOrder.items.length} item{selectedOrder.items.length !== 1 ? "s" : ""})</span>
                    </h2>
                    <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider ${
                      returnMode === "FULL"
                        ? "bg-red-50 text-red-600 border border-red-100"
                        : "bg-blue-50 text-blue-600 border border-blue-100"
                    }`}>
                      {returnMode === "FULL" ? "Full Return" : "Partial — Select Item"}
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
                          className={`flex items-center gap-4 px-5 py-4 transition-colors ${
                            returnMode === "PARTIAL" && !fullyReturned
                              ? "cursor-pointer hover:bg-slate-50"
                              : ""
                          } ${isSelected && returnMode === "PARTIAL" ? "bg-slate-50" : ""} ${fullyReturned ? "opacity-40" : ""}`}
                        >
                          {/* Product Image */}
                          <div className="w-14 h-16 relative bg-slate-100 rounded-lg overflow-hidden border border-slate-150 shrink-0">
                            {item.product.images?.[0] ? (
                              <UploadedImage
                                src={item.product.images[0]}
                                alt={item.product.name}
                                fill
                                className="object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <Package className="w-5 h-5 text-slate-300" />
                              </div>
                            )}
                          </div>

                          {/* Product Info */}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-slate-900 truncate">{item.product.name}</p>
                            <div className="flex items-center gap-2 mt-1 flex-wrap">
                              <span className="text-[10px] font-black bg-slate-900 text-white px-1.5 py-0.5 rounded tracking-widest">{item.size}</span>
                              <span className="text-xs text-slate-500">Qty: <span className="font-semibold text-slate-700">{rem}</span></span>
                              <span className="text-xs font-mono text-slate-600">{formatBDT(item.price)}</span>
                            </div>
                            {fullyReturned && (
                              <p className="text-[10px] text-slate-400 mt-1 font-medium">Already fully returned</p>
                            )}
                          </div>

                          {/* Status Badge */}
                          <div className="flex items-center gap-3 shrink-0">
                            <span className={`text-[9px] font-black px-2 py-1 rounded uppercase tracking-wider border ${
                              item.requiresPrint
                                ? "bg-red-50 text-red-600 border-red-100"
                                : "bg-emerald-50 text-emerald-600 border-emerald-100"
                            }`}>
                              {item.requiresPrint ? "Wastage" : "Restock"}
                            </span>

                            {/* Partial radio selector */}
                            {returnMode === "PARTIAL" && !fullyReturned && (
                              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                                isSelected ? "border-slate-900 bg-slate-900" : "border-slate-300 bg-white"
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

              {/* Partial — quantity & action selectors */}
              {returnMode === "PARTIAL" && selectedItem && (
                <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden animate-in fade-in duration-200">
                  <div className="px-5 py-3.5 border-b border-slate-100">
                    <h2 className="text-sm font-semibold text-slate-900">Item Return Details</h2>
                  </div>
                  <div className="p-5 space-y-4">
                    {selectedItemRemainingQty > 1 && (
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-slate-700 block">Return Quantity</label>
                        <select
                          value={returnQty}
                          onChange={(e) => setReturnQty(Number(e.target.value))}
                          className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400 text-sm bg-white text-slate-800"
                        >
                          {Array.from({ length: selectedItemRemainingQty }, (_, i) => i + 1).map((qty) => (
                            <option key={qty} value={qty}>{qty} of {selectedItemRemainingQty}</option>
                          ))}
                        </select>
                      </div>
                    )}

                    <div>
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
                    </div>

                    {returnAction === "RESTOCKED" && selectedItem.requiresPrint && (
                      <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-xs flex items-start gap-2.5">
                        <AlertCircle className="w-4 h-4 shrink-0 text-amber-500 mt-0.5" />
                        <div>
                          <span className="font-bold block mb-0.5">Manual Restock Override</span>
                          This item has DTF printing. Verify the print is reusable before restocking.
                        </div>
                      </div>
                    )}

                    {returnAction === "WASTAGE" && !selectedItem.requiresPrint && (
                      <div className="p-3.5 bg-orange-50 border border-orange-200 rounded-lg text-orange-800 text-xs flex items-start gap-2.5">
                        <AlertCircle className="w-4 h-4 shrink-0 text-orange-500 mt-0.5" />
                        <div>
                          <span className="font-bold block mb-0.5">Manual Wastage Override</span>
                          Non-customized item marked as wastage. Purchase price will be written off as financial loss.
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Return Details Card */}
              {selectedOrderId && (
                <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden animate-in fade-in duration-200">
                  <div className="px-5 py-3.5 border-b border-slate-100">
                    <h2 className="text-sm font-semibold text-slate-900">Return Details</h2>
                  </div>
                  <div className="p-5 space-y-4">
                    {/* Delivery Loss */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-700 block">
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
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400 text-sm font-mono text-slate-800"
                      />
                    </div>

                    {/* Return Cost */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-700 block">Return Pickup Cost (BDT)</label>
                      <input
                        type="number"
                        value={returnCost}
                        onChange={(e) => setReturnCost(e.target.value === "" ? "" : Number(e.target.value))}
                        min="0"
                        placeholder="Cost to collect this return (e.g. 80)"
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400 text-sm font-mono text-slate-800"
                      />
                    </div>

                    {/* Return Cost Paid toggle */}
                    <div className="flex items-center justify-between py-3 px-4 bg-slate-50 border border-slate-200 rounded-lg">
                      <span className="text-xs font-semibold text-slate-700">Return Cost Paid?</span>
                      <div className="flex items-center gap-3">
                        <span className={`text-xs font-bold ${returnCostPaid ? "text-emerald-600" : "text-rose-500"}`}>
                          {returnCostPaid ? "Paid" : "Unpaid"}
                        </span>
                        <button
                          type="button"
                          onClick={() => setReturnCostPaid(!returnCostPaid)}
                          className={`relative w-10 h-5 rounded-full transition-colors ${returnCostPaid ? "bg-emerald-500" : "bg-slate-300"}`}
                        >
                          <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${returnCostPaid ? "translate-x-5" : "translate-x-0.5"}`} />
                        </button>
                      </div>
                    </div>

                    {/* Return Reason */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-700 block">Return Reason <span className="text-rose-400">*</span></label>
                      <textarea
                        value={returnReason}
                        onChange={(e) => setReturnReason(e.target.value)}
                        placeholder="e.g. Customer rejected at doorstep"
                        rows={3}
                        required
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400 text-sm resize-none text-slate-800"
                      />
                    </div>

                    {/* Submit */}
                    <button
                      type="submit"
                      disabled={
                        isPending ||
                        !selectedOrderId ||
                        returnReason.trim() === "" ||
                        (returnMode === "PARTIAL" && !selectedOrderItemId)
                      }
                      className="w-full h-11 bg-slate-900 hover:bg-slate-800 disabled:opacity-40 text-white text-sm font-bold rounded-lg transition-colors flex items-center justify-center gap-2 shadow-sm"
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
                </div>
              )}
            </div>

            {/* ── Right Sidebar ── */}
            <div className="space-y-4">
              {/* Customer Card */}
              {selectedOrder && (
                <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden animate-in fade-in duration-200">
                  <div className="px-4 py-3 border-b border-slate-100">
                    <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Customer</h3>
                  </div>
                  <div className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                        <User className="w-5 h-5 text-slate-400" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{selectedOrder.customerName}</p>
                        <p className="text-xs text-slate-500 mt-0.5">{selectedOrder.phone}</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Order Info Card */}
              {selectedOrder && (
                <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden animate-in fade-in duration-200">
                  <div className="px-4 py-3 border-b border-slate-100">
                    <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Order</h3>
                  </div>
                  <div className="p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-500">Order ID</span>
                      <span className="text-xs font-mono font-bold text-slate-800">{selectedOrder.id}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-500">Items</span>
                      <span className="text-xs font-semibold text-slate-800">{selectedOrder.items.length} item{selectedOrder.items.length !== 1 ? "s" : ""}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-500">Return Type</span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                        returnMode === "FULL" ? "bg-red-50 text-red-600" : "bg-blue-50 text-blue-600"
                      }`}>
                        {returnMode}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Return Mode Info Card */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl overflow-hidden">
                <div className="px-4 py-3 border-b border-slate-200">
                  <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">How it works</h3>
                </div>
                <div className="p-4">
                  <p className="text-xs text-slate-600 leading-relaxed">
                    {returnMode === "FULL"
                      ? "All items will be returned at once. Printed items are automatically marked as Wastage. Non-printed items are Restocked to inventory."
                      : "Select one item from the order to return. You can set the quantity and choose to Restock or mark as Wastage. The order stays active unless all items are returned."}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </form>
      ) : (
        <div className="space-y-5">
          {/* Summary Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex items-center gap-3">
              <div className="p-2.5 bg-red-50 text-red-500 rounded-lg shrink-0">
                <Truck className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Delivery Loss</span>
                <span className="text-lg font-black font-mono text-slate-900 mt-0.5 block">{formatBDT(summaries.deliveryLoss)}</span>
              </div>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex items-center gap-3">
              <div className="p-2.5 bg-orange-50 text-orange-500 rounded-lg shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Wastage Loss</span>
                <span className="text-lg font-black font-mono text-slate-900 mt-0.5 block">{formatBDT(summaries.wastageLoss)}</span>
              </div>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex items-center gap-3">
              <div className="p-2.5 bg-emerald-50 text-emerald-500 rounded-lg shrink-0">
                <Boxes className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Restocked</span>
                <span className="text-lg font-black font-mono text-slate-900 mt-0.5 block">{summaries.restockedCount} Items</span>
              </div>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex items-center gap-3">
              <div className="p-2.5 bg-violet-50 text-violet-500 rounded-lg shrink-0">
                <TrendingDown className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Return Cost</span>
                <span className="text-lg font-black font-mono text-slate-900 mt-0.5 block">{formatBDT(summaries.returnCost)}</span>
              </div>
            </div>
          </div>

          {/* Return Logs Table */}
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <h2 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                <History className="w-4 h-4 text-slate-400" />
                Return Logs
              </h2>
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search by order, customer..."
                  value={logSearchQuery}
                  onChange={(e) => setLogSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-slate-400 transition-colors"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/60">
                    <th className="px-5 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Date</th>
                    <th className="px-5 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Order / Customer</th>
                    <th className="px-5 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Product</th>
                    <th className="px-5 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider text-center">Status</th>
                    <th className="px-5 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider text-right">Total Loss</th>
                    <th className="px-5 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider text-right">Return Cost</th>
                    <th className="px-5 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Reason</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredReturns.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-5 py-16 text-center text-sm text-slate-400">
                        No return records match your query.
                      </td>
                    </tr>
                  ) : (
                    filteredReturns.map((ret) => {
                      const totalLoss = ret.deliveryLoss + ret.productLoss + ret.printingLoss;
                      return (
                        <tr key={ret.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-5 py-4 whitespace-nowrap text-xs text-slate-500">
                            {new Date(ret.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                          </td>
                          <td className="px-5 py-4">
                            <p className="text-xs font-bold text-slate-800">{ret.orderId}</p>
                            <p className="text-[10px] text-slate-400 mt-0.5">{ret.order?.customerName}</p>
                          </td>
                          <td className="px-5 py-4">
                            <p className="text-xs font-semibold text-slate-800 truncate max-w-[180px]" title={ret.orderItem.product.name}>
                              {ret.orderItem.product.name}
                            </p>
                            <p className="text-[10px] text-slate-400 mt-0.5 uppercase font-bold tracking-tight">
                              Size {ret.variant.size} · Qty {ret.quantity}
                            </p>
                          </td>
                          <td className="px-5 py-4 text-center">
                            <span className={`px-2.5 py-1 rounded-full text-[9px] font-bold tracking-widest uppercase ${
                              ret.status === "RESTOCKED"
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
                                : "bg-red-50 text-red-700 border border-red-100"
                            }`}>
                              {ret.status}
                            </span>
                          </td>
                          <td className="px-5 py-4 text-right font-mono text-xs font-bold text-slate-900 whitespace-nowrap">
                            {formatBDT(totalLoss)}
                          </td>
                          <td className="px-5 py-4 text-right whitespace-nowrap">
                            <p className="text-xs font-bold font-mono text-slate-900">{formatBDT(ret.returnCost)}</p>
                            <p className={`text-[9px] font-bold uppercase mt-0.5 ${ret.returnCostPaid ? "text-emerald-600" : "text-rose-500"}`}>
                              {ret.returnCostPaid ? "Paid" : "Unpaid"}
                            </p>
                          </td>
                          <td className="px-5 py-4">
                            <p className="text-xs text-slate-500 max-w-[160px] truncate" title={ret.returnReason}>
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
