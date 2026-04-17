import prisma from "@/lib/prisma";
import PurchaseRowClient from "./PurchaseRowClient";
import { Filter, Plus } from "lucide-react";
import Link from "next/link";

import { AdminPagination } from "@/components/AdminPagination";

export const dynamic = "force-dynamic";

export default async function AdminPurchasesPage({ searchParams }: { searchParams: { page?: string } }) {
  const page = Number(searchParams?.page) || 1;
  const PER_PAGE = 10;

  let purchases: any[] = [];
  let totalCount = 0;
  try {
    const [fetchedPurchases, fetchedCount] = await Promise.all([
      prisma.purchase.findMany({
        skip: (page - 1) * PER_PAGE,
        take: PER_PAGE,
        orderBy: { createdAt: "desc" },
        include: {
          items: {
            include: {
              product: true,
              variant: true
            }
          }
        }
      }),
      prisma.purchase.count()
    ]);
    purchases = fetchedPurchases;
    totalCount = fetchedCount;
  } catch (error) {
    console.error("Error fetching purchases:", error);
  }

  const totalPages = Math.ceil(totalCount / PER_PAGE);

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-start sm:items-center justify-between flex-col sm:flex-row gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Purchases</h1>
          <p className="text-sm text-slate-500 mt-1">Manage wholesale inventory purchases from suppliers.</p>
        </div>
        <Link
          href="/admin/purchases/new"
          className="h-10 px-4 bg-slate-900 text-white text-sm font-medium rounded-md flex items-center justify-center gap-2 hover:bg-slate-800 transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Log Purchase
        </Link>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-3">
        <button className="h-9 px-3 bg-white border border-slate-200 text-slate-600 rounded-md text-sm font-medium flex items-center gap-2 hover:bg-slate-50 transition-colors shadow-sm">
          <Filter className="w-4 h-4" />
          Filter
        </button>
      </div>

      {/* Data Table */}
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="px-6 py-3 font-semibold text-xs text-slate-500 uppercase tracking-wider">Supplier</th>
                <th className="px-6 py-3 font-semibold text-xs text-slate-500 uppercase tracking-wider">Invoice / Ref</th>
                <th className="px-6 py-3 font-semibold text-xs text-slate-500 uppercase tracking-wider">Items Logged</th>
                <th className="px-6 py-3 font-semibold text-xs text-slate-500 uppercase tracking-wider">Total Amount</th>
                <th className="px-6 py-3 font-semibold text-xs text-slate-500 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {purchases.map((purchase: any) => (
                <PurchaseRowClient key={purchase.id} purchase={purchase} />
              ))}
              {purchases.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-500 font-medium text-sm">
                    No supplier purchases have been logged yet.
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
