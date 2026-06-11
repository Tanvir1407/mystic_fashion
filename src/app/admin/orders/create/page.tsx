import { getDeliverySettings, getDTFPrintSetting } from "../../actions";
import { getProductsForOrder } from "@/app/admin/products/actions";
import CreateOrderClient from "./CreateOrderClient";
import { getStaff } from "@/app/admin/staff/actions";

export default async function CreateOrderPage() {
  const products = await getProductsForOrder();
  const deliverySettings = await getDeliverySettings();
  const dtfSetting = await getDTFPrintSetting();
  const staffRes = await getStaff();
  const staff = staffRes.success ? staffRes.data : [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Create Manual Order</h1>
          <p className="text-slate-500 text-sm mt-1">Quickly create a new order directly from the admin panel.</p>
        </div>
      </div>

      <CreateOrderClient 
        products={products} 
        deliverySettings={deliverySettings} 
        dtfCostPerItem={dtfSetting.printCost} 
        staff={staff}
      />
    </div>
  );
}
