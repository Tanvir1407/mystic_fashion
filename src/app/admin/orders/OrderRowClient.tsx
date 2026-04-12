"use client";

import { OrderStatus } from "@/generated/prisma/client";
import { updateOrderStatus } from "../../actions";
import { useState } from "react";

export default function OrderRowClient({ order, items }: { order: any, items: any[] }) {
  const [status, setStatus] = useState<OrderStatus>(order.status);
  const [loading, setLoading] = useState(false);

  const handleStatusChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newStatus = e.target.value as OrderStatus;
    setStatus(newStatus);
    setLoading(true);
    await updateOrderStatus(order.id, newStatus);
    setLoading(false);
  };

  return (
    <tr className="hover:bg-slate-50 dark:hover:bg-zinc-800/50 transition-colors">
      <td className="p-4">
        <div className="font-bold text-foreground">{order.customerName}</div>
        <div className="text-xs text-foreground/60">{order.phone}</div>
      </td>
      <td className="p-4">
        <div className="text-sm text-foreground/80 lowercase max-w-[200px] truncate">{order.address}</div>
      </td>
      <td className="p-4">
        <div className="flex flex-col gap-1">
          {items.map((item) => (
            <div key={item.id} className="text-xs font-medium text-foreground/70">
              {item.quantity}x {item.product.name}
            </div>
          ))}
        </div>
      </td>
      <td className="p-4 font-mono font-bold text-maroon">
        ৳{order.totalAmount.toLocaleString("en-IN")}
      </td>
      <td className="p-4">
        <select
          value={status}
          onChange={handleStatusChange}
          disabled={loading}
          className={`px-3 py-1.5 rounded-lg text-sm font-bold border-2 focus:outline-none transition-colors ${
            status === 'DELIVERED' ? 'bg-green-50 text-green-700 border-green-200 dark:bg-green-500/10 dark:border-green-500/20' :
            status === 'PENDING' ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:border-amber-500/20' :
            status === 'CANCELLED' ? 'bg-red-50 text-red-700 border-red-200 dark:bg-red-500/10 dark:border-red-500/20' :
            'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:border-blue-500/20'
          }`}
        >
          {Object.values(OrderStatus).map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </td>
    </tr>
  );
}
