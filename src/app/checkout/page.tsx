import { prisma } from "@/lib/prisma";
import CheckoutClient from "./CheckoutClient";

export const dynamic = "force-dynamic";

export default async function CheckoutPage() {
  const delivery = await prisma.deliverySetting.findUnique({
    where: { id: "default" }
  });

  const deliveryData = delivery || { insideDhaka: 80, outsideDhaka: 150 };

  return <CheckoutClient deliveryData={deliveryData} />;
}
