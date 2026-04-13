"use client";

import type { OrderStatus } from "@/generated/prisma/client";
import { updateOrderStatus } from "../actions";
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
    <tr className="hover:bg-slate-50/50 transition-colors group">
      <td className="px-6 py-4">
        <div className="flex flex-col">
          <span className="font-medium text-sm text-slate-900">{order.customerName}</span>
          <span className="text-xs text-slate-500 mt-0.5">{order.phone}</span>
        </div>
      </td>
      <td className="px-6 py-4">
        <div className="text-sm text-slate-600 max-w-[250px] truncate" title={order.address}>{order.address}</div>
      </td>
      <td className="px-6 py-4">
        <div className="flex flex-col gap-0.5">
          {items.map((item) => (
            <div key={item.id} className="text-xs font-medium text-slate-600">
              <span className="text-slate-400">{item.quantity}x</span> {item.product.name}
            </div>
          ))}
        </div>
      </td>
      <td className="px-6 py-4 text-sm text-slate-900 font-mono font-medium">
        ৳{order.totalAmount.toLocaleString("en-IN")}
      </td>
      <td className="px-6 py-4 text-right">
        <select
          value={status}
          onChange={handleStatusChange}
          disabled={loading}
          className={`px-3 py-1.5 rounded-md text-xs font-medium border focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors shadow-sm ${
            status === 'DELIVERED' ? 'bg-green-50 text-green-700 border-green-200' :
            status === 'PENDING' ? 'bg-amber-50 text-amber-700 border-amber-200' :
            status === 'CANCELLED' ? 'bg-red-50 text-red-700 border-red-200' :
            'bg-blue-50 text-blue-700 border-blue-200'
          }`}
        >
          {['PENDING', 'PAID', 'SHIPPED', 'DELIVERED', 'CANCELLED'].map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </td>
    </tr>
  );
}
