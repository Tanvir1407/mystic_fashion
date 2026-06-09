import prisma from "@/lib/prisma";
import { notFound } from "next/navigation";
import StaffDetailsClient from "./StaffDetailsClient";
import { getStaffCommissionSummary } from "@/lib/commission";

export const dynamic = "force-dynamic";

export default async function StaffPerformancePage({ params }: { params: { id: string } }) {
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();

  const [staff, commissionSummary, recentPayments, slabs] = await Promise.all([
    prisma.staff.findUnique({
      where: { id: params.id },
      include: {
        role: { include: { permissions: true } },
        orders: {
          orderBy: { createdAt: "desc" },
          include: { items: { include: { product: true } } },
        },
      },
    }),
    getStaffCommissionSummary(params.id, month, year),
    prisma.commissionPayment.findMany({
      where: { staffId: params.id },
      orderBy: { paidAt: "desc" },
      take: 10,
    }),
    prisma.commissionSlab.findMany({
      orderBy: { priority: "asc" },
    }),
  ]);

  if (!staff) notFound();

  return (
    <div className="max-w-7xl mx-auto pb-10 px-4 sm:px-6">
      <StaffDetailsClient
        staff={staff}
        commissionSummary={commissionSummary}
        recentPayments={recentPayments}
        currentMonth={month}
        currentYear={year}
        slabs={slabs}
      />
    </div>
  );
}
