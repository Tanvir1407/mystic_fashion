"use client";

import React, { useState, useEffect, useTransition } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Search, Eye, X, ShoppingBag, Calendar, DollarSign, Phone, MapPin } from "lucide-react";
import { AdminPagination } from "@/components/AdminPagination";
import Link from "next/link";

interface Customer {
  id: string;
  name: string;
  phone: string;
  address: string | null;
  createdAt: Date;
  orderCount: number;
  totalSpent: number;
  orders: {
    id: string;
    totalAmount: number;
    status: string;
    createdAt: Date;
  }[];
}

interface CustomerListClientProps {
  customers: Customer[];
  searchVal: string;
  page: number;
  totalPages: number;
}

export default function CustomerListClient({
  customers,
  searchVal,
  page,
  totalPages,
}: CustomerListClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [search, setSearch] = useState(searchVal);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [isPending, startTransition] = useTransition();

  // Sync state with URL parameter if it changes externally
  useEffect(() => {
    setSearch(searchVal);
  }, [searchVal]);

  const handleSearchChange = (val: string) => {
    setSearch(val);
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", "1");
    if (val) {
      params.set("search", val);
    } else {
      params.delete("search");
    }

    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`);
    });
  };

  return (
    <div className="relative">
      {/* Toolbar / Search */}
      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by name or phone..."
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-md text-sm focus:border-slate-300 focus:outline-none focus:ring-0 transition-colors shadow-sm"
          />
          {isPending && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 border-2 border-[#800020] border-t-transparent rounded-full animate-spin" />
          )}
        </div>
      </div>

      {/* Main Grid: List + Optional Drawer */}
      <div className="flex gap-6 items-start">
        {/* Table container */}
        <div className="flex-1 bg-white border border-slate-200 rounded-lg overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="px-6 py-3 font-semibold text-xs text-slate-500 uppercase tracking-wider">Customer Name</th>
                  <th className="px-6 py-3 font-semibold text-xs text-slate-500 uppercase tracking-wider">Phone Number</th>
                  <th className="px-6 py-3 font-semibold text-xs text-slate-500 uppercase tracking-wider">Total Orders</th>
                  <th className="px-6 py-3 font-semibold text-xs text-slate-500 uppercase tracking-wider">Lifetime Value (CLV)</th>
                  <th className="px-6 py-3 font-semibold text-xs text-slate-500 uppercase tracking-wider text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {customers.map((customer) => (
                  <tr
                    key={customer.id}
                    className={`hover:bg-slate-50 transition-colors cursor-pointer ${selectedCustomer?.id === customer.id ? "bg-slate-50" : ""
                      }`}
                    onClick={() => setSelectedCustomer(customer)}
                  >
                    <td className="px-6 py-4">
                      <div className="font-medium text-slate-900">{customer.name}</div>
                      <div className="text-xs text-slate-400 mt-0.5">
                        Joined {new Date(customer.createdAt).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="px-6 py-4 font-mono text-sm text-slate-600">{customer.phone}</td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 text-slate-800 rounded-full text-xs font-semibold">
                        <ShoppingBag className="w-3.5 h-3.5 shrink-0" />
                        {customer.orderCount} orders
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-bold text-slate-900">৳{customer.totalSpent.toLocaleString()}</div>
                    </td>
                    <td className="px-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => setSelectedCustomer(customer)}
                        className="h-8 w-8 inline-flex items-center justify-center bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 rounded-md transition-colors shadow-sm"
                        title="View Order History"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
                {customers.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-slate-500 font-medium text-sm">
                      No customer records found matching your search.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <AdminPagination currentPage={page} totalPages={totalPages} />
        </div>

        {/* Sliding Sidebar Drawer */}
        {selectedCustomer && (
          <div className="w-96 bg-white border border-slate-200 rounded-lg shadow-md shrink-0 sticky top-4 flex flex-col max-h-[80vh] overflow-hidden animate-slide-in">
            {/* Drawer Header */}
            <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <div>
                <h4 className="font-bold text-slate-900 text-sm truncate max-w-[200px]">
                  {selectedCustomer.name}
                </h4>
                <p className="text-xs text-slate-400 mt-0.5">Customer Profile</p>
              </div>
              <button
                onClick={() => setSelectedCustomer(null)}
                className="w-6 h-6 rounded-full hover:bg-slate-200 flex items-center justify-center text-slate-500 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Customer Details info */}
            <div className="p-4 border-b border-slate-200 bg-slate-50/50 space-y-2 text-xs">
              <div className="flex items-center gap-2 text-slate-600">
                <Phone className="w-3.5 h-3.5 shrink-0 text-slate-400" />
                <span className="font-mono">{selectedCustomer.phone}</span>
              </div>
              {selectedCustomer.address && (
                <div className="flex items-start gap-2 text-slate-600">
                  <MapPin className="w-3.5 h-3.5 shrink-0 text-slate-400 mt-0.5" />
                  <span className="leading-relaxed">{selectedCustomer.address}</span>
                </div>
              )}
            </div>

            {/* History Header */}
            <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/20">
              <h5 className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">
                Order History ({selectedCustomer.orderCount})
              </h5>
            </div>

            {/* Order Items List */}
            <div className="flex-1 overflow-y-auto divide-y divide-slate-100 max-h-[400px]">
              {selectedCustomer.orders.map((order) => (
                <div key={order.id} className="p-4 hover:bg-slate-50 transition-colors flex items-center justify-between text-xs">
                  <div>
                    <Link
                      href={`/admin/orders/${order.id}`}
                      className="font-semibold text-[#800020] hover:underline"
                    >
                      Order #{order.id.slice(-6).toUpperCase()}
                    </Link>
                    <div className="flex items-center gap-1.5 text-slate-400 mt-1">
                      <Calendar className="w-3 h-3 shrink-0" />
                      <span>{new Date(order.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-slate-900">৳{order.totalAmount.toLocaleString()}</div>
                    <span
                      className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold mt-1 uppercase ${order.status === "COMPLETED" || order.status === "DELIVERED"
                        ? "bg-emerald-50 text-emerald-700"
                        : order.status === "CANCELLED" || order.status === "RETURNED"
                          ? "bg-rose-50 text-rose-700"
                          : "bg-amber-50 text-amber-700"
                        }`}
                    >
                      {order.status}
                    </span>
                  </div>
                </div>
              ))}
              {selectedCustomer.orders.length === 0 && (
                <div className="p-8 text-center text-slate-400 text-xs font-medium">
                  No orders associated with this profile.
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
