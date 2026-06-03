import prisma from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import CustomerDetailsClient from "./CustomerDetailsClient";

export const dynamic = "force-dynamic";

export default async function CustomerDetailPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { page?: string; limit?: string };
}) {
  const session = await getSession();
  const canView = hasPermission(session, "VIEW", "ORDERS");

  if (!canView) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
        <div className="w-full max-w-md bg-white dark:bg-zinc-900 shadow-[0_4px_20px_rgba(0,0,0,0.05)] border border-slate-100 dark:border-zinc-800 rounded-xl p-8 md:p-10 text-center flex flex-col items-center">
          <div className="w-12 h-12 bg-[#800020]/5 rounded-full flex items-center justify-center mb-6">
            <svg className="w-5 h-5 text-[#800020]" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m0 0v2m0-2h2m-2 0H10m3-9a3 3 0 11-6 0 3 3 0 016 0zM21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight mb-3">Access Restricted</h2>
          <p className="text-sm text-slate-500 dark:text-zinc-400 mb-2 leading-relaxed max-w-xs font-normal">
            You do not have permission to view customer details. Please contact your administrator.
          </p>
        </div>
      </div>
    );
  }

  const page = Number(searchParams?.page) || 1;
  const limit = Number(searchParams?.limit) || 10;
  const PER_PAGE = [10, 20, 50, 100].includes(limit) ? limit : 10;

  // Query customer details, paginated orders, and aggregates in parallel
  const [customer, paginatedOrders, metricsResult, successOrdersCount, failedOrdersCount] = await Promise.all([
    prisma.customer.findUnique({
      where: { id: params.id },
      include: {
        addresses: {
          orderBy: { isDefault: "desc" },
        },
      },
    }),
    prisma.order.findMany({
      where: { customerId: params.id },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PER_PAGE,
      take: PER_PAGE,
    }),
    prisma.order.aggregate({
      where: { customerId: params.id },
      _sum: {
        totalAmount: true,
      },
      _count: {
        id: true,
      },
    }),
    prisma.order.count({
      where: {
        customerId: params.id,
        status: "DELIVERED",
      },
    }),
    prisma.order.count({
      where: {
        customerId: params.id,
        status: { in: ["CANCELLED", "RETURNED"] },
      },
    }),
  ]);

  if (!customer) {
    notFound();
  }

  const totalOrdersCount = metricsResult._count.id;
  const totalSpent = metricsResult._sum.totalAmount || 0;
  const totalPages = Math.ceil(totalOrdersCount / PER_PAGE);

  // Format dates for serialization
  const serializedCustomer = {
    id: customer.id,
    name: customer.name,
    phone: customer.phone,
    address: customer.address,
    email: customer.email,
    isActive: customer.isActive,
    createdAt: customer.createdAt.toISOString(),
    updatedAt: customer.updatedAt.toISOString(),
    addresses: customer.addresses.map((addr) => ({
      id: addr.id,
      label: addr.label,
      fullName: addr.fullName,
      phone: addr.phone,
      district: addr.district,
      address: addr.address,
      isDefault: addr.isDefault,
      createdAt: addr.createdAt.toISOString(),
    })),
  };

  const serializedOrders = paginatedOrders.map((order) => ({
    id: order.id,
    status: order.status,
    totalAmount: order.totalAmount,
    advancePaid: order.advancePaid,
    deliveryCharge: order.deliveryCharge,
    discountAmount: order.discountAmount,
    createdAt: order.createdAt.toISOString(),
  }));

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto pb-10 px-4 sm:px-6">
      {/* Page Header */}
      <div className="flex items-center gap-3 pb-5 border-b border-slate-200">
        <Link
          href="/admin/customers"
          className="p-2 bg-white border border-slate-200 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-50 shadow-sm transition-colors shrink-0"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            <span className="font-semibold text-slate-700">{customer.name}</span>
          </h1>
          <p className="text-xs font-medium text-slate-500 mt-1">
            Joined on {new Date(customer.createdAt).toLocaleDateString("en-GB", {
              day: "numeric",
              month: "short",
              year: "numeric",
            })}
          </p>
        </div>
      </div>

      <CustomerDetailsClient
        customer={serializedCustomer}
        orders={serializedOrders}
        currentPage={page}
        totalPages={totalPages}
        totalSpent={totalSpent}
        totalOrders={totalOrdersCount}
        successCount={successOrdersCount}
        failedCount={failedOrdersCount}
      />
    </div>
  );
}
