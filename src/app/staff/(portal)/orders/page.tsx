import { getStaffSession } from "@/lib/staff-auth";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import { calcPotentialCommission, getEffectiveCommissionRate } from "@/lib/commission";
import StaffOrderListClient from "./StaffOrderListClient";

export const dynamic = "force-dynamic";

interface SearchParamsProps {
  page?: string;
  limit?: string;
  view?: string;
  filter?: string;
  search?: string;
  tag?: string;
  startDate?: string;
  endDate?: string;
}

export default async function StaffOrdersPage({
  searchParams,
}: {
  searchParams: SearchParamsProps;
}) {
  const session = await getStaffSession();
  if (!session) redirect("/staff/login");

  const page = Number(searchParams?.page) || 1;
  const limit = Number(searchParams?.limit) || 10;
  const PER_PAGE = [10, 20, 50, 100].includes(limit) ? limit : 10;

  const view = searchParams?.view || "my";
  const filter = searchParams?.filter || "ALL";
  const search = searchParams?.search || "";
  const selectedTag = searchParams?.tag || "";
  const startDate = searchParams?.startDate || "";
  const endDate = searchParams?.endDate || "";

  // Base where clause
  const whereClause: any = { deletedAt: null };

  // View toggle filter
  if (view === "my") {
    whereClause.createdById = session.staffId;
  }

  // Status filter
  if (filter !== "ALL") {
    whereClause.status = filter;
  }

  // Tag filter
  if (selectedTag) {
    whereClause.tags = { has: selectedTag };
  }

  // Search filter
  if (search) {
    whereClause.OR = [
      { id: { contains: search, mode: "insensitive" } },
      { customerName: { contains: search, mode: "insensitive" } },
      { phone: { contains: search, mode: "insensitive" } },
    ];
  }

  // Date filter
  if (startDate && /^\d{4}-\d{2}-\d{2}$/.test(startDate)) {
    const endVal = endDate && /^\d{4}-\d{2}-\d{2}$/.test(endDate) ? endDate : startDate;
    whereClause.createdAt = {
      gte: new Date(`${startDate}T00:00:00.000+06:00`),
      lte: new Date(`${endVal}T23:59:59.999+06:00`),
    };
  }

  const [orders, totalCount, rate, ordersWithTags] = await Promise.all([
    prisma.order.findMany({
      where: whereClause,
      skip: (page - 1) * PER_PAGE,
      take: PER_PAGE,
      orderBy: { createdAt: "desc" },
      include: {
        salesReturns: {
          select: { returnCost: true, productLoss: true, printingLoss: true, deliveryLoss: true },
        },
        items: { select: { quantity: true } },
      },
    }),
    prisma.order.count({ where: whereClause }),
    getEffectiveCommissionRate(session.staffId),
    prisma.order.findMany({
      select: { tags: true },
      where: { deletedAt: null },
    }),
  ]);

  const uniqueTags = Array.from(
    new Set(ordersWithTags.flatMap((o) => o.tags || []).filter(Boolean))
  );

  const totalPages = Math.ceil(totalCount / PER_PAGE);

  const ordersWithCommission = orders.map((order) => {
    const isOwnOrder = order.createdById === session.staffId;
    return {
      ...order,
      commission: isOwnOrder ? calcPotentialCommission(order, rate) : null,
    };
  });

  return (
    <StaffOrderListClient
      initialOrders={ordersWithCommission}
      currentPage={page}
      totalPages={totalPages}
      currentFilter={filter}
      currentSearch={search}
      currentView={view}
      currentTag={selectedTag}
      availableTags={uniqueTags}
      totalCount={totalCount}
      currentStartDate={startDate}
      currentEndDate={endDate}
    />
  );
}
