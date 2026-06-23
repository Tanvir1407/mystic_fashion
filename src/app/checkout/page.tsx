import type { Metadata } from "next";
import prisma from "@/lib/prisma";
import CheckoutClient from "./CheckoutClient";
import { getFooterData } from "@/lib/footer";
import { getCustomerSession } from "@/lib/auth";
import { getPathaoCities } from "@/app/actions/pathao";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Checkout | Mystic Fashion",
  description: "Complete your order at Mystic Fashion.",
  robots: { index: false, follow: false },
};

export default async function CheckoutPage() {
  const session = await getCustomerSession();
  
  let customerSession = null;
  let savedAddresses: any[] = [];

  if (session) {
    const customer = await prisma.customer.findUnique({
      where: { id: session.customerId },
      include: {
        addresses: {
          orderBy: { isDefault: "desc" }
        }
      }
    });
    
    if (customer) {
      customerSession = {
        id: customer.id,
        name: customer.name,
        phone: customer.phone,
        email: customer.email
      };
      savedAddresses = customer.addresses.map(addr => ({
        id: addr.id,
        label: addr.label,
        fullName: addr.fullName,
        phone: addr.phone,
        district: addr.district,
        address: addr.address,
        pathaoCityId: addr.pathaoCityId,
        pathaoZoneId: addr.pathaoZoneId,
        pathaoAreaId: addr.pathaoAreaId,
        isDefault: addr.isDefault
      }));
    }
  }

  const [delivery, dtfSetting, footerData, citiesRes] = await Promise.all([
    prisma.deliverySetting.findUnique({ where: { id: "default" } }),
    prisma.dTFPrintSetting.upsert({
      where: { id: "default" },
      update: {},
      create: { id: "default", printCost: 300 },
    }),
    getFooterData(),
    getPathaoCities(),
  ]);

  const deliveryData = delivery || { insideDhaka: 80, outsideDhaka: 150 };
  const dtfCostPerItem = dtfSetting.printCost;
  const serverCities = citiesRes.success && citiesRes.data
    ? citiesRes.data.map((c: any) => ({ value: c.city_id.toString(), label: c.city_name }))
    : null;

  return (
    <CheckoutClient
      deliveryData={deliveryData}
      footerData={footerData}
      dtfCostPerItem={dtfCostPerItem}
      customerSession={customerSession}
      savedAddresses={savedAddresses}
      serverCities={serverCities}
    />
  );
}
