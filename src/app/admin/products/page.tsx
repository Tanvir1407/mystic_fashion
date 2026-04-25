import prisma from "@/lib/prisma";
import Link from "next/link";
import { deleteProduct } from "../actions";
import { Plus, Edit2, Filter, Star, Eye, EyeOff } from "lucide-react";
import { ProductDeleteButton } from "./ProductDeleteButton";

import { AdminPagination } from "@/components/AdminPagination";
import ProductFilterClient from "./ProductFilterClient";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const revalidate = 0;

export default async function AdminProductsPage({ searchParams }: { searchParams: { page?: string, search?: string, category?: string } }) {
  const page = Number(searchParams?.page) || 1;
  const search = searchParams?.search || "";
  const category = searchParams?.category || "ALL";
  const PER_PAGE = 10;

  const whereClause: any = {};
  if (category !== "ALL") {
    whereClause.category = category;
  }
  if (search) {
    whereClause.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { team: { contains: search, mode: 'insensitive' } },
      { category: { contains: search, mode: 'insensitive' } },
    ];
  }

  let products: any[] = [];
  let totalCount = 0;
  let fetchedCategories: any[] = [];
  try {
    const [fetchedProducts, fetchedCount, distinctCategories] = await Promise.all([
      prisma.product.findMany({
        where: whereClause,
        skip: (page - 1) * PER_PAGE,
        take: PER_PAGE,
        orderBy: { team: "asc" },
        include: { variants: true }
      }),
      prisma.product.count({ where: whereClause }),
      prisma.product.findMany({
        select: { category: true },
        distinct: ['category'],
      }),
    ]);
    products = fetchedProducts;
    totalCount = fetchedCount;
    fetchedCategories = distinctCategories;
  } catch (error) {
    console.error("Error fetching products:", error);
  }

  const totalPages = Math.ceil(totalCount / PER_PAGE);
  const categories = fetchedCategories.map((c) => c.category);

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
      <div className="flex items-center w-full">
        <ProductFilterClient
          currentSearch={search}
          currentCategory={category}
          categories={categories}
        />
      </div>

      {/* Data Table */}
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="px-2 py-3 font-semibold text-xs text-slate-500 uppercase tracking-wider">Product</th>
                <th className="px-2 py-3 font-semibold text-xs text-slate-500 uppercase tracking-wider">Price (BDT)</th>
                <th className="px-2 py-3 font-semibold text-xs text-slate-500 uppercase tracking-wider">Stock</th>
                <th className="px-2 py-3 font-semibold text-xs text-slate-500 uppercase tracking-wider">Team</th>
                <th className="px-2 py-3 font-semibold text-xs text-slate-500 uppercase tracking-wider">Date Added</th>
                <th className="px-2 py-3 font-semibold text-xs text-slate-500 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {products.map((product) => {
                const totalStock = product.variants.reduce((acc: number, v: any) => acc + v.stock, 0);
                return (
                  <tr key={product.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-2 py-4">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm text-slate-900">{product.name}</span>
                          {product.isFeatured && (
                            <div className="flex items-center gap-1 px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded text-[10px] font-bold uppercase tracking-wider border border-amber-200">
                              <Star className="w-2.5 h-2.5 fill-amber-500 text-amber-500" />
                              Featured
                            </div>
                          )}
                          {product.isPublished ? (
                            <div className="flex items-center gap-1 px-1.5 py-0.5 bg-emerald-100 text-emerald-700 rounded text-[10px] font-bold uppercase tracking-wider border border-emerald-200">
                              <Eye className="w-2.5 h-2.5 text-emerald-500" />
                              Published
                            </div>
                          ) : (
                            <div className="flex items-center gap-1 px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded text-[10px] font-bold uppercase tracking-wider border border-slate-200">
                              <EyeOff className="w-2.5 h-2.5 text-slate-500" />
                              Hidden
                            </div>
                          )}
                        </div>
                        <span className="text-xs text-slate-500">{product.category}</span>
                      </div>
                    </td>
                    <td className="px-2 py-4 text-sm text-slate-600 font-mono">
                      <div className="flex flex-col">
                        <span>৳{product.price.toLocaleString("en-IN")}</span>
                        {product.purchasePrice && (
                          <span className="text-[10px] text-slate-400 mt-0.5 ">Cost: ৳{product.purchasePrice}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-2 py-4">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${totalStock > 10 ? 'bg-green-100 text-green-800' : totalStock > 0 ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'}`}>
                        {totalStock} in stock
                      </span>
                    </td>
                    <td className="px-2 py-4 text-sm text-slate-600">
                      <span className="bg-slate-100 text-slate-700 px-2.5 py-1 rounded-full text-xs font-medium">
                        {product.team}
                      </span>
                    </td>
                    <td className="px-2 py-4 text-sm text-slate-600 whitespace-nowrap">
                      {new Date(product.createdAt).toLocaleDateString('en-GB', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric'
                      })}
                    </td>
                    <td className="px-2 py-4 text-right">
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
                  <td colSpan={6} className="px-6 py-12 text-center">
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
