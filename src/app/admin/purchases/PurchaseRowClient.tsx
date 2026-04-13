"use client";

import { updatePurchaseStatus, deletePurchase } from "../actions";
import { useState } from "react";
import { Trash2 } from "lucide-react";

export default function PurchaseRowClient({ purchase }: { purchase: any }) {
  const [status, setStatus] = useState<string>(purchase.status);
  const [loading, setLoading] = useState(false);

  const handleStatusChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newStatus = e.target.value;
    setStatus(newStatus);
    setLoading(true);
    await updatePurchaseStatus(purchase.id, newStatus);
    setLoading(false);
  };

  const items = purchase.itemsJSON || [];

  return (
    <tr className="hover:bg-slate-50/50 transition-colors group">
      <td className="px-6 py-4">
        <div className="flex flex-col">
          <span className="font-medium text-sm text-slate-900">{purchase.supplierName}</span>
          <span className="text-xs text-slate-500 mt-0.5">{new Date(purchase.createdAt).toLocaleDateString()}</span>
        </div>
      </td>
      <td className="px-6 py-4">
        <div className="text-sm text-slate-600 max-w-[200px] truncate">
          {purchase.invoiceNumber || <span className="italic text-slate-400">N/A</span>}
        </div>
      </td>
      <td className="px-6 py-4">
        <div className="flex flex-col gap-0.5 max-h-24 overflow-y-auto">
          {items.map((item: any, idx: number) => (
             <div key={idx} className="text-xs font-medium text-slate-600">
              <span className="text-slate-400">{item.quantity}x</span> {item.name}
            </div>
          ))}
          {items.length === 0 && <span className="text-xs text-slate-400 italic">No items detailed</span>}
        </div>
      </td>
      <td className="px-6 py-4 text-sm text-slate-900 font-mono font-medium">
        ৳{purchase.totalAmount.toLocaleString("en-IN")}
      </td>
      <td className="px-6 py-4 flex items-center justify-end gap-3">
        <select
          value={status}
          onChange={handleStatusChange}
          disabled={loading}
          className={`px-3 py-1.5 rounded-md text-xs font-medium border focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors shadow-sm ${
            status === 'COMPLETED' ? 'bg-green-50 text-green-700 border-green-200' :
            status === 'PENDING' ? 'bg-amber-50 text-amber-700 border-amber-200' :
            status === 'CANCELLED' ? 'bg-red-50 text-red-700 border-red-200' :
            'bg-slate-50 text-slate-700 border-slate-200'
          }`}
        >
          {['PENDING', 'COMPLETED', 'CANCELLED'].map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        
        <form className="opacity-0 group-hover:opacity-100 transition-opacity" action={async () => {
          await deletePurchase(purchase.id);
        }}>
           <button type="submit" className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors" title="Delete Purchase">
              <Trash2 className="w-4 h-4" />
           </button>
        </form>
      </td>
    </tr>
  );
}
