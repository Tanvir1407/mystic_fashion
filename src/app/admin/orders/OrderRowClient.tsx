"use client";

import type { OrderStatus } from "@/generated/prisma/client";
import { updateOrderStatus } from "../actions";
import { useState } from "react";
import Link from "next/link";
import { Eye } from "lucide-react";

export default function OrderRowClient({ 
  order, 
  items, 
  isSelected, 
  onSelect 
}: { 
  order: any, 
  items: any[], 
  isSelected?: boolean, 
  onSelect?: () => void 
}) {
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
        <input 
          type="checkbox" 
          checked={isSelected || false}
          onChange={onSelect}
          className="rounded border-slate-300 text-indigo-600 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 cursor-pointer"
        />
      </td>
      <td className="px-6 py-4">
        <div className="flex flex-col">
          <span className="font-medium text-sm text-slate-900">{order.customerName}</span>
          <span className="text-xs text-slate-500 mt-0.5">{order.phone}</span>
        </div>
      </td>
      <td className="px-6 py-4">
        <div className="flex flex-col items-start gap-1">
          <span className="text-sm text-slate-600 max-w-[250px] truncate" title={order.address}>{order.address}</span>
          <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider">{order.district}</span>
        </div>
      </td>
      <td className="px-6 py-4">
        <div className="flex flex-col gap-0.5">
          {items.map((item) => (
            <div key={item.id} className="text-xs font-medium text-slate-600">
              <span className="text-slate-400">{item.quantity}x</span> {item.product.name} <span className="font-bold text-[#800020]">({item.size})</span>
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
      <td className="px-6 py-4 text-right">
        <Link href={`/admin/orders/${order.id}`} className="inline-flex items-center justify-center p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors rounded-md group-hover:bg-white border border-transparent group-hover:border-slate-200">
          <Eye className="w-4 h-4" />
        </Link>
      </td>
    </tr>
  );
}
