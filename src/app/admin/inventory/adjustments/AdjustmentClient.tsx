"use client";

import { useState, useTransition, useMemo } from "react";
import {
  History,
  AlertCircle,
  CheckCircle2,
  Trash2,
  Save,
  Loader2,
  ArrowLeft,
  Search,
  Plus
} from "lucide-react";
import Link from "next/link";
import { bulkAdjustStock } from "../../actions";
import { StatusAlertModal } from "@/components/StatusAlertModal";
import { AdjustmentType } from "@/generated/prisma/client";
import { CustomSelect } from "@/components/CustomSelect";

interface Product {
  id: string;
  name: string;
  variants: { id: string; size: string; stock: number }[];
}

interface Adjustment {
  id: string;
  variantId: string;
  adjustmentType: AdjustmentType;
  quantity: number;
  previousQuantity: number;
  newQuantity: number;
  reason: string | null;
  createdAt: Date;
  variant: {
    size: string;
    product: {
      name: string;
    };
  };
}

interface BulkItem {
  id: string;
  variantId: string;
  variantSize: string;
  productName: string;
  currentStock: number;
  adjustmentType: AdjustmentType;
  quantity: number | "";
  reason: string;
}

export default function AdjustmentClient({
  products,
  initialAdjustments
}: {
  products: Product[],
  initialAdjustments: any[]
}) {
  const [isPending, startTransition] = useTransition();
  const [adjustments, setAdjustments] = useState<Adjustment[]>(initialAdjustments);
  const [activeTab, setActiveTab] = useState<"BULK_EDITOR" | "LOGS">("BULK_EDITOR");

  // Bulk State
  const [bulkItems, setBulkItems] = useState<BulkItem[]>([]);
  const [searchVariantId, setSearchVariantId] = useState("");

  // Modal State
  const [isErrorModalOpen, setIsErrorModalOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const variantOptions = useMemo(() => {
    return products.flatMap(p => p.variants.map(v => ({
      value: v.id,
      label: `${p.name} - ${v.size} (Current: ${v.stock})`
    })));
  }, [products]);

  // When a variant is selected from the search bar, add a new row to the bulk grid
  const handleAddRow = (variantId: string) => {
    if (!variantId) return;

    // Find the product and variant details
    for (const p of products) {
      const v = p.variants.find(v => v.id === variantId);
      if (v) {
        setBulkItems(prev => [
          ...prev,
          {
            id: Date.now().toString() + Math.random().toString(36).substring(2, 9),
            variantId: v.id,
            variantSize: v.size,
            productName: p.name,
            currentStock: v.stock,
            adjustmentType: "ADDITION",
            quantity: "",
            reason: ""
          }
        ]);
        break;
      }
    }
    setSearchVariantId("");
  };

  const updateBulkItem = (id: string, field: keyof BulkItem, value: any) => {
    setBulkItems(prev => prev.map(item => item.id === id ? { ...item, [field]: value } : item));
  };

  const removeBulkItem = (id: string) => {
    setBulkItems(prev => prev.filter(item => item.id !== id));
  };

  const calculateNewStock = (item: BulkItem) => {
    const qty = Number(item.quantity) || 0;
    if (item.adjustmentType === "ADDITION") return item.currentStock + qty;
    if (item.adjustmentType === "SUBTRACTION") return item.currentStock - qty;
    if (item.adjustmentType === "SET") return qty;
    return item.currentStock;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (bulkItems.length === 0) return;

    // Validation
    for (const item of bulkItems) {
      if (item.quantity === "" || item.quantity < 0) {
        setErrorMessage("Quantity must be zero or a positive number for all items.");
        setIsErrorModalOpen(true);
        return;
      }
      if (item.adjustmentType === "SUBTRACTION" && calculateNewStock(item) < 0) {
        setErrorMessage(`Cannot subtract more stock than available for ${item.productName} (${item.variantSize}).`);
        setIsErrorModalOpen(true);
        return;
      }
    }

    startTransition(async () => {
      const payload = bulkItems.map(item => ({
        variantId: item.variantId,
        adjustmentType: item.adjustmentType,
        quantity: Number(item.quantity),
        reason: item.reason.trim() || undefined
      }));

      const res = await bulkAdjustStock(payload);

      if (res.success) {
        // Refetch or update logs
        // We'll update state with the returned newly created adjustments 
        // Note: the backend bulkAdjustStock doesn't include the full relations in its return for performance,
        // but we can simulate it for the UI update based on bulkItems data.
        const newLogs: Adjustment[] = res.data.map((r: any, idx: number) => {
          const matchedBulkItem = bulkItems[idx];
          return {
            ...r,
            createdAt: new Date(r.createdAt),
            variant: {
              size: matchedBulkItem.variantSize,
              product: { name: matchedBulkItem.productName }
            }
          };
        }).reverse(); // Reverse so newest are at the top

        setAdjustments([...newLogs, ...adjustments].slice(0, 50));
        setBulkItems([]); // Clear grid
        setActiveTab("LOGS"); // Move to logs tab
      } else {
        setErrorMessage(res.error || "An error occurred during bulk adjustment.");
        setIsErrorModalOpen(true);
      }
    });
  };

  // Keyboard Navigation handler
  const handleKeyDown = (e: React.KeyboardEvent, rowIndex: number, colIndex: number) => {
    const maxRow = bulkItems.length - 1;
    const maxCol = 2; // cols: 0=Type, 1=Qty, 2=Reason

    if (e.key === "ArrowUp") {
      e.preventDefault();
      const prevRow = Math.max(0, rowIndex - 1);
      document.querySelector<HTMLElement>(`[data-row="${prevRow}"][data-col="${colIndex}"]`)?.focus();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      const nextRow = Math.min(maxRow, rowIndex + 1);
      document.querySelector<HTMLElement>(`[data-row="${nextRow}"][data-col="${colIndex}"]`)?.focus();
    } else if (e.key === "ArrowLeft") {
      const target = e.target as HTMLInputElement | HTMLSelectElement;
      if (target.tagName === "SELECT" || (target as HTMLInputElement).selectionStart === 0) {
        const prevCol = Math.max(0, colIndex - 1);
        if (prevCol !== colIndex) {
          e.preventDefault();
          document.querySelector<HTMLElement>(`[data-row="${rowIndex}"][data-col="${prevCol}"]`)?.focus();
        }
      }
    } else if (e.key === "ArrowRight") {
      const target = e.target as HTMLInputElement | HTMLSelectElement;
      if (target.tagName === "SELECT" || (target as HTMLInputElement).selectionEnd === (target as HTMLInputElement).value.length) {
        const nextCol = Math.min(maxCol, colIndex + 1);
        if (nextCol !== colIndex) {
          e.preventDefault();
          document.querySelector<HTMLElement>(`[data-row="${rowIndex}"][data-col="${nextCol}"]`)?.focus();
        }
      }
    } else if (e.key === "Enter") {
      e.preventDefault();
      const nextRow = Math.min(maxRow, rowIndex + 1);
      if (nextRow !== rowIndex) {
        document.querySelector<HTMLElement>(`[data-row="${nextRow}"][data-col="${colIndex}"]`)?.focus();
      }
    }
  };

  return (
    <div className="flex flex-col max-w-8xl mx-auto pb-12">
      <StatusAlertModal
        isOpen={isErrorModalOpen}
        onClose={() => setIsErrorModalOpen(false)}
        title="Adjustment Failed"
        message={errorMessage}
      />

      {/* Header Section */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Link href="/admin/inventory" className="p-2 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors text-slate-500">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Stock Adjustments</h1>
            <p className="text-sm text-slate-500 mt-1">Bulk edit inventory levels and track the adjustment history.</p>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex bg-slate-100 p-1 rounded-lg">
          <button
            onClick={() => setActiveTab("BULK_EDITOR")}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${activeTab === "BULK_EDITOR" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
          >
            Bulk Editor
          </button>
          <button
            onClick={() => setActiveTab("LOGS")}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${activeTab === "LOGS" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
          >
            History Logs
          </button>
        </div>
      </div>

      {activeTab === "BULK_EDITOR" && (
        <div className="bg-white border border-slate-200 rounded-lg shadow-sm flex flex-col">
          {/* Editor Header / Search Bar */}
          <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-end gap-4 rounded-t-lg">
            <div className="flex-1 max-w-md">
              <CustomSelect
                label="Search & Add Product Variant"
                placeholder="Type to search and add..."
                options={variantOptions}
                value={searchVariantId}
                onChange={handleAddRow}
                searchable={true}
                heightClass="h-10"
                textClass="text-sm"
              />
            </div>
            <div className="pb-1 text-xs text-slate-500 flex items-center gap-1">
              <AlertCircle className="w-4 h-4 text-slate-400" />
              Tip: Use Arrow keys and Enter to navigate the grid quickly.
            </div>
          </div>

          <form onSubmit={handleSubmit} className="flex-1 flex flex-col">
            <div className="overflow-x-auto min-h-[400px]">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-white">
                    <th className="px-4 py-3 font-semibold text-xs text-slate-600 uppercase tracking-wider w-[30%]">Product</th>
                    <th className="px-4 py-3 font-semibold text-xs text-slate-600 uppercase tracking-wider text-center w-[10%]">Current</th>
                    <th className="px-4 py-3 font-semibold text-xs text-slate-600 uppercase tracking-wider w-[15%]">Type</th>
                    <th className="px-4 py-3 font-semibold text-xs text-slate-600 uppercase tracking-wider w-[15%]">Adj. Qty</th>
                    <th className="px-4 py-3 font-semibold text-xs text-slate-600 uppercase tracking-wider text-center w-[10%]">New</th>
                    <th className="px-4 py-3 font-semibold text-xs text-slate-600 uppercase tracking-wider">Reason</th>
                    <th className="px-4 py-3 font-semibold text-xs text-slate-600 uppercase tracking-wider text-center w-[5%]"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {bulkItems.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-24 text-center text-slate-400">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <Search className="w-8 h-8 text-slate-300" />
                          <p className="text-sm">No items added to the bulk editor.</p>
                          <p className="text-xs text-slate-400">Search for a product variant above to begin.</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    bulkItems.map((item, rowIndex) => {
                      const newStock = calculateNewStock(item);
                      const isNegative = newStock < 0;

                      return (
                        <tr key={item.id} className="hover:bg-slate-50 transition-colors group">
                          <td className="px-4 py-2">
                            <div className="flex flex-col">
                              <span className="text-sm font-medium text-slate-900">{item.productName}</span>
                              <span className="text-[10px] text-slate-500 uppercase font-bold tracking-tight">Size: {item.variantSize}</span>
                            </div>
                          </td>
                          <td className="px-4 py-2 text-center">
                            <span className="text-sm font-mono text-slate-500 bg-slate-100 px-2 py-1 rounded">{item.currentStock}</span>
                          </td>
                          <td className="px-4 py-2">
                            <select
                              value={item.adjustmentType}
                              onChange={(e) => updateBulkItem(item.id, "adjustmentType", e.target.value as AdjustmentType)}
                              onKeyDown={(e) => handleKeyDown(e, rowIndex, 0)}
                              data-row={rowIndex}
                              data-col={0}
                              className="w-full h-9 px-3 border border-slate-300 rounded-md focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-sm bg-white"
                            >
                              <option value="ADDITION">+ Add</option>
                              <option value="SUBTRACTION">- Subtract</option>
                              <option value="SET">= Set</option>
                            </select>
                          </td>
                          <td className="px-4 py-2">
                            <input
                              type="number"
                              value={item.quantity}
                              onChange={(e) => updateBulkItem(item.id, "quantity", e.target.value === "" ? "" : Number(e.target.value))}
                              onKeyDown={(e) => handleKeyDown(e, rowIndex, 1)}
                              data-row={rowIndex}
                              data-col={1}
                              min="0"
                              required
                              placeholder="0"
                              className="w-full h-9 px-3 border border-slate-300 rounded-md focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-sm font-mono"
                            />
                          </td>
                          <td className="px-4 py-2 text-center">
                            <span className={`text-sm font-mono font-bold px-2 py-1 rounded ${isNegative ? "text-red-700 bg-red-100" : "text-slate-900 bg-emerald-50"}`}>
                              {newStock}
                            </span>
                          </td>
                          <td className="px-4 py-2">
                            <input
                              type="text"
                              value={item.reason}
                              onChange={(e) => updateBulkItem(item.id, "reason", e.target.value)}
                              onKeyDown={(e) => handleKeyDown(e, rowIndex, 2)}
                              data-row={rowIndex}
                              data-col={2}
                              placeholder="Reason (optional)"
                              className="w-full h-9 px-3 border border-slate-300 rounded-md focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-sm"
                            />
                          </td>
                          <td className="px-4 py-2 text-center">
                            <button
                              type="button"
                              onClick={() => removeBulkItem(item.id)}
                              className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Editor Footer / Submit */}
            <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-between items-center rounded-b-lg">
              <div className="text-sm text-slate-500 font-medium">
                {bulkItems.length} item{bulkItems.length !== 1 ? 's' : ''} queued for adjustment
              </div>
              <button
                type="submit"
                disabled={isPending || bulkItems.length === 0}
                className="px-6 py-2 bg-slate-900 text-white text-sm font-medium rounded-md hover:bg-slate-800 transition-colors disabled:opacity-50 flex items-center justify-center gap-2 shadow-sm"
              >
                {isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Save All Adjustments
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {activeTab === "LOGS" && (
        <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
            <h2 className="text-xs font-semibold text-slate-600 uppercase tracking-wider flex items-center gap-2">
              <History className="w-3.5 h-3.5" />
              Adjustment History
            </h2>
          </div>

          <div className="overflow-x-auto min-h-[400px]">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-white">
                  <th className="px-6 py-3 font-semibold text-[10px] text-slate-500 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-3 font-semibold text-[10px] text-slate-500 uppercase tracking-wider">Product</th>
                  <th className="px-6 py-3 font-semibold text-[10px] text-slate-500 uppercase tracking-wider text-center">Prev</th>
                  <th className="px-6 py-3 font-semibold text-[10px] text-slate-500 uppercase tracking-wider text-center">Adj</th>
                  <th className="px-6 py-3 font-semibold text-[10px] text-slate-500 uppercase tracking-wider text-center">New</th>
                  <th className="px-6 py-3 font-semibold text-[10px] text-slate-500 uppercase tracking-wider">Reason</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {adjustments.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-sm text-slate-400">
                      No adjustments recorded yet.
                    </td>
                  </tr>
                ) : (
                  adjustments.map((adj) => (
                    <tr key={adj.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-xs text-slate-600 font-medium">
                          {new Date(adj.createdAt).toLocaleDateString("en-GB", { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-0.5">
                          <span className="text-sm font-medium text-slate-900">{adj.variant?.product?.name || "Unknown Product"}</span>
                          <span className="text-[10px] text-slate-500 uppercase font-bold tracking-tight">Size: {adj.variant?.size || "?"}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center text-xs font-mono text-slate-500">{adj.previousQuantity}</td>
                      <td className="px-6 py-4 text-center">
                        <span className={`px-2 py-1 rounded-md text-[10px] font-bold ${adj.adjustmentType === "ADDITION" ? "bg-emerald-100 text-emerald-700" :
                          adj.adjustmentType === "SUBTRACTION" ? "bg-red-100 text-red-700" :
                            "bg-indigo-100 text-indigo-700"
                          }`}>
                          {adj.adjustmentType === "ADDITION" ? "+" :
                            adj.adjustmentType === "SUBTRACTION" ? "-" :
                              adj.adjustmentType === "SET" ? "=" : ""}{adj.quantity}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center text-sm font-mono font-bold text-slate-900">{adj.newQuantity}</td>
                      <td className="px-6 py-4">
                        <p className="text-xs text-slate-500 max-w-[200px] truncate" title={adj.reason || ""}>
                          {adj.reason || "—"}
                        </p>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
