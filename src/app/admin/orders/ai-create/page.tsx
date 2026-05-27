import { getDeliverySettings, getDTFPrintSetting } from "../../actions";
import { getProductsForOrder } from "@/app/admin/products/actions";
import AICreateOrderClient from "./AICreateOrderClient";
import { getSession } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";

export const dynamic = "force-dynamic";

export default async function AICreateOrderPage() {
  const session = await getSession();
  const canCreate = hasPermission(session, "CREATE", "ORDERS");

  if (!canCreate) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
        <div className="w-full max-w-md bg-white dark:bg-zinc-900 shadow-[0_4px_20px_rgba(0,0,0,0.05)] border border-slate-100 dark:border-zinc-800 rounded-xl p-8 md:p-10 text-center flex flex-col items-center">
          <div className="w-12 h-12 bg-[#800020]/5 rounded-full flex items-center justify-center mb-6">
            <svg className="w-5 h-5 text-[#800020]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m0 0v2m0-2h2m-2 0H10m3-9a3 3 0 11-6 0 3 3 0 016 0zM21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight mb-3">Access Restricted</h2>
          <p className="text-sm text-slate-500 mb-2 leading-relaxed max-w-xs font-normal">
            You do not have permission to create orders.
          </p>
        </div>
      </div>
    );
  }

  const products = await getProductsForOrder();
  const deliverySettings = await getDeliverySettings();
  const dtfSetting = await getDTFPrintSetting();

  return (
    <div className="space-y-6">
      <AICreateOrderClient
        products={products}
        deliverySettings={deliverySettings}
        dtfCostPerItem={dtfSetting.printCost}
      />
    </div>
  );
}
