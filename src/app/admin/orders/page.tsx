import prisma from "@/lib/prisma";
import OrderListClient from "./OrderListClient";
import { getFooterData } from "@/lib/footer";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const revalidate = 0;

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
      currentSearch={search}
      storePhone={storePhone}
      storeAddress={storeAddress}
    />
  );
}
