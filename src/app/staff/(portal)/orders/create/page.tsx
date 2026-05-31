import { getDeliverySettings, getDTFPrintSetting } from "@/app/admin/actions";
import { getProductsForOrder } from "@/app/admin/products/actions";
import CreateOrderClient from "@/app/admin/orders/create/CreateOrderClient";
import { createStaffOrder } from "./actions";

export const dynamic = "force-dynamic";

export default async function StaffCreateOrderPage() {
  const [products, deliverySettings, dtfSetting] = await Promise.all([
    getProductsForOrder(),
    getDeliverySettings(),
    getDTFPrintSetting(),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">New Order</h1>
          <p className="text-slate-500 text-sm mt-1">Create a new order for your customer.</p>
        </div>
      </div>

      <CreateOrderClient
        products={products}
        deliverySettings={deliverySettings}
        dtfCostPerItem={dtfSetting.printCost}
        backUrl="/staff/orders"
        successUrl="/staff/orders"
        orderAction={createStaffOrder}
      />
    </div>
  );
}
