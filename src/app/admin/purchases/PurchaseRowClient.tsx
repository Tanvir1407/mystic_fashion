"use client";

import { updatePurchaseStatus, deletePurchase } from "../actions";
import { useState } from "react";
import { DeleteWarningModal } from "@/components/DeleteWarningModal";
import { Edit } from "lucide-react";
import Link from "next/link";

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

  const items = purchase.items || [];

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
              <span className="text-slate-400">{item.quantity}x</span> {item.product.name} ({item.variant.size})
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
        
        <Link
          href={`/admin/purchases/${purchase.id}/edit`}
          className="text-slate-400 hover:text-indigo-600 transition-colors p-1"
          title="Edit Purchase"
        >
          <Edit className="w-5 h-5" />
        </Link>

        <DeleteWarningModal
          title={`Delete purchase from "${purchase.supplierName}"?`}
          description={`Permanently removes invoice ${purchase.invoiceNumber || "N/A"} and all its line items. This cannot be undone.`}
          impacts={[
            { label: "Stock levels incremented by this purchase will NOT be reversed — inventory totals will become inaccurate.", severity: "high" },
            { label: "Purchase cost data used to calculate product margins will be lost, breaking profit/loss calculations.", severity: "high" },
            { label: `All ${purchase.items?.length || 0} purchase line item(s) will be permanently deleted from the database.`, severity: "high" },
            { label: "Supplier purchase history reports may show gaps or incorrect totals.", severity: "medium" },
            { label: "The invoice reference number will no longer be traceable in the system.", severity: "low" },
          ]}
          onConfirm={async () => { await deletePurchase(purchase.id); }}
        />
      </td>
    </tr>
  );
}
