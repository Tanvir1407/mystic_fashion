import { getStaffSession } from "@/lib/staff-auth";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import { getEffectiveCommissionRate, calcOrderCommission } from "@/lib/commission";
import { formatBDT } from "@/utils/formatPrice";
import { formatDateTime } from "@/utils/formatDate";
import PaymentHistoryClient from "./PaymentHistoryClient";

export const dynamic = "force-dynamic";

export default async function PaymentHistoryPage() {
  const session = await getStaffSession();
  if (!session) redirect("/staff/login");

  const rate = await getEffectiveCommissionRate(session.staffId);

  // All payments ever
  const payments = await prisma.commissionPayment.findMany({
    where: { staffId: session.staffId },
    orderBy: { paidAt: "desc" },
  });

  // All-time totals
  const [deliveredOrders, totalPaidAgg] = await Promise.all([
    prisma.order.findMany({
      where: { createdById: session.staffId, status: "DELIVERED", deletedAt: null },
      include: { salesReturns: { select: { returnCost: true, productLoss: true, printingLoss: true, deliveryLoss: true } } },
    }),
    prisma.commissionPayment.aggregate({ where: { staffId: session.staffId }, _sum: { amount: true } }),
  ]);

  const totalEarned  = deliveredOrders.reduce((s, o) => s + calcOrderCommission(o, rate), 0);
  const totalPaid    = totalPaidAgg._sum.amount ?? 0;
  const totalPending = Math.max(0, totalEarned - totalPaid);

  return (
    <PaymentHistoryClient
      payments={payments}
      totalEarned={totalEarned}
      totalPaid={totalPaid}
      totalPending={totalPending}
      rate={rate}
    />
  );
}
