import prisma from "@/lib/prisma";
import OrderListClient from "./OrderListClient";

export const dynamic = "force-dynamic";

export default async function AdminOrdersPage({ searchParams }: { searchParams: { page?: string, filter?: string, search?: string } }) {
  const page = Number(searchParams?.page) || 1;
  const filter = searchParams?.filter || "ALL";
  const search = searchParams?.search || "";
  const PER_PAGE = 10;

  const whereClause: any = {};
  if (filter !== "ALL") {
    whereClause.status = filter as any;
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
  try {
    const [fetchedOrders, fetchedCount] = await Promise.all([
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
        },
      }),
      prisma.order.count({ where: whereClause })
    ]);
    orders = fetchedOrders;
    totalCount = fetchedCount;
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
      currentSearch={search}
    />
  );
}
