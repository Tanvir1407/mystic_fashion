"use client";

import { useState, useTransition, useMemo, useEffect } from "react";
import { useSearchParams } from "next/navigation";
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
  TrendingDown
} from "lucide-react";
import Link from "next/link";
import { processSalesReturn } from "../../actions";
import { StatusAlertModal } from "@/components/StatusAlertModal";
import { ReturnStatus } from "@/generated/prisma/client";
import { CustomSelect } from "@/components/CustomSelect";

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
  const [isPending, startTransition] = useTransition();
  const [returns, setReturns] = useState<SalesReturn[]>(initialReturns);

  // Form State
  const [selectedOrderId, setSelectedOrderId] = useState("");
  const [selectedOrderItemId, setSelectedOrderItemId] = useState("");
  const [returnAction, setReturnAction] = useState<ReturnStatus>("RESTOCKED");
  const [deliveryLossAmount, setDeliveryLossAmount] = useState<number | "">(0);
  const [returnReason, setReturnReason] = useState("");

  const searchParams = useSearchParams();
  const queryOrderId = searchParams.get("orderId");

  useEffect(() => {
    setSelectedOrderId(queryOrderId || "");
  }, [queryOrderId]);

  useEffect(() => {
    if (selectedOrderId && orders) {
      const order = orders.find((o) => o.id === selectedOrderId);
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
    return orders.map((o) => ({
      value: o.id,
      label: `${o.id} - ${o.customerName} (${o.phone})`
    }));
  }, [orders]);

  const selectedOrder = useMemo(() => {
    return orders.find((o) => o.id === selectedOrderId);
  }, [orders, selectedOrderId]);

  const itemOptions = useMemo(() => {
    if (!selectedOrder) return [];
    return selectedOrder.items.map((i) => ({
      value: i.id,
      label: `${i.product.name} - Size: ${i.size} (Qty: ${i.quantity})`
    }));
  }, [selectedOrder]);

  const selectedItem = useMemo(() => {
    if (!selectedOrder) return null;
    return selectedOrder.items.find((i) => i.id === selectedOrderItemId);
  }, [selectedOrder, selectedOrderItemId]);

  const handleItemChange = (itemId: string) => {
    setSelectedOrderItemId(itemId);
    const item = selectedOrder?.items.find((i) => i.id === itemId);
    if (item) {
      setReturnAction(item.requiresPrint ? "WASTAGE" : "RESTOCKED");
    }
  };

  const returnActionOptions = [
    { value: "RESTOCKED", label: "Restock to Inventory" },
    { value: "WASTAGE", label: "Mark as Wastage" }
  ];

  // Summaries
  const summaries = useMemo(() => {
    let deliveryLoss = 0;
    let wastageLoss = 0;
    let restockedCount = 0;

    returns.forEach((r) => {
      deliveryLoss += r.deliveryLoss;
      if (r.status === "WASTAGE") {
        wastageLoss += r.productLoss + r.printingLoss;
      } else if (r.status === "RESTOCKED") {
        restockedCount += r.quantity;
      }
    });

    return { deliveryLoss, wastageLoss, restockedCount };
  }, [returns]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrderId || !selectedOrderItemId || returnReason.trim() === "") return;

    startTransition(async () => {
      const res = await processSalesReturn({
        orderId: selectedOrderId,
        orderItemId: selectedOrderItemId,
        returnReason: returnReason.trim(),
        deliveryLossAmount: Number(deliveryLossAmount ?? 0),
        returnActionType: returnAction,
      });

      if (res.success) {
        // Optimistically update recent returns table
        const returnedData = res.data;
        const newReturn: SalesReturn = {
          ...returnedData,
          createdAt: new Date(returnedData.createdAt),
          order: {
            customerName: selectedOrder?.customerName || "Unknown"
          },
          orderItem: {
            product: {
              name: selectedItem?.product.name || "Unknown"
            }
          },
          variant: {
            size: selectedItem?.size || "M"
          }
        };

        setReturns([newReturn, ...returns]);

        // Reset Form
        setSelectedOrderId("");
        setSelectedOrderItemId("");
        setReturnAction("RESTOCKED");
        setDeliveryLossAmount(0);
        setReturnReason("");

        setSuccessMessage("Return processed successfully!");
        setIsSuccessModalOpen(true);
      } else {
        setErrorMessage(res.error || "An error occurred during return processing.");
        setIsErrorModalOpen(true);
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

      {/* Financial Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-red-50 text-red-600 rounded-md">
            <Truck className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Total Delivery Loss</span>
            <span className="text-xl font-bold font-mono text-slate-900 mt-0.5 block">৳ {summaries.deliveryLoss.toLocaleString()}</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-orange-50 text-orange-600 rounded-md">
            <Trash2 className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Total Wastage Loss</span>
            <span className="text-xl font-bold font-mono text-slate-900 mt-0.5 block">৳ {summaries.wastageLoss.toLocaleString()}</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-md">
            <Boxes className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Total Restocked Items</span>
            <span className="text-xl font-bold font-mono text-slate-900 mt-0.5 block">{summaries.restockedCount} Items</span>
          </div>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
        {/* Left Form */}
        <div className="md:col-span-1 bg-white border border-slate-200 rounded-lg p-6 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-900 mb-6 flex items-center gap-2 border-b border-slate-100 pb-3">
            <PlusCircle className="w-4 h-4 text-slate-400" />
            Process Return
          </h2>

          <form onSubmit={handleSubmit} className="space-y-5">
            <CustomSelect
              label="Select Order *"
              placeholder="Search orders..."
              options={orderOptions}
              value={selectedOrderId}
              onChange={(val) => {
                setSelectedOrderId(val);
                setSelectedOrderItemId("");
              }}
              searchable={true}
              className="text-sm"
            />

            {selectedOrderId && (
              <CustomSelect
                label="Select Item *"
                placeholder="Choose item to return..."
                options={itemOptions}
                value={selectedOrderItemId}
                onChange={handleItemChange}
                className="text-sm animate-fade-in"
              />
            )}

            {selectedItem && (
              <div className="space-y-4 font-sans">
                <CustomSelect
                  label="Return Action *"
                  placeholder="Select return action..."
                  options={returnActionOptions}
                  value={returnAction}
                  onChange={(val) => setReturnAction(val as ReturnStatus)}
                  className="text-sm"
                />

                {/* Warning Card */}
                {returnAction === "RESTOCKED" && selectedItem.requiresPrint === false && (
                  <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-md text-emerald-800 text-xs flex items-start gap-3">
                    <Boxes className="w-5 h-5 shrink-0 text-emerald-500 mt-0.5" />
                    <div>
                      <span className="font-bold block mb-0.5">Restock Eligible</span>
                      This item has no customization. Processing this return will automatically restock <span className="font-bold">{selectedItem.quantity} qty</span> back to variant inventory.
                    </div>
                  </div>
                )}

                {returnAction === "RESTOCKED" && selectedItem.requiresPrint === true && (
                  <div className="p-4 bg-amber-50 border border-amber-200 rounded-md text-amber-800 text-xs flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 shrink-0 text-amber-500 mt-0.5" />
                    <div>
                      <span className="font-bold block mb-0.5">Manual Restock Override</span>
                      <span className="font-bold">Warning:</span> You are manually restocking a customized item. Please ensure the print is reusable and appropriate for restocking.
                    </div>
                  </div>
                )}

                {returnAction === "WASTAGE" && selectedItem.requiresPrint === true && (
                  <div className="p-4 bg-red-50 border border-red-100 rounded-md text-red-800 text-xs flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 shrink-0 text-red-500 mt-0.5" />
                    <div>
                      <span className="font-bold block mb-0.5">Warning: Customized Item</span>
                      This item is customized with DTF printing. Processing this return will mark it as <span className="font-bold">Total Wastage</span>. Stock will not be replenished, and product purchase price + print cost will be logged as loss.
                    </div>
                  </div>
                )}

                {returnAction === "WASTAGE" && selectedItem.requiresPrint === false && (
                  <div className="p-4 bg-orange-50 border border-orange-200 rounded-md text-orange-800 text-xs flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 shrink-0 text-orange-500 mt-0.5" />
                    <div>
                      <span className="font-bold block mb-0.5">Manual Wastage Override</span>
                      <span className="font-bold">Warning:</span> You are manually marking a non-customized item as wastage. Stock will not be replenished, and the item's purchase price will be recorded as loss.
                    </div>
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-900">Courier Loss Amount (BDT)</label>
                  <input
                    type="number"
                    value={deliveryLossAmount}
                    onChange={(e) => setDeliveryLossAmount(e.target.value === "" ? "" : Number(e.target.value))}
                    min="0"
                    placeholder="Enter delivery loss (e.g. 120)"
                    className="w-full px-4 py-2 border border-slate-300 rounded-md focus:outline-none focus:border-slate-500 focus:ring-1 focus:ring-slate-500 text-sm font-mono"
                  />
                </div>

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

                <button
                  type="submit"
                  disabled={isPending || !selectedOrderId || !selectedOrderItemId || returnReason.trim() === ""}
                  className="w-full h-10 bg-slate-900 text-white text-sm font-medium rounded-md hover:bg-slate-800 transition-colors disabled:opacity-50 flex items-center justify-center gap-2 shadow-sm"
                >
                  {isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      Save Return Entry
                    </>
                  )}
                </button>
              </div>
            )}
          </form>
        </div>

        {/* Right History Table */}
        <div className="md:col-span-2 bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
            <h2 className="text-xs font-semibold text-slate-600 uppercase tracking-wider flex items-center gap-2">
              <History className="w-3.5 h-3.5" />
              Recent Return Logs
            </h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/50">
                  <th className="px-4 py-3 font-semibold text-[10px] text-slate-500 uppercase tracking-wider">Date</th>
                  <th className="px-4 py-3 font-semibold text-[10px] text-slate-500 uppercase tracking-wider">Order / Customer</th>
                  <th className="px-4 py-3 font-semibold text-[10px] text-slate-500 uppercase tracking-wider">Product Info</th>
                  <th className="px-4 py-3 font-semibold text-[10px] text-slate-500 uppercase tracking-wider text-center">Status</th>
                  <th className="px-4 py-3 font-semibold text-[10px] text-slate-500 uppercase tracking-wider text-right">Total Loss</th>
                  <th className="px-4 py-3 font-semibold text-[10px] text-slate-500 uppercase tracking-wider">Reason</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {returns.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center text-sm text-slate-400">
                      No returned records found.
                    </td>
                  </tr>
                ) : (
                  returns.map((ret) => {
                    const returnLoss = ret.deliveryLoss + ret.productLoss + ret.printingLoss;
                    return (
                      <tr key={ret.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-4 py-4 whitespace-nowrap">
                          <span className="text-xs text-slate-600">
                            {new Date(ret.createdAt).toLocaleDateString("en-GB", {
                              day: "numeric",
                              month: "short",
                              year: "numeric"
                            })}
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex flex-col">
                            <span className="text-xs font-bold text-slate-800">{ret.orderId}</span>
                            <span className="text-[10px] text-slate-500">{ret.order.customerName}</span>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex flex-col gap-0.5">
                            <span className="text-xs font-semibold text-slate-900 truncate max-w-[180px]" title={ret.orderItem.product.name}>
                              {ret.orderItem.product.name}
                            </span>
                            <span className="text-[9px] text-slate-500 uppercase font-bold tracking-tight">
                              Size: {ret.variant.size} • Qty: {ret.quantity}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-4 text-center whitespace-nowrap">
                          <span
                            className={`px-2 py-0.5 rounded text-[9px] font-bold tracking-wider uppercase ${ret.status === "RESTOCKED"
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                : "bg-red-50 text-red-700 border border-red-200"
                              }`}
                          >
                            {ret.status}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-right font-mono text-xs font-bold text-slate-900 whitespace-nowrap">
                          ৳ {returnLoss.toLocaleString()}
                        </td>
                        <td className="px-4 py-4">
                          <p className="text-xs text-slate-500 max-w-[140px] truncate" title={ret.returnReason}>
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
    </div>
  );
}
