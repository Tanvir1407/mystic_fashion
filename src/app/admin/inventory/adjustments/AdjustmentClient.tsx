"use client";

import { useState, useTransition, useMemo } from "react";
import {
  Package,
  History,
  Plus,
  Minus,
  Settings2,
  AlertCircle,
  ChevronRight,
  ArrowRight,
  Database,
  Calendar,
  User,
  CheckCircle2,
  Trash2,
  Save,
  Loader2,
  Boxes,
  ArrowUpDown,
  RefreshCcw,
  PlusCircle,
  MinusCircle,
  Equal,
  ArrowLeft
} from "lucide-react";
import Link from "next/link";
import { adjustStock } from "../../actions";
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

export default function AdjustmentClient({
  products,
  initialAdjustments
}: {
  products: Product[],
  initialAdjustments: any[]
}) {
  const [isPending, startTransition] = useTransition();
  const [adjustments, setAdjustments] = useState<Adjustment[]>(initialAdjustments);

  // Form State
  const [selectedVariantId, setSelectedVariantId] = useState("");
  const [type, setType] = useState<AdjustmentType>("ADDITION");
  const [quantity, setQuantity] = useState<number | "">("");
  const [reason, setReason] = useState("");

  // Modal State
  const [isErrorModalOpen, setIsErrorModalOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const variantOptions = useMemo(() => {
    return products.flatMap(p => p.variants.map(v => ({
      value: v.id,
      label: `${p.name} - ${v.size} (Current: ${v.stock})`
    })));
  }, [products]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVariantId || quantity === "" || quantity <= 0) return;

    startTransition(async () => {
      const res = await adjustStock({
        variantId: selectedVariantId,
        adjustmentType: type,
        quantity: Number(quantity),
        reason: reason.trim() || undefined,
      });

      if (res.success) {
        const newAdj = {
          ...res.data,
          createdAt: new Date(res.data.createdAt),
          variant: products.flatMap(p => p.variants).find(v => v.id === selectedVariantId) ? {
            size: products.flatMap(p => p.variants).find(v => v.id === selectedVariantId)!.size,
            product: {
              name: products.find(p => p.variants.some(v => v.id === selectedVariantId))!.name
            }
          } : { size: "?", product: { name: "Unknown" } }
        };
        setAdjustments([newAdj, ...adjustments.slice(0, 19)]);

        // Reset Form
        setSelectedVariantId("");
        setQuantity("");
        setReason("");
        setType("ADDITION");
      } else {
        setErrorMessage(res.error || "An error occurred during adjustment.");
        setIsErrorModalOpen(true);
      }
    });
  };

  return (
    <div className="flex flex-col max-w-8xl">
      <StatusAlertModal
        isOpen={isErrorModalOpen}
        onClose={() => setIsErrorModalOpen(false)}
        title="Adjustment Failed"
        message={errorMessage}
      />

      {/* Header Section */}
      <div className="flex items-center gap-4 mb-2">
        <Link href="/admin/inventory" className="p-2 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors text-slate-500">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Stock Adjustments</h1>
          <p className="text-sm text-slate-500 mt-1">Manually adjust inventory levels and track the adjustment history.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">

        {/* Adjustment Form */}
        <div className="md:col-span-1 bg-white border border-slate-200 rounded-lg p-6 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-900 mb-6 flex items-center gap-2">
            <PlusCircle className="w-4 h-4 text-slate-400" />
            New Adjustment
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <CustomSelect
              label="Select Variant *"
              placeholder="Search products..."
              options={variantOptions}
              value={selectedVariantId}
              onChange={setSelectedVariantId}
              searchable={true}
              className="text-sm"
            />

            <div className="grid grid-cols-1 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-900">Adjustment Type *</label>
                <div className="grid grid-cols-3 gap-2">
                  {(["ADDITION", "SUBTRACTION", "SET"] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setType(t)}
                      className={`py-2 px-1 border rounded-md text-[10px] font-bold uppercase transition-colors flex items-center justify-center gap-1 ${type === t
                        ? "bg-slate-900 border-slate-900 text-white"
                        : "bg-white border-slate-200 text-slate-600 hover:border-slate-300"
                        }`}
                    >
                      <span className="text-xs">{t === "ADDITION" ? "+" : t === "SUBTRACTION" ? "-" : "="}</span>
                      {t.replace("TION", "")}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-900">Quantity *</label>
                <input
                  type="number"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value === "" ? "" : Number(e.target.value))}
                  min="1"
                  required
                  placeholder="0"
                  className="w-full px-4 py-2 border border-slate-300 rounded-md focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-sm font-mono"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-900">Reason</label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Brief explanation..."
                rows={3}
                className="w-full px-4 py-2 border border-slate-300 rounded-md focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-sm resize-none"
              />
            </div>

            <button
              type="submit"
              disabled={isPending || !selectedVariantId || quantity === ""}
              className="w-full h-10 bg-slate-900 text-white text-sm font-medium rounded-md hover:bg-slate-800 transition-colors disabled:opacity-50 flex items-center justify-center gap-2 shadow-sm"
            >
              {isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Save Adjustment
                </>
              )}
            </button>
          </form>
        </div>

        {/* History Table */}
        <div className="md:col-span-2 bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
            <h2 className="text-xs font-semibold text-slate-600 uppercase tracking-wider flex items-center gap-2">
              <History className="w-3.5 h-3.5" />
              Recent Logs
            </h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/50">
                  <th className="px-4 py-3 font-semibold text-[10px] text-slate-500 uppercase tracking-wider">Date</th>
                  <th className="px-4 py-3 font-semibold text-[10px] text-slate-500 uppercase tracking-wider">Product</th>
                  <th className="px-4 py-3 font-semibold text-[10px] text-slate-500 uppercase tracking-wider text-center">Prev</th>
                  <th className="px-4 py-3 font-semibold text-[10px] text-slate-500 uppercase tracking-wider text-center">Adj</th>
                  <th className="px-4 py-3 font-semibold text-[10px] text-slate-500 uppercase tracking-wider text-center">New</th>
                  <th className="px-4 py-3 font-semibold text-[10px] text-slate-500 uppercase tracking-wider">Reason</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {adjustments.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center text-sm text-slate-400">
                      No adjustments recorded yet.
                    </td>
                  </tr>
                ) : (
                  adjustments.map((adj) => (
                    <tr key={adj.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-4 py-4 whitespace-nowrap">
                        <span className="text-xs text-slate-600">
                          {new Date(adj.createdAt).toLocaleDateString("en-GB", { day: 'numeric', month: 'short', year: 'numeric' })}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex flex-col gap-0.5">
                          <span className="text-sm font-medium text-slate-900">{adj.variant.product.name}</span>
                          <span className="text-[10px] text-slate-500 uppercase font-bold tracking-tight">Size: {adj.variant.size}</span>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-center text-xs font-mono text-slate-400">{adj.previousQuantity}</td>
                      <td className="px-4 py-4 text-center">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${adj.adjustmentType === "ADDITION" ? "bg-emerald-100 text-emerald-700" :
                          adj.adjustmentType === "SUBTRACTION" ? "bg-red-100 text-red-700" :
                            "bg-indigo-100 text-indigo-700"
                          }`}>
                          {adj.adjustmentType === "ADDITION" ? "+" :
                            adj.adjustmentType === "SUBTRACTION" ? "-" :
                              adj.adjustmentType === "SET" ? "=" : ""}{adj.quantity}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-center text-sm font-mono font-bold text-slate-900">{adj.newQuantity}</td>
                      <td className="px-4 py-4">
                        <p className="text-xs text-slate-500 max-w-[150px] truncate" title={adj.reason || ""}>
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
      </div>
    </div>
  );
}
