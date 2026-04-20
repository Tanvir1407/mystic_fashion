import prisma from "@/lib/prisma";
import PurchaseFormClient from "../../new/PurchaseFormClient";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function EditPurchasePage({ params }: { params: { id: string } }) {
  const purchase = await prisma.purchase.findUnique({
    where: { id: params.id },
    include: { items: true },
  });

  if (!purchase) {
    notFound();
  }

  const products = await prisma.product.findMany({
    include: { variants: true }
  });

  return <PurchaseFormClient products={products} initialData={purchase} />;
}
