import { getInventorySettings, getLowStockProducts } from "../../actions";
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


      <InventoryClient
        initialSettings={settings}
        products={lowStockProducts}
      />
    </div>
  );
}
