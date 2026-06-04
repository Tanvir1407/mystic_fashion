import prisma from "@/lib/prisma";
import Link from "next/link";
import { Plus, Edit2, Filter, Star, Eye, EyeOff, RotateCcw } from "lucide-react";
import { ProductDeleteButton } from "./ProductDeleteButton";
import { ProductRestoreButton } from "./ProductRestoreButton";
import { formatBDT } from "@/utils/formatPrice";
import { AdminPagination } from "@/components/AdminPagination";
import ProductFilterClient from "./ProductFilterClient";
import { getSession } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const revalidate = 0;

export default async function AdminProductsPage({ searchParams }: { searchParams: { page?: string, limit?: string, search?: string, category?: string, tab?: string } }) {
  const session = await getSession();
  const canView = hasPermission(session, "VIEW", "PRODUCTS");
  const canCreate = hasPermission(session, "CREATE", "PRODUCTS");
  const canEdit = hasPermission(session, "EDIT", "PRODUCTS");
  const canDelete = hasPermission(session, "DELETE", "PRODUCTS");

  if (!canView) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
        <div className="w-full max-w-md bg-white dark:bg-zinc-900 shadow-[0_4px_20px_rgba(0,0,0,0.05)] border border-slate-100 dark:border-zinc-800 rounded-xl p-8 md:p-10 text-center flex flex-col items-center animate-fade-in">
          <div className="w-12 h-12 bg-[#800020]/5 rounded-full flex items-center justify-center mb-6">
            <svg className="w-5 h-5 text-[#800020]" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m0 0v2m0-2h2m-2 0H10m3-9a3 3 0 11-6 0 3 3 0 016 0zM21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight mb-3">Access Restricted</h2>
          <p className="text-sm text-slate-500 dark:text-zinc-400 mb-2 leading-relaxed max-w-xs font-normal">
            You do not have permission to view products. Please contact your administrator to assign permissions for your working area.
          </p>
        </div>
      </div>
    );
  }

  const page = Number(searchParams?.page) || 1;
  const limit = Number(searchParams?.limit) || 10;
  const search = searchParams?.search || "";
  const category = searchParams?.category || "ALL";
  const tab = searchParams?.tab || "active";
  const PER_PAGE = [10, 20, 50, 100].includes(limit) ? limit : 10;

  const whereClause: any = tab === "trash" ? { deletedAt: { not: null } as any } : {};
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
    const [fetchedProducts, fetchedCount, activeCategories] = await Promise.all([
      prisma.product.findMany({
        where: whereClause,
        skip: (page - 1) * PER_PAGE,
        take: PER_PAGE,
        orderBy: { createdAt: "desc" },
        include: {
          brand: true,
          variants: {
            include: {
              pricingMatrix: true,
              stocks: { where: { warehouse: { code: "WH-MAIN" } } }
            }
          }
        }
      }),
      prisma.product.count({ where: whereClause }),
      prisma.category.findMany({
        select: { name: true },
        where: { active: true },
        orderBy: { name: "asc" }
      }),
    ]);
    products = fetchedProducts.map(p => {
      const basePrice = p.variants?.[0]?.pricingMatrix?.basePrice
        ? Number(p.variants[0].pricingMatrix.basePrice)
        : p.price;

      return {
        ...p,
        price: basePrice,
        variants: p.variants.map((v: any) => ({
          ...v,
          stock: v.stocks?.[0]?.availableQuantity ?? v.stock ?? 0
        }))
      };
    });
    totalCount = fetchedCount;
    fetchedCategories = activeCategories;
  } catch (error) {
    console.error("Error fetching products:", error);
  }

  const totalPages = Math.ceil(totalCount / PER_PAGE);
  const categories = fetchedCategories.map((c) => c.name);

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-start sm:items-center justify-between flex-col sm:flex-row gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Products</h1>
          <p className="text-sm text-slate-500 mt-1">Manage your jerseys, inventory, and pricing.</p>
        </div>
        {canCreate && tab === "active" && (
          <Link
            href="/admin/products/new"
            className="h-10 px-4 bg-slate-900 text-white text-sm font-medium rounded-md flex items-center justify-center gap-2 hover:bg-slate-800 transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Add Product
          </Link>
        )}
      </div>

      {/* Toolbar */}
      <div className="flex items-center w-full">
        <ProductFilterClient
          currentSearch={search}
          currentCategory={category}
          categories={categories}
        />
      </div>

      {/* Tabs */}
      {(() => {
        const activeParams = new URLSearchParams();
        if (search) activeParams.set("search", search);
        if (category !== "ALL") activeParams.set("category", category);
        activeParams.set("tab", "active");

        const trashParams = new URLSearchParams();
        if (search) trashParams.set("search", search);
        if (category !== "ALL") trashParams.set("category", category);
        trashParams.set("tab", "trash");

        return (
          <div className="flex border-b border-slate-200 gap-6">
            <Link
              href={`/admin/products?${activeParams.toString()}`}
              className={`pb-3 text-sm font-bold uppercase tracking-wide border-b-2 transition-all ${
                tab === "active"
                  ? "border-slate-900 text-slate-900"
                  : "border-transparent text-slate-400 hover:text-slate-600"
              }`}
            >
              Active Products
            </Link>
            <Link
              href={`/admin/products?${trashParams.toString()}`}
              className={`pb-3 text-sm font-bold uppercase tracking-wide border-b-2 transition-all ${
                tab === "trash"
                  ? "border-slate-900 text-slate-900"
                  : "border-transparent text-slate-400 hover:text-slate-600"
              }`}
            >
              Trash Bin
            </Link>
          </div>
        );
      })()}

      {/* Data Table */}
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="px-2 py-3 font-semibold text-xs text-slate-500 uppercase tracking-wider">Product</th>
                <th className="px-2 py-3 font-semibold text-xs text-slate-500 uppercase tracking-wider">Price (BDT)</th>
                <th className="px-2 py-3 font-semibold text-xs text-slate-500 uppercase tracking-wider">Stock</th>
                <th className="px-2 py-3 font-semibold text-xs text-slate-500 uppercase tracking-wider">Brand</th>
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
                          {product.deletedAt ? (
                            <div className="flex items-center gap-1 px-1.5 py-0.5 bg-rose-100 text-rose-700 rounded text-[10px] font-bold uppercase tracking-wider border border-rose-200 animate-pulse">
                              Deleted
                            </div>
                          ) : (
                            <>
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
                            </>
                          )}
                        </div>
                        <span className="text-xs text-slate-500">{product.category}</span>
                      </div>
                    </td>
                    <td className="px-2 py-4 text-sm text-slate-600 font-mono">
                      <div className="flex flex-col">
                        <span>{formatBDT(product.price)}</span>
                        {product.purchasePrice && (
                          <span className="text-[10px] text-slate-400 mt-0.5 ">Cost: {formatBDT(product.purchasePrice)}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-2 py-4">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${totalStock > 10 ? 'bg-green-100 text-green-800' : totalStock > 0 ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'}`}>
                        {totalStock} in stock
                      </span>
                    </td>
                    <td className="px-2 py-4 text-sm text-slate-600">
                      {product.brand ? (
                        <span className="bg-slate-100 text-slate-700 px-2.5 py-1 rounded-full text-xs font-medium">
                          {product.brand.name}
                        </span>
                      ) : (
                        <span className="text-slate-400 text-xs">—</span>
                      )}
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
                        {tab === "trash" ? (
                          <ProductRestoreButton productId={product.id} />
                        ) : (
                          <>
                            <Link
                              href={`/admin/products/${product.id}`}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-600 bg-slate-50 border border-slate-200 rounded-md hover:bg-slate-100 hover:border-slate-300 transition-colors"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              View
                            </Link>
                            {canEdit && (
                              <Link
                                href={`/admin/products/edit/${product.id}`}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-indigo-600 bg-indigo-50 border border-indigo-200 rounded-md hover:bg-indigo-100 hover:border-indigo-300 transition-colors"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                                Edit
                              </Link>
                            )}
                            {canDelete && (
                              <ProductDeleteButton productId={product.id} productName={product.name} />
                            )}
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {products.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <p className="text-sm text-slate-500 font-medium">No products found.</p>
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
