"use client";

import React, { useState, useEffect, useTransition } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Search, Eye, ShoppingBag, X } from "lucide-react";
import { AdminPagination } from "@/components/AdminPagination";

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
  const [isPending, startTransition] = useTransition();

  // Sync state with URL parameter if it changes externally
  useEffect(() => {
    setSearch(searchVal);
  }, [searchVal]);

  const handleSearch = () => {
    const params = new URLSearchParams(searchParams.toString());
    if (search) {
      params.set("search", search);
    } else {
      params.delete("search");
    }
    params.set("page", "1");

    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`);
    });
  };

  return (
    <div className="relative">
      {/* Toolbar / Search */}
      <div className="w-full bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden mb-6">
        <div className="p-4 flex flex-col md:flex-row md:items-center gap-4 justify-between">
          <div className="flex-1 relative group max-w-[350px]">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-slate-400 group-focus-within:text-slate-900 transition-colors" />
            </div>
            <input
              type="text"
              placeholder="Search by name or phone..."
              value={search}
              onChange={(e) => {
                const val = e.target.value;
                setSearch(val);
                if (val === "") {
                  const params = new URLSearchParams(searchParams.toString());
                  params.delete("search");
                  params.set("page", "1");
                  startTransition(() => {
                    router.push(`${pathname}?${params.toString()}`);
                  });
                }
              }}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              className="block w-full pl-10 pr-24 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:ring-4 focus:ring-slate-500/10 focus:border-slate-300 focus:bg-white transition-all outline-none font-medium text-slate-900 placeholder:text-slate-400"
            />
            <div className="absolute inset-y-0 right-0 pr-1 flex items-center gap-1">
              {search && (
                <button
                  type="button"
                  onClick={() => {
                    setSearch("");
                    const params = new URLSearchParams(searchParams.toString());
                    params.delete("search");
                    params.set("page", "1");
                    startTransition(() => {
                      router.push(`${pathname}?${params.toString()}`);
                    });
                  }}
                  className="p-1.5 hover:bg-slate-200 rounded-md transition-colors text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
              <button
                type="button"
                onClick={handleSearch}
                className="px-3 py-1.5 bg-slate-900 text-white text-xs font-semibold rounded-md hover:bg-slate-800 transition-colors"
              >
                Search
              </button>
            </div>
          </div>
          {isPending && (
            <div className="w-5 h-5 border-2 border-[#800020] border-t-transparent rounded-full animate-spin shrink-0" />
          )}
        </div>
      </div>

      {/* Table Container */}
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-sm">
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
                  className="hover:bg-slate-50/80 transition-colors cursor-pointer"
                  onClick={() => router.push(`/admin/customers/${customer.id}`)}
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
                      onClick={() => router.push(`/admin/customers/${customer.id}`)}
                      className="h-8 w-8 inline-flex items-center justify-center bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 rounded-md transition-colors shadow-sm"
                      title="View Customer Profile"
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
    </div>
  );
}

