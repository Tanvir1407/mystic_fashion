import prisma from "@/lib/prisma";
import DeliverySettingsClient from "./DeliverySettingsClient";
import { Settings } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  let settings = { insideDhaka: 80, outsideDhaka: 150 };
  try {
    const fetchedSettings = await prisma.deliverySetting.findUnique({
      where: { id: "default" }
    });
    if (fetchedSettings) settings = fetchedSettings;
  } catch (error) {
    console.error("Error fetching settings:", error);
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start sm:items-center justify-between flex-col sm:flex-row gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">System Settings</h1>
          <p className="text-sm text-slate-500 mt-1">Manage global platform configurations and delivery fees.</p>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-lg shadow-sm p-6 max-w-2xl">
        <div className="flex items-center gap-2 mb-6 border-b border-slate-100 pb-4">
           <Settings className="w-5 h-5 text-slate-500" />
           <h2 className="text-lg font-semibold text-slate-800">Delivery Configuration</h2>
        </div>
        <DeliverySettingsClient initialData={settings} />
      </div>
    </div>
  );
}
