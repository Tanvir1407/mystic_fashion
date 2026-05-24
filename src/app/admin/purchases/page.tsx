import prisma from "@/lib/prisma";
import PurchaseRowClient from "./PurchaseRowClient";
import { Filter, Plus } from "lucide-react";
import Link from "next/link";
import { getSession } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";

import { AdminPagination } from "@/components/AdminPagination";

export const dynamic = "force-dynamic";

export default async function AdminPurchasesPage({ searchParams }: { searchParams: { page?: string; limit?: string } }) {
  const session = await getSession();
  const canView = hasPermission(session, "VIEW", "PURCHASES");
  const canCreate = hasPermission(session, "CREATE", "PURCHASES");
  const canEdit = hasPermission(session, "EDIT", "PURCHASES");
  const canDelete = hasPermission(session, "DELETE", "PURCHASES");

  if (!canView) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
        <div className="w-full max-w-md bg-white dark:bg-zinc-900 shadow-[0_4px_20px_rgba(0,0,0,0.05)] border border-slate-100 dark:border-zinc-800 rounded-xl p-8 md:p-10 text-center flex flex-col items-center animate-fade-in">
          <div className="w-12 h-12 bg-[#800020]/5 rounded-full flex items-center justify-center mb-6">
            <svg className="w-5 h-5 text-[#800020]" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m0 0v2m0-2h2m-2 0H10m3-9a3 3 0 11-6 0 3 3 0 016 0zM21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight mb-3">Access Restricted</h2>
          <p className="text-sm text-slate-500 dark:text-zinc-400 mb-2 leading-relaxed max-w-xs font-normal">
            You do not have permission to view purchases. Please contact your administrator to assign permissions for your working area.
          </p>
        </div>
      </div>
    );
  }

  const page = Number(searchParams?.page) || 1;
  const limit = Number(searchParams?.limit) || 10;
  const PER_PAGE = [10, 20, 50, 100].includes(limit) ? limit : 10;


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
        {canCreate && (
          <Link
            href="/admin/purchases/new"
            className="h-10 px-4 bg-slate-900 text-white text-sm font-medium rounded-md flex items-center justify-center gap-2 hover:bg-slate-800 transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Log Purchase
          </Link>
        )}
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
                {(canEdit || canDelete) && (
                  <th className="px-6 py-3 font-semibold text-xs text-slate-500 uppercase tracking-wider text-right">Actions</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {purchases.map((purchase: any) => (
                <PurchaseRowClient 
                  key={purchase.id} 
                  purchase={purchase} 
                  canEdit={canEdit}
                  canDelete={canDelete}
                />
              ))}
              {purchases.length === 0 && (
                <tr>
                  <td colSpan={canEdit || canDelete ? 5 : 4} className="px-6 py-12 text-center text-slate-500 font-medium text-sm">
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
