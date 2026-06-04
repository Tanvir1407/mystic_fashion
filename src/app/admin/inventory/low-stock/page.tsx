import {
  getInventorySettings,
  getLowStockProducts,
  getLowStockProductsCount,
  getAllLowStockProducts,
} from "../../actions";
import InventoryClient from "./InventoryClient";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const revalidate = 0;

export default async function InventoryPage({
  searchParams,
}: {
  searchParams: { page?: string; limit?: string };
}) {
  const page = Number(searchParams?.page) || 1;
  const limit = Number(searchParams?.limit) || 10;
  const PER_PAGE = [10, 20, 50, 100].includes(limit) ? limit : 10;

  const [settings, lowStockProducts, totalCount, csvData] = await Promise.all([
    getInventorySettings(),
    getLowStockProducts({ page, limit: PER_PAGE }),
    getLowStockProductsCount(),
    getAllLowStockProducts(),
  ]);

  const totalPages = Math.ceil(totalCount / PER_PAGE);

  return (
    <div className="space-y-8">
      <InventoryClient
        initialSettings={settings}
        products={lowStockProducts}
        currentPage={page}
        totalPages={totalPages}
        csvData={csvData}
      />
    </div>
  );
}
