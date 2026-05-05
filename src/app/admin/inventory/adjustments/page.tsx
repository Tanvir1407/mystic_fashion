import { getProductsForOrder, getRecentAdjustments } from "../../actions";
import AdjustmentClient from "./AdjustmentClient";

export default async function AdjustmentPage() {
  const products = await getProductsForOrder();
  const recentAdjustments = await getRecentAdjustments();

  return (
    <div className="p-4 md:p-8">
      <AdjustmentClient 
        products={products as any} 
        initialAdjustments={recentAdjustments} 
      />
    </div>
  );
}
