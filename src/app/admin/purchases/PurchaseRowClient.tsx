"use client";

import { updatePurchaseStatus, deletePurchase, restorePurchase } from "./actions";
import { useState } from "react";
import { DeleteWarningModal } from "@/components/DeleteWarningModal";
import { Edit, RotateCcw } from "lucide-react";
import Link from "next/link";
import { formatBDT } from "@/utils/formatPrice";
import { useRouter } from "next/navigation";

export default function PurchaseRowClient({
  purchase,
  canEdit,
  canDelete
}: {
  purchase: any,
  canEdit: boolean,
  canDelete: boolean
}) {
  const [status, setStatus] = useState<string>(purchase.status);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleStatusChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newStatus = e.target.value;
    setStatus(newStatus);
    setLoading(true);
    await updatePurchaseStatus(purchase.id, newStatus);
    setLoading(false);
  };

  const handleRestore = async () => {
    setLoading(true);
    const result = await restorePurchase(purchase.id);
    if (result.success) {
      router.refresh();
    } else {
      alert(result.error || "Failed to restore purchase");
    }
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
        {formatBDT(purchase.totalAmount)}
      </td>
      {(canEdit || canDelete) && (
        <td className="px-6 py-4 flex items-center justify-end gap-3">
          {canEdit ? (
            <select
              value={status}
              onChange={handleStatusChange}
              disabled={loading}
              className={`px-3 py-1.5 rounded-md text-xs font-medium border focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors shadow-sm ${status === 'COMPLETED' ? 'bg-green-50 text-green-700 border-green-200' :
                  status === 'PENDING' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                    status === 'CANCELLED' ? 'bg-red-50 text-red-700 border-red-200' :
                      'bg-slate-50 text-slate-700 border-slate-200'
                }`}
            >
              {['PENDING', 'COMPLETED', 'CANCELLED'].map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          ) : (
            <span className={`px-3 py-1.5 rounded-md text-xs font-medium border ${status === 'COMPLETED' ? 'bg-green-50 text-green-700 border-green-200' :
                status === 'PENDING' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                  status === 'CANCELLED' ? 'bg-red-50 text-red-700 border-red-200' :
                    'bg-slate-50 text-slate-700 border-slate-200'
              }`}>
              {status}
            </span>
          )}

          {purchase.deletedAt ? (
            <button
              onClick={handleRestore}
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-md hover:bg-indigo-100 hover:border-indigo-300 transition-colors disabled:opacity-50"
            >
              <RotateCcw className="w-4 h-4" />
              Restore
            </button>
          ) : (
            <>
              {canEdit && (
                <Link
                  href={`/admin/purchases/${purchase.id}/edit`}
                  className="text-slate-400 hover:text-indigo-600 transition-colors p-1"
                  title="Edit Purchase"
                >
                  <Edit className="w-5 h-5" />
                </Link>
              )}

              {canDelete && (
                <DeleteWarningModal
                  title={`Move purchase from "${purchase.supplierName}" to Trash?`}
                  description={`This will move the purchase invoice ${purchase.invoiceNumber || "N/A"} to the Trash Bin. You can restore it at any time.`}
                  impacts={[
                    { label: "The purchase logging will be hidden from the active list.", severity: "low" },
                    { label: "Purchase history data is preserved in the Trash Bin.", severity: "low" },
                  ]}
                  onConfirm={async () => { await deletePurchase(purchase.id); }}
                />
              )}
            </>
          )}
        </td>
      )}
    </tr>
  );
}

