"use client";

import { useState } from "react";
import { createPurchase } from "../../actions";
import { Plus, Trash2, Save, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function PurchaseFormClient() {
  const router = useRouter();
  const [supplierName, setSupplierName] = useState("");
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [totalAmount, setTotalAmount] = useState("");
  const [loading, setLoading] = useState(false);

  const [items, setItems] = useState<{ id: string, name: string, quantity: number }[]>([
    { id: "1", name: "", quantity: 1 }
  ]);

  const addItem = () => {
    setItems([...items, { id: Date.now().toString(), name: "", quantity: 1 }]);
  };

  const removeItem = (id: string) => {
    setItems(items.filter(i => i.id !== id));
  };

  const updateItem = (id: string, field: string, value: string | number) => {
    setItems(items.map(i => i.id === id ? { ...i, [field]: value } : i));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supplierName.trim()) return alert("Supplier Name is required.");
    if (!totalAmount || isNaN(Number(totalAmount))) return alert("Total Amount must be a valid number.");
    
    setLoading(true);
    const cleanedItems = items.filter(i => i.name.trim() !== "").map(({ id, ...rest }) => rest);
    
    await createPurchase(
      supplierName.trim(),
      invoiceNumber.trim() || "",
      Number(totalAmount),
      cleanedItems.length > 0 ? cleanedItems : null
    );
    // Router redirect runs in server action
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6 max-w-4xl">
      <div className="flex items-center gap-4 mb-2">
        <Link href="/admin/purchases" className="p-2 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors text-slate-500">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Log New Purchase</h1>
          <p className="text-sm text-slate-500 mt-1">Record a new inward inventory delivery from a supplier.</p>
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
          <div className="md:col-span-2">
            <label className="block text-sm font-semibold text-slate-900 mb-2">Total Amount (৳) *</label>
            <input 
              type="number" 
              step="0.01"
              value={totalAmount}
              onChange={(e) => setTotalAmount(e.target.value)}
              placeholder="50000"
              className="w-full max-w-sm px-4 py-2 border border-slate-300 rounded-md focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-sm font-mono"
              required
            />
          </div>
        </div>

        <div className="border border-slate-200 rounded-md overflow-hidden mb-8">
           <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex justify-between items-center">
            <h3 className="text-sm font-semibold text-slate-700">Purchased Items (Optional)</h3>
          </div>
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100">
                <th className="px-4 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">Item Name / SKU</th>
                <th className="px-4 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider w-32">Qty</th>
                <th className="px-4 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider w-16"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.map((item) => (
                <tr key={item.id}>
                  <td className="px-4 py-2">
                    <input 
                      type="text" 
                      value={item.name} 
                      onChange={(e) => updateItem(item.id, "name", e.target.value)}
                      placeholder="e.g. Blank White Tees M"
                      className="w-full px-3 py-1.5 border border-slate-200 rounded text-sm focus:outline-none focus:border-indigo-500"
                    />
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
              ))}
            </tbody>
          </table>
          <div className="bg-white p-3 text-center border-t border-slate-100">
            <button 
               type="button"
               onClick={addItem}
               className="text-xs font-medium text-indigo-600 hover:text-indigo-800 flex items-center justify-center gap-1 mx-auto bg-indigo-50 px-3 py-1.5 rounded-full transition-colors"
            >
              <Plus className="w-3 h-3" />
              Add Another Item
            </button>
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
            Save Purchase
          </button>
        </div>
      </div>
    </form>
  );
}
