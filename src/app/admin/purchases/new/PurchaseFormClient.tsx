"use client";

import { useState } from "react";
import { createPurchase } from "../../actions";
import { Plus, Trash2, Save, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function PurchaseFormClient({ products }: { products: any[] }) {
  const router = useRouter();
  const [supplierName, setSupplierName] = useState("");
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [totalDiscount, setTotalDiscount] = useState("0");
  const [loading, setLoading] = useState(false);


  const [items, setItems] = useState<{ id: string, productId: string, variantId: string, quantity: number, unitPrice: number }[]>([
    { id: "1", productId: "", variantId: "", quantity: 1, unitPrice: 0 }
  ]);
  const subtotal = items.reduce((acc, item) => acc + (item.quantity * item.unitPrice), 0);
  const grandTotal = subtotal - (parseFloat(totalDiscount) || 0);

  const addItem = () => {
    setItems([...items, { id: Date.now().toString(), productId: "", variantId: "", quantity: 1, unitPrice: 0 }]);
  };

  const removeItem = (id: string) => {
    if (items.length === 1) return; // Optional safety guard
    setItems(items.filter(i => i.id !== id));
  };

  const updateItem = (id: string, field: string, value: any) => {
    setItems(items.map(i => {
      if (i.id === id && field === 'productId') {
        return { ...i, [field]: value, variantId: "" };
      }
      return i.id === id ? { ...i, [field]: value } : i;
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supplierName.trim()) return alert("Supplier Name is required.");

    if (items.length === 0) return alert("Please select at least one Product.");

    for (const item of items) {
      if (!item.productId || !item.variantId) return alert("All purchase items must have a valid Product and Size Variant selected.");
      if (item.quantity <= 0) return alert("Quantities must be greater than 0.");
      if (item.unitPrice < 0) return alert("Unit cost cannot be negative.");
    }

    setLoading(true);
    const cleanedItems = items.map(({ id, ...rest }) => rest);

    await createPurchase(
      supplierName.trim(),
      invoiceNumber.trim() || "",
      grandTotal,
      parseFloat(totalDiscount || "0"),
      cleanedItems
    );
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col pb-12">
      <div className="flex items-center gap-4 mb-2">
        <Link href="/admin/purchases" className="p-2 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors text-slate-500">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Log New Purchase</h1>
          <p className="text-sm text-slate-500 mt-1">Record inward inventory delivery to automatically boost stock counts.</p>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-lg p-6 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div>
            <label className="block text-sm font-semibold text-slate-900 mb-2">Supplier Name *</label>
            <input
              type="text"
              value={supplierName}
              onChange={(e) => setSupplierName(e.target.value)}
              placeholder="e.g. Mystic Vendor Co."
              className="w-full px-4 py-2 border border-slate-300 rounded-md focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-sm"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-900 mb-2">Invoice / Reference #</label>
            <input
              type="text"
              value={invoiceNumber}
              onChange={(e) => setInvoiceNumber(e.target.value)}
              placeholder="INV-2023-XXXX"
              className="w-full px-4 py-2 border border-slate-300 rounded-md focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-sm"
            />
          </div>
        </div>

        <div className="border border-slate-200 rounded-md overflow-hidden mb-8">
          <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex justify-between items-center">
            <h3 className="text-sm font-semibold text-slate-700">Relational Delivery Grid</h3>
            <p className="text-xs text-slate-500 font-medium">Selecting items forces backend stock upgrades</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[700px]">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-100">
                  <th className="px-4 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider w-[40%]">Target Product</th>
                  <th className="px-4 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider w-[20%]">Size Variant</th>
                  <th className="px-4 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider w-24">QTY</th>
                  <th className="px-4 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider w-32">Unit Price (৳)</th>
                  <th className="px-4 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider w-32">Total Price (৳)</th>
                  <th className="px-4 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider w-12"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((item) => {
                  const selectedProduct = products.find(p => p.id === item.productId);
                  const availableVariants = selectedProduct?.variants || [];
                  return (
                    <tr key={item.id}>
                      <td className="px-4 py-2">
                        <select
                          value={item.productId}
                          onChange={(e) => updateItem(item.id, "productId", e.target.value)}
                          className="w-full px-3 py-1.5 border border-slate-200 rounded text-sm focus:outline-none focus:border-indigo-500 bg-white"
                          required
                        >
                          <option value="">-- Target Catalog Item --</option>
                          {products.map(p => (
                            <option key={p.id} value={p.id}>{p.name} - {p.category}</option>
                          ))}
                        </select>
                      </td>
                      <td className="px-4 py-2">
                        <select
                          value={item.variantId}
                          onChange={(e) => updateItem(item.id, "variantId", e.target.value)}
                          className="w-full px-3 py-1.5 border border-slate-200 rounded text-sm focus:outline-none focus:border-indigo-500 bg-white"
                          disabled={!item.productId || availableVariants.length === 0}
                          required
                        >
                          <option value="">-- Size --</option>
                          {availableVariants.map((v: any) => (
                            <option key={v.id} value={v.id}>{v.size}</option>
                          ))}
                        </select>
                      </td>
                      <td className="px-4 py-2">
                        <input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) => updateItem(item.id, "quantity", parseInt(e.target.value) || 1)}
                          className="w-full px-3 py-1.5 border border-slate-200 rounded text-sm focus:outline-none focus:border-indigo-500 font-mono"
                        />
                      </td>
                      <td className="px-4 py-2">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.unitPrice}
                          onChange={(e) => updateItem(item.id, "unitPrice", parseFloat(e.target.value) || 0)}
                          className="w-full px-3 py-1.5 border border-slate-200 rounded text-sm focus:outline-none focus:border-indigo-500 font-mono"
                        />
                      </td>
                      <td className="px-4 py-2">
                        <input
                          type="text"
                          value={(item.quantity * item.unitPrice).toFixed(2)}
                          readOnly
                          className="w-full px-3 py-1.5 border border-slate-100 rounded text-sm bg-slate-50 text-slate-500 font-mono text-right"
                        />
                      </td>
                      <td className="px-4 py-2 text-center">
                        <button
                          type="button"
                          onClick={() => removeItem(item.id)}
                          className="text-slate-400 hover:text-red-600 transition-colors p-1 rounded-md hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <div className="bg-white p-3 text-center border-t border-slate-100">
            <button
              type="button"
              onClick={addItem}
              className="text-xs font-medium text-indigo-600 hover:text-indigo-800 flex items-center justify-center gap-1 mx-auto bg-indigo-50 px-3 py-1.5 rounded-full transition-colors"
            >
              <Plus className="w-3 h-3" />
              Add Relational Mapping Row
            </button>
          </div>
        </div>

        <div className="bg-slate-50 p-6 rounded-lg border border-slate-200 mb-8 flex flex-col gap-4 items-end">
          <div className="flex items-center gap-8 text-sm">
            <span className="text-slate-500 font-medium">Subtotal (Item sum):</span>
            <span className="text-slate-900 font-mono font-bold text-lg">৳ {subtotal.toFixed(2)}</span>
          </div>

          <div className="flex items-center gap-8">
            <label className="text-sm text-slate-500 font-medium">Supplier Discount (৳):</label>
            <input
              type="number"
              step="0.01"
              value={totalDiscount}
              onChange={(e) => setTotalDiscount(e.target.value)}
              className="w-32 px-3 py-1.5 border border-slate-300 rounded-md focus:outline-none focus:border-indigo-500 text-sm font-mono text-right"
            />
          </div>

          <div className="flex items-center gap-8 py-3 border-t border-slate-200 w-full justify-end pt-5">
            <span className="text-base font-semibold text-slate-900">Grand Total Paid:</span>
            <span className="text-2xl font-bold text-indigo-600 font-mono">৳ {grandTotal.toFixed(2)}</span>
          </div>
        </div>

        <div className="flex justify-end pt-4 border-t border-slate-100">
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2.5 bg-slate-900 text-white font-medium rounded-md flex items-center justify-center gap-2 hover:bg-slate-800 transition-colors disabled:opacity-75 shadow-sm"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-white/50 border-t-white rounded-full animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            Save Purchase & Dispatch Stock Updates
          </button>
        </div>
      </div>
    </form>
  );
}
