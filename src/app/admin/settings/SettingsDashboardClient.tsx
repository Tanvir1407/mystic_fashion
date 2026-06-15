"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { Settings, Percent, Printer, PanelBottom, Receipt } from "lucide-react";
import DeliverySettingsClient from "./DeliverySettingsClient";
import DTFSettingsClient from "./DTFSettingsClient";
import CommissionSettingsClient from "./commission/CommissionSettingsClient";
import FooterSettingsClient from "./footer/FooterSettingsClient";
import POSFooterSettingsClient from "./POSFooterSettingsClient";

interface SettingsDashboardClientProps {
  session: any;
  initialDeliveryData: { insideDhaka: number; outsideDhaka: number; posFooter: string };
  initialDtfCost: number;
  initialCommissionRate: number;
  initialFooterData: any;
}

export default function SettingsDashboardClient({
  session,
  initialDeliveryData,
  initialDtfCost,
  initialCommissionRate,
  initialFooterData,
}: SettingsDashboardClientProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const queryTab = searchParams?.get("tab") || "general";

  const checkPermission = (action: string, subject: string) => {
    if (!session) return false;
    if (session.roleName === "SUPERADMIN") return true;
    return session.permissions?.some((p: any) => p.action === action && p.subject === subject);
  };

  const hasGeneralPermission = checkPermission("VIEW", "GENERAL_SETTINGS");
  const hasFooterPermission = checkPermission("VIEW", "FOOTER_SETTINGS");

  let activeTab = queryTab;
  if (activeTab === "general" || activeTab === "commission") {
    if (!hasGeneralPermission && hasFooterPermission) {
      activeTab = "footer";
    }
  } else if (activeTab === "footer") {
    if (!hasFooterPermission && hasGeneralPermission) {
      activeTab = "general";
    }
  }

  const tabs = [
    { id: "general", label: "General Settings", icon: Settings, show: hasGeneralPermission },
    { id: "commission", label: "Commission Settings", icon: Percent, show: hasGeneralPermission },
    { id: "footer", label: "Footer Settings", icon: PanelBottom, show: hasFooterPermission },
  ].filter((t) => t.show);

  return (
    <div className="flex flex-col gap-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">System Control Panel</h1>
        <p className="text-sm text-slate-500 mt-1">Manage global platforms, commissions, and frontend footer details.</p>
      </div>

      {/* Main Tabs Navigation */}
      <div className="border-b border-slate-200 bg-white px-2 py-1.5 rounded-xl shadow-sm flex flex-wrap gap-1">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => {
                const params = new URLSearchParams(window.location.search);
                params.set("tab", tab.id);
                router.push(`/admin/settings?${params.toString()}`);
              }}
              className={`h-9 px-4 rounded-lg text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
                isActive
                  ? "bg-slate-900 text-white shadow-sm"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Panels */}
      <div className="mt-2">
        {activeTab === "general" && hasGeneralPermission && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start animate-in fade-in duration-200">
            {/* Left Column: Delivery & POS Footer Settings */}
            <div className="space-y-6">
              {/* Delivery Settings */}
              <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                <div className="flex items-center gap-2 px-6 py-4 border-b border-slate-100 bg-slate-50/50">
                  <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center">
                    <Settings className="w-4 h-4 text-indigo-600" />
                  </div>
                  <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Delivery Configuration</h2>
                </div>
                <div className="p-6">
                  <DeliverySettingsClient initialData={initialDeliveryData} />
                </div>
              </div>

              {/* POS Receipt Footer Settings */}
              <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                <div className="flex items-center gap-2 px-6 py-4 border-b border-slate-100 bg-slate-50/50">
                  <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center">
                    <Receipt className="w-4 h-4 text-indigo-600" />
                  </div>
                  <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">POS Receipt Footer</h2>
                </div>
                <div className="p-6">
                  <POSFooterSettingsClient initialData={initialDeliveryData} />
                </div>
              </div>
            </div>

            {/* Right Column: DTF Print Settings */}
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
              <div className="flex items-center gap-2 px-6 py-4 border-b border-slate-100 bg-slate-50/50">
                <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center">
                  <Printer className="w-4 h-4 text-indigo-600" />
                </div>
                <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">DTF Print Cost</h2>
              </div>
              <div className="p-6">
                <DTFSettingsClient initialCost={initialDtfCost} />
              </div>
            </div>
          </div>
        )}

        {activeTab === "commission" && hasGeneralPermission && (
          <div className="max-w-xl bg-white rounded-xl border border-slate-200 overflow-hidden animate-in fade-in duration-200">
            <div className="flex items-center gap-3 p-5 border-b border-slate-100">
              <div className="w-9 h-9 rounded-lg bg-green-50 flex items-center justify-center">
                <Percent className="w-4 h-4 text-green-600" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-slate-900">Global Commission Rate</h2>
                <p className="text-xs text-slate-500 mt-0.5">Applied to all staff unless overridden individually.</p>
              </div>
            </div>
            <div className="p-5">
              <CommissionSettingsClient initialRate={initialCommissionRate} />
            </div>
          </div>
        )}

        {activeTab === "footer" && hasFooterPermission && (
          <div className="animate-in fade-in duration-200">
            <FooterSettingsClient initialData={initialFooterData} />
          </div>
        )}
      </div>
    </div>
  );
}
