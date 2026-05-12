import prisma from "@/lib/prisma";
import DeliverySettingsClient from "./DeliverySettingsClient";
import DTFSettingsClient from "./DTFSettingsClient";
import { Settings, Printer } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  let settings = { insideDhaka: 80, outsideDhaka: 150 };
  let dtfCost = 300;

  try {
    const [fetchedSettings, dtfSetting] = await Promise.all([
      prisma.deliverySetting.findUnique({ where: { id: "default" } }),
      prisma.dTFPrintSetting.upsert({
        where: { id: "default" },
        update: {},
        create: { id: "default", printCost: 300 },
      }),
    ]);
    if (fetchedSettings) settings = fetchedSettings;
    dtfCost = dtfSetting.printCost;
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* Delivery Settings */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-[0_1px_3px_rgba(0,0,0,0.04)] overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className="flex items-center gap-2 px-6 py-4 border-b border-slate-100 bg-slate-50/50">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center">
              <Settings className="w-4 h-4 text-indigo-600" />
            </div>
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Delivery Configuration</h2>
          </div>
          <div className="p-6">
            <DeliverySettingsClient initialData={settings} />
          </div>
        </div>

        {/* DTF Print Settings */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-[0_1px_3px_rgba(0,0,0,0.04)] overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-300 delay-75">
          <div className="flex items-center gap-2 px-6 py-4 border-b border-slate-100 bg-slate-50/50">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center">
              <Printer className="w-4 h-4 text-indigo-600" />
            </div>
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">DTF Print Cost</h2>
          </div>
          <div className="p-6">
            <DTFSettingsClient initialCost={dtfCost} />
          </div>
        </div>
      </div>
    </div>
  );
}
