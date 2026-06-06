import prisma from "@/lib/prisma";
import PurchaseFormClient from "./PurchaseFormClient";

export const dynamic = "force-dynamic";

export default async function NewPurchasePage() {
  const [products, suppliers] = await Promise.all([
    prisma.product.findMany({
      include: { variants: { include: { stocks: true } } }
    }),
    prisma.supplier.findMany({
      where: { active: true },
      orderBy: { name: "asc" }
    })
  ]);
  return <PurchaseFormClient products={products} suppliers={suppliers} />;
}
