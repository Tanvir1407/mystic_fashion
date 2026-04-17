import prisma from "@/lib/prisma";
import PurchaseFormClient from "./PurchaseFormClient";

export const dynamic = "force-dynamic";

export default async function NewPurchasePage() {
  const products = await prisma.product.findMany({
    include: { variants: true }
  });
  return <PurchaseFormClient products={products} />;
}
