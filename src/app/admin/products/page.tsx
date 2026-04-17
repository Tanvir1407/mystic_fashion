import prisma from "@/lib/prisma";
import Link from "next/link";
import { deleteProduct } from "../actions";
import { Plus, Edit2, Filter } from "lucide-react";
import { ProductDeleteButton } from "./ProductDeleteButton";

import { AdminPagination } from "@/components/AdminPagination";

export const dynamic = "force-dynamic";

export default async function AdminProductsPage({ searchParams }: { searchParams: { page?: string } }) {
  const page = Number(searchParams?.page) || 1;
  const PER_PAGE = 10;

  let products: any[] = [];
  let totalCount = 0;
  try {
    const [fetchedProducts, fetchedCount] = await Promise.all([
      prisma.product.findMany({
        skip: (page - 1) * PER_PAGE,
        take: PER_PAGE,
        orderBy: { team: "asc" },
        include: { variants: true }
      }),
      prisma.product.count()
    ]);
    products = fetchedProducts;
    totalCount = fetchedCount;
  } catch (error) {
    console.error("Error fetching products:", error);
  }

  const totalPages = Math.ceil(totalCount / PER_PAGE);

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-start sm:items-center justify-between flex-col sm:flex-row gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Products</h1>
          <p className="text-sm text-slate-500 mt-1">Manage your jerseys, inventory, and pricing.</p>
        </div>
        <Link
          href="/admin/products/new"
          className="h-10 px-4 bg-slate-900 text-white text-sm font-medium rounded-md flex items-center justify-center gap-2 hover:bg-slate-800 transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Add Product
        </Link>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-3">
        <button className="h-9 px-3 bg-white border border-slate-200 text-slate-600 rounded-md text-sm font-medium flex items-center gap-2 hover:bg-slate-50 transition-colors shadow-sm">
          <Filter className="w-4 h-4" />
          Filter
        </button>
      </div>

      {/* Data Table */}
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="px-6 py-3 font-semibold text-xs text-slate-500 uppercase tracking-wider">Product</th>
                <th className="px-6 py-3 font-semibold text-xs text-slate-500 uppercase tracking-wider">Price (BDT)</th>
                <th className="px-6 py-3 font-semibold text-xs text-slate-500 uppercase tracking-wider">Stock</th>
                <th className="px-6 py-3 font-semibold text-xs text-slate-500 uppercase tracking-wider">Team</th>
                <th className="px-6 py-3 font-semibold text-xs text-slate-500 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {products.map((product) => {
                const totalStock = product.variants.reduce((acc: number, v: any) => acc + v.stock, 0);
                return (
                  <tr key={product.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="font-medium text-sm text-slate-900">{product.name}</span>
                        <span className="text-xs text-slate-500 mt-0.5">{product.category}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600 font-mono">
                      <div className="flex flex-col">
                        <span>৳{product.price.toLocaleString("en-IN")}</span>
                        {product.purchasePrice && (
                          <span className="text-[10px] text-slate-400 mt-0.5 ">Cost: ৳{product.purchasePrice}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${totalStock > 10 ? 'bg-green-100 text-green-800' : totalStock > 0 ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'}`}>
                        {totalStock} in stock
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">
                      <span className="bg-slate-100 text-slate-700 px-2.5 py-1 rounded-full text-xs font-medium">
                        {product.team}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          href={`/admin/products/${product.id}/edit`}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-indigo-600 bg-indigo-50 border border-indigo-200 rounded-md hover:bg-indigo-100 hover:border-indigo-300 transition-colors"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                          Edit
                        </Link>
                        <ProductDeleteButton productId={product.id} productName={product.name} />
                      </div>
                    </td>
                  </tr>
                );
              })}
              {products.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center">
                    <p className="text-sm text-slate-500 font-medium">No products found. Add some jerseys!</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <AdminPagination currentPage={page} totalPages={totalPages} />
      </div>
    </div>
  );
}
