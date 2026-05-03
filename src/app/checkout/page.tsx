import prisma from "@/lib/prisma";
import CheckoutClient from "./CheckoutClient";
import { getFooterData } from "@/lib/footer";

export const dynamic = "force-dynamic";

export default async function CheckoutPage() {
  const [delivery, dtfSetting, footerData] = await Promise.all([
    prisma.deliverySetting.findUnique({ where: { id: "default" } }),
    prisma.dTFPrintSetting.upsert({
      where: { id: "default" },
      update: {},
      create: { id: "default", printCost: 300 },
    }),
    getFooterData(),
  ]);

  const deliveryData = delivery || { insideDhaka: 80, outsideDhaka: 150 };
  const dtfCostPerItem = dtfSetting.printCost;

  return (
    <CheckoutClient
      deliveryData={deliveryData}
      footerData={footerData}
      dtfCostPerItem={dtfCostPerItem}
    />
  );
}
