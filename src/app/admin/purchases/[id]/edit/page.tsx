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

  const [products, suppliers] = await Promise.all([
    prisma.product.findMany({
      include: { variants: true }
    }),
    prisma.supplier.findMany({
      where: { active: true },
      orderBy: { name: "asc" }
    })
  ]);

  return <PurchaseFormClient products={products} suppliers={suppliers} initialData={purchase} />;
}
