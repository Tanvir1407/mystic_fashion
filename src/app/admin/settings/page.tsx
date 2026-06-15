import prisma from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { isRouteAllowed } from "@/lib/permissions";
import { redirect } from "next/navigation";
import { getFooterConfig } from "./footer/actions";
import SettingsDashboardClient from "./SettingsDashboardClient";

export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  const session = await getSession();
  
  if (!session) {
    redirect("/admin/login");
  }

  const isAllowed = isRouteAllowed("/admin/settings", session);
  if (!isAllowed) {
    redirect("/admin/unauthorized");
  }

  const [deliverySettings, dtfSetting, commissionSetting, footerSettings] = await Promise.all([
    prisma.deliverySetting.findUnique({ where: { id: "default" } }),
    prisma.dTFPrintSetting.upsert({
      where: { id: "default" },
      update: {},
      create: { id: "default", printCost: 300 },
    }),
    prisma.commissionSetting.upsert({
      where: { id: "default" },
      update: {},
      create: { id: "default", commissionRate: 10, updatedAt: new Date() },
    }),
    getFooterConfig(),
  ]);

  const initialDeliveryData = {
    insideDhaka: deliverySettings?.insideDhaka ?? 80,
    outsideDhaka: deliverySettings?.outsideDhaka ?? 150,
    posFooter: deliverySettings?.posFooter ?? "Thank you for shopping with Mystic. We hope you love your purchase!",
  };
  const initialDtfCost = dtfSetting.printCost;
  const initialCommissionRate = commissionSetting.commissionRate;

  return (
    <SettingsDashboardClient
      session={session}
      initialDeliveryData={initialDeliveryData}
      initialDtfCost={initialDtfCost}
      initialCommissionRate={initialCommissionRate}
      initialFooterData={footerSettings}
    />
  );
}
