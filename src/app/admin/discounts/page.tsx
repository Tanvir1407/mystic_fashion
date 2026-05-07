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
    <div>
      <DiscountManager initialDiscounts={discounts} />
    </div>
  );
}
