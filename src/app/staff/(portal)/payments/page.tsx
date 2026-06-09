import { getStaffSession } from "@/lib/staff-auth";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import { formatBDT } from "@/utils/formatPrice";
import { formatDateTime } from "@/utils/formatDate";
import PaymentHistoryClient from "./PaymentHistoryClient";

export const dynamic = "force-dynamic";

export default async function PaymentHistoryPage() {
  const session = await getStaffSession();
  if (!session) redirect("/staff/login");

  const [dailyAgg, payments, totalPaidAgg] = await Promise.all([
    prisma.dailyStaffCommission.aggregate({
      where: { staffId: session.staffId },
      _sum: { commission: true },
    }),
    prisma.commissionPayment.findMany({
      where: { staffId: session.staffId },
      orderBy: { paidAt: "desc" },
    }),
    prisma.commissionPayment.aggregate({ where: { staffId: session.staffId }, _sum: { amount: true } }),
  ]);

  const totalEarned  = dailyAgg._sum.commission ?? 0;
  const totalPaid    = totalPaidAgg._sum.amount ?? 0;
  const totalPending = Math.max(0, totalEarned - totalPaid);

  return (
    <PaymentHistoryClient
      payments={payments}
      totalEarned={totalEarned}
      totalPaid={totalPaid}
      totalPending={totalPending}
    />
  );
}
