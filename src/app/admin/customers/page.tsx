import prisma from "@/lib/prisma";
import { Filter, Search, ShoppingBag, DollarSign, Users, Award, X, Eye } from "lucide-react";
import Link from "next/link";
import { getSession } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { AdminPagination } from "@/components/AdminPagination";
import CustomerListClient from "./CustomerListClient";

export const dynamic = "force-dynamic";

export default async function AdminCustomersPage({
  searchParams,
}: {
  searchParams: { page?: string; limit?: string; search?: string };
}) {
  const session = await getSession();
  const canView = hasPermission(session, "VIEW", "ORDERS");

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
            You do not have permission to view customers. Please contact your administrator to assign permissions for your working area.
          </p>
        </div>
      </div>
    );
  }

  const page = Number(searchParams?.page) || 1;
  const limit = Number(searchParams?.limit) || 10;
  const search = searchParams?.search || "";
  const PER_PAGE = [10, 20, 50, 100].includes(limit) ? limit : 10;


  // Fetch metrics programmatically
  const [totalCustomersCount, totalOrdersCount, revenueResult] = await Promise.all([
    prisma.customer.count(),
    prisma.order.count(),
    prisma.order.aggregate({
      _sum: {
        totalAmount: true,
      },
    }),
  ]);

  const totalRevenue = revenueResult._sum.totalAmount ?? 0;
  const avgOrderValue = totalOrdersCount > 0 ? totalRevenue / totalOrdersCount : 0;

  // Fetch paginated customers with search
  const whereClause = search
    ? {
        OR: [
          { name: { contains: search, mode: "insensitive" as any } },
          { phone: { contains: search, mode: "insensitive" as any } },
        ],
      }
    : {};

  const [customers, searchCount] = await Promise.all([
    prisma.customer.findMany({
      where: whereClause,
      include: {
        orders: {
          select: {
            id: true,
            totalAmount: true,
            status: true,
            createdAt: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PER_PAGE,
      take: PER_PAGE,
    }),
    prisma.customer.count({ where: whereClause }),
  ]);

  // Format customers for display
  const formattedCustomers = customers.map((c) => {
    const orderCount = c.orders.length;
    const totalSpent = c.orders.reduce((sum, o) => sum + o.totalAmount, 0);
    return {
      ...c,
      orderCount,
      totalSpent,
    };
  });

  const totalPages = Math.ceil(searchCount / PER_PAGE);

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Customers CRM</h1>
        <p className="text-sm text-slate-500 mt-1">
          Monitor customer relationships, checkouts, and total customer lifetime values (CLV).
        </p>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Card 1 */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-slate-100 rounded-lg flex items-center justify-center text-slate-600">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Customers</p>
            <h3 className="text-2xl font-bold text-slate-900 mt-1">{totalCustomersCount}</h3>
          </div>
        </div>

        {/* Card 2 */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-[#800020]/5 rounded-lg flex items-center justify-center text-[#800020]">
            <DollarSign className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Sales</p>
            <h3 className="text-2xl font-bold text-slate-900 mt-1">৳{totalRevenue.toLocaleString()}</h3>
          </div>
        </div>

        {/* Card 3 */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-amber-50 rounded-lg flex items-center justify-center text-amber-600">
            <Award className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Avg Order Value</p>
            <h3 className="text-2xl font-bold text-slate-900 mt-1">৳{Math.round(avgOrderValue).toLocaleString()}</h3>
          </div>
        </div>
      </div>

      {/* Customer List Section */}
      <CustomerListClient 
        customers={formattedCustomers}
        searchVal={search}
        page={page}
        totalPages={totalPages}
      />
    </div>
  );
}
