import prisma from "@/lib/prisma";
import CommissionSettingsClient from "./CommissionSettingsClient";
import { Percent } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function CommissionSettingsPage() {
  const slabs = await prisma.commissionSlab.findMany({
    orderBy: { priority: "asc" },
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start sm:items-center justify-between flex-col sm:flex-row gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Commission Settings</h1>
          <p className="text-slate-500 text-sm mt-1">Configure progressive commission slabs for daily sales.</p>
        </div>
      </div>

      <div className="max-w-2xl bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="flex items-center gap-3 p-5 border-b border-slate-100">
          <div className="w-9 h-9 rounded-lg bg-green-50 flex items-center justify-center">
            <Percent className="w-4 h-4 text-green-600" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-slate-900">Commission Slabs</h2>
            <p className="text-xs text-slate-500 mt-0.5">Commission is calculated based on total daily sales per staff member.</p>
          </div>
        </div>
        <div className="p-5">
          <CommissionSettingsClient initialSlabs={slabs} />
        </div>
      </div>
    </div>
  );
}
