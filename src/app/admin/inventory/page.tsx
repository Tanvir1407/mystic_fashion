import { getInventorySettings, getLowStockProducts } from "../actions";
import InventoryClient from "./InventoryClient";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const revalidate = 0;

export default async function InventoryPage() {
  const [settings, lowStockProducts] = await Promise.all([
    getInventorySettings(),
    getLowStockProducts(),
  ]);

  return (
    <div className="space-y-8">
      <div className="print:hidden">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 font-serif">Low Stock Alerts</h1>
        <p className="text-sm text-slate-500 mt-1">Monitor and manage products with critically low inventory levels.</p>
      </div>

      <InventoryClient
        initialSettings={settings}
        products={lowStockProducts}
      />
    </div>
  );
}
