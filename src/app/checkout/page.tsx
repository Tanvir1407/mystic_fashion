import { prisma } from "@/lib/prisma";
import CheckoutClient from "./CheckoutClient";
import { getFooterData } from "@/lib/footer";

export const dynamic = "force-dynamic";

export default async function CheckoutPage() {
  const [delivery, footerData] = await Promise.all([
    prisma.deliverySetting.findUnique({
      where: { id: "default" }
    }),
    getFooterData()
  ]);

  const deliveryData = delivery || { insideDhaka: 80, outsideDhaka: 150 };

  return <CheckoutClient deliveryData={deliveryData} footerData={footerData} />;
}
