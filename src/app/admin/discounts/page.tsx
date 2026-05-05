import prisma from "@/lib/prisma";
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
      <div className="flex items-start sm:items-center justify-between flex-col sm:flex-row gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 uppercase">Discount</h1>
          <p className="text-sm text-slate-500 mt-1 font-medium">Manage global promotional pricing and seasonal offers.</p>
        </div>
      </div>
      <DiscountManager initialDiscounts={discounts} />
    </div>
  );
}
