import prisma from "@/lib/prisma";
import OrderListClient from "./OrderListClient";
import { getFooterData } from "@/lib/footer";
import { getSession } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const revalidate = 0;

export default async function AdminOrdersPage({ searchParams }: { searchParams: { page?: string, filter?: string, search?: string, source?: string } }) {
  const session = await getSession();
  const canView = hasPermission(session, "VIEW", "ORDERS");
  const canCreate = hasPermission(session, "CREATE", "ORDERS");
  const canEdit = hasPermission(session, "EDIT", "ORDERS");
  const canDelete = hasPermission(session, "DELETE", "ORDERS");

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
            You do not have permission to view orders. Please contact your administrator to assign permissions for your working area.
          </p>
        </div>
      </div>
    );
  }

  const page = Number(searchParams?.page) || 1;
  const filter = searchParams?.filter || "ALL";
  const source = searchParams?.source || "ALL";
  const search = searchParams?.search || "";
  const PER_PAGE = 10;

  const whereClause: any = {};
  if (filter !== "ALL") {
    whereClause.status = filter as any;
  }
  if (source !== "ALL") {
    whereClause.orderSource = source as any;
  }
  if (search) {
    whereClause.OR = [
      { id: { contains: search, mode: 'insensitive' } },
      { customerName: { contains: search, mode: 'insensitive' } },
      { phone: { contains: search, mode: 'insensitive' } },
    ];
  }

  let orders: any[] = [];
  let totalCount = 0;
  let storePhone = "01920240230";
  let storeAddress = "H# 68, R# 12, Sector 10, Uttara, Dhaka - 1230, Bangladesh";

  try {
    const [fetchedOrders, fetchedCount, footerConfig] = await Promise.all([
      prisma.order.findMany({
        where: whereClause,
        skip: (page - 1) * PER_PAGE,
        take: PER_PAGE,
        orderBy: { createdAt: "desc" },
        include: {
          items: {
            include: {
              product: true,
            },
          },
          createdBy: true,
        },
      }),
      prisma.order.count({ where: whereClause }),
      getFooterData()
    ]);
    orders = fetchedOrders;
    totalCount = fetchedCount;

    if (footerConfig) {
      if (footerConfig.contactPhone && footerConfig.contactPhone !== "01700-MYSTIC" && footerConfig.contactPhone.trim() !== "") {
        storePhone = footerConfig.contactPhone;
      }
      if (footerConfig.contactAddress && footerConfig.contactAddress !== "Dhaka, Bangladesh" && footerConfig.contactAddress.trim() !== "") {
        storeAddress = footerConfig.contactAddress;
      }
    }
  } catch (error) {
    console.error("Error fetching orders:", error);
  }

  const totalPages = Math.ceil(totalCount / PER_PAGE);

  return (
    <OrderListClient 
      initialOrders={orders} 
      currentPage={page} 
      totalPages={totalPages} 
      currentFilter={filter}
      currentSource={source}
      currentSearch={search}
      storePhone={storePhone}
      storeAddress={storeAddress}
      canCreate={canCreate}
      canEdit={canEdit}
      canDelete={canDelete}
    />
  );
}
