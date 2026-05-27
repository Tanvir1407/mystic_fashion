import { getProductsForOrder } from "@/app/admin/products/actions";
import { getRecentAdjustments } from "../../actions";
import AdjustmentClient from "./AdjustmentClient";

export default async function AdjustmentPage() {
  const products = await getProductsForOrder();
  const recentAdjustments = await getRecentAdjustments();

  return (
    <div>
      <AdjustmentClient
        products={products as any}
        initialAdjustments={recentAdjustments}
      />
    </div>
  );
}
