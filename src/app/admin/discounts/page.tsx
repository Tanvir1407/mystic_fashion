import { prisma } from "@/lib/prisma";
import DiscountManager from "./DiscountManager";

export const dynamic = "force-dynamic";

export default async function AdminDiscountsPage() {
  let discounts: any[] = [];
  try {
    discounts = await prisma.discount.findMany({
      orderBy: { createdAt: "desc" },
    });
  } catch (error) {
    console.error("Error fetching discounts:", error);
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Discounts</h1>
        <p className="text-sm text-slate-500 mt-1">Manage global promotional discounts or flat rate coupons.</p>
      </div>
      <DiscountManager initialDiscounts={discounts} />
    </div>
  );
}
