import React from 'react';
import prisma from '@/lib/prisma';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import {
  ShoppingBag,
  DollarSign,
  Box,
  TrendingUp,
  Package,
  Edit,
  ArrowLeft,
  CheckCircle,
  XCircle,
  Activity,
  Archive,
  RefreshCcw,
  AlertCircle,
} from 'lucide-react';
import Image from 'next/image';
import UploadedImage from '@/components/UploadedImage';
import { formatBDT } from '@/utils/formatPrice';

export default async function ProductDetailView({ params }: { params: { id: string } }) {
  const product = await prisma.product.findUnique({
    where: { id: params.id },
    include: {
      brand: true,
      categoryRel: true,
      subcategory: true,
      variants: {
        include: {
          stockAdjustments: {
            orderBy: { createdAt: 'desc' },
            take: 10,
          },
          salesReturns: {
            orderBy: { createdAt: 'desc' },
            take: 10,
          },
        },
      },
      orderItems: {
        include: { order: true },
      },
      purchaseItems: true,
      mediaAssets: { orderBy: { sortOrder: "asc" } },
    },
  });

  if (!product) {
    notFound();
  }

  // Sort orderItems in-memory based on order.createdAt descending
  product.orderItems.sort((a, b) => new Date(b.order.createdAt).getTime() - new Date(a.order.createdAt).getTime());

  const inventorySetting = await prisma.inventorySetting.findUnique({
    where: { id: 'default' },
  });
  const lowStockThreshold = inventorySetting?.lowStockThreshold ?? 5;

  // Analytics Calculations
  const totalUnitsSold = product.orderItems.reduce((acc, item) => item.order.status === 'DELIVERED' ? acc + item.quantity : acc, 0);
  const totalRevenue = product.orderItems.reduce((acc, item) => item.order.status === 'DELIVERED' ? acc + (item.quantity * item.price) : acc, 0);
  const currentStock = product.variants.reduce((acc, v) => acc + v.stock, 0);
  const totalPurchases = product.purchaseItems.reduce((acc, item) => acc + item.quantity, 0);
  const estimatedProfitMargin = product.price - (product.purchasePrice || 0);

  // Collect Movement History
  const movementHistory = [
    ...product.orderItems.slice(0, 10).map(oi => ({
      id: oi.id,
      type: 'Order',
      date: oi.order.createdAt,
      description: `Sold ${oi.quantity}x ${oi.size}`,
      status: oi.order.status,
    })),
    ...product.variants.flatMap(v =>
      v.stockAdjustments.map(sa => ({
        id: sa.id,
        type: 'Adjustment',
        date: sa.createdAt,
        description: `${sa.adjustmentType} ${sa.quantity} (Size: ${v.size})`,
        status: sa.reason || 'Manual',
      }))
    ),
    ...product.variants.flatMap(v =>
      v.salesReturns.map(sr => ({
        id: sr.id,
        type: 'Return',
        date: sr.createdAt,
        description: `Returned ${sr.quantity}x ${v.size}`,
        status: sr.status,
      }))
    ),
  ].sort((a, b) => b.date.getTime() - a.date.getTime()).slice(0, 10);

  return (
    <div className=" max-w-[1600px] mx-auto space-y-6">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <Link
              href="/admin/products"
              className="text-slate-500 hover:text-slate-900 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              {product.name}
            </h1>
          </div>
          <div className="flex flex-wrap items-center gap-2 mt-2">
            <span className="px-2 py-0.5 bg-slate-100 text-slate-700 text-xs font-medium border border-slate-200">
              {product.category}
            </span>
            <span className="px-2 py-0.5 bg-slate-100 text-slate-700 text-xs font-medium border border-slate-200">
              {product.team}
            </span>
            {product.isPublished ? (
              <span className="flex items-center gap-1 px-2 py-0.5 bg-green-50 text-green-700 text-xs font-medium border border-green-200">
                <CheckCircle className="w-3 h-3" /> Published
              </span>
            ) : (
              <span className="flex items-center gap-1 px-2 py-0.5 bg-red-50 text-red-700 text-xs font-medium border border-red-200">
                <XCircle className="w-3 h-3" /> Draft
              </span>
            )}
            {product.isFeatured && (
              <span className="px-2 py-0.5 bg-yellow-50 text-yellow-700 text-xs font-medium border border-yellow-200">
                Featured
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href={`/admin/products`}
            className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 shadow-sm transition-all"
          >
            Back to List
          </Link>
          <Link
            href={`/admin/products/edit/${product.id}`}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-slate-900 hover:bg-slate-800 shadow-sm transition-all"
          >
            <Edit className="w-4 h-4" />
            Edit Product
          </Link>
        </div>
      </div>

      {/* Analytics Dashboard */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <MetricCard
          title="Total Units Sold"
          value={totalUnitsSold.toString()}
          icon={ShoppingBag}
        />
        <MetricCard
          title="Total Revenue"
          value={`${formatBDT(totalRevenue)}`}
          icon={DollarSign}
        />
        <MetricCard
          title="Current Stock"
          value={currentStock.toString()}
          icon={Box}
          alert={currentStock < lowStockThreshold}
        />
        <MetricCard
          title="Total Purchases"
          value={totalPurchases.toString()}
          icon={Package}
        />
        <MetricCard
          title="Est. Margin/Unit"
          value={`${formatBDT(estimatedProfitMargin)}`}
          icon={TrendingUp}
          valueColor={estimatedProfitMargin > 0 ? 'text-green-600' : 'text-red-600'}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Visual & Core Info */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white border border-slate-200 shadow-sm p-5">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4 border-b border-slate-100 pb-2">
              Product Details
            </h2>
            <div className="flex flex-col md:flex-row gap-6">
              {/* Image Gallery */}
              <div className="w-full md:w-1/3 space-y-3">
                {product.mediaAssets.length > 0 ? (
                  <>
                    <div className="relative aspect-square w-full bg-slate-50 border border-slate-200 overflow-hidden">
                      <UploadedImage
                        src={product.mediaAssets[0].url}
                        alt={product.name}
                        fill
                        className="object-cover"
                      />
                    </div>
                    {product.mediaAssets.length > 1 && (
                      <div className="grid grid-cols-4 gap-2">
                        {product.mediaAssets.slice(1, 5).map((asset, idx) => (
                          <div
                            key={asset.id}
                            className="relative aspect-square w-full bg-slate-50 border border-slate-200 overflow-hidden"
                          >
                            <UploadedImage src={asset.url} alt={`${product.name} ${idx}`} fill className="object-cover" />
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                ) : (
                  <div className="flex items-center justify-center w-full aspect-square bg-slate-50 border border-slate-200 text-slate-400">
                    <Box className="w-12 h-12 mb-2 opacity-50" />
                    <span className="text-xs font-medium">No Image</span>
                  </div>
                )}
              </div>

              {/* Core Info */}
              <div className="w-full md:w-2/3 space-y-4">
                <div>
                  <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                    Description
                  </h3>
                  <div
                    className="text-sm text-slate-700 leading-relaxed prose max-w-none"
                    dangerouslySetInnerHTML={{ __html: product.description || 'No description provided.' }}
                  />
                </div>
                <div className="grid grid-cols-3 gap-4 pt-4 border-t border-slate-100">
                  <div>
                    <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                      Brand
                    </h3>
                    <p className="text-sm font-bold text-slate-900">
                      {product.brand?.name || 'N/A'}
                    </p>
                  </div>
                  <div>
                    <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                      Category
                    </h3>
                    <p className="text-sm font-bold text-slate-900">
                      {product.categoryRel?.name || product.category || 'N/A'}
                    </p>
                  </div>
                  <div>
                    <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                      Subcategory
                    </h3>
                    <p className="text-sm font-bold text-slate-900">
                      {product.subcategory?.name || 'N/A'}
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-100">
                  <div>
                    <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                      Base Selling Price
                    </h3>
                    <p className="text-lg font-bold text-slate-900">
                      {formatBDT(product.price)}
                    </p>
                  </div>
                  <div>
                    <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                      Purchase Price
                    </h3>
                    <p className="text-lg font-bold text-slate-700">
                      {product.purchasePrice ? formatBDT(product.purchasePrice) : 'N/A'}
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-100">
                  <div>
                    <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                      Created At
                    </h3>
                    <p className="text-sm font-medium text-slate-700">
                      {product.createdAt.toLocaleDateString()} {product.createdAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  <div>
                    <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                      Last Updated
                    </h3>
                    <p className="text-sm font-medium text-slate-700">
                      {product.updatedAt.toLocaleDateString()} {product.updatedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Sales & Movement History */}
          <div className="bg-white border border-slate-200 shadow-sm p-5">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4 border-b border-slate-100 pb-2">
              Recent Movement History
            </h2>
            {movementHistory.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-y border-slate-200">
                    <tr>
                      <th className="px-4 py-3 font-medium">Date</th>
                      <th className="px-4 py-3 font-medium">Type</th>
                      <th className="px-4 py-3 font-medium">Description</th>
                      <th className="px-4 py-3 font-medium">Status/Reason</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {movementHistory.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50/50">
                        <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                          {item.date.toLocaleDateString()} {item.date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-xs font-medium border ${item.type === 'Order'
                              ? 'bg-blue-50 text-blue-700 border-blue-200'
                              : item.type === 'Return'
                                ? 'bg-red-50 text-red-700 border-red-200'
                                : 'bg-orange-50 text-orange-700 border-orange-200'
                              }`}
                          >
                            {item.type === 'Order' && <Activity className="w-3 h-3" />}
                            {item.type === 'Return' && <RefreshCcw className="w-3 h-3" />}
                            {item.type === 'Adjustment' && <Archive className="w-3 h-3" />}
                            {item.type}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-medium text-slate-900">
                          {item.description}
                        </td>
                        <td className="px-4 py-3 text-slate-600">
                          {item.status}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-8 text-slate-500 text-sm">
                No recent movements found for this product.
              </div>
            )}
          </div>
        </div>

        {/* Sidebar: Inventory & Variants */}
        <div className="space-y-6">
          <div className="bg-white border border-slate-200 shadow-sm p-5 sticky top-6">
            <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-2">
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                Inventory Status
              </h2>
              <span className="text-xs text-slate-500">
                Low stock threshold: {lowStockThreshold}
              </span>
            </div>

            <div className="overflow-hidden border border-slate-200">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3 font-medium">Size</th>
                    <th className="px-4 py-3 font-medium text-right">Stock</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {product.variants.sort((a, b) => a.order - b.order).map((variant) => {
                    const isLowStock = variant.stock <= lowStockThreshold;
                    return (
                      <tr key={variant.id} className={isLowStock ? 'bg-red-50/30' : ''}>
                        <td className="px-4 py-3 font-medium text-slate-900">
                          {variant.size}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2 py-0.5 font-bold ${isLowStock ? 'text-red-600' : 'text-slate-900'
                              }`}
                          >
                            {variant.stock}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                  {product.variants.length === 0 && (
                    <tr>
                      <td colSpan={2} className="px-4 py-6 text-center text-slate-500">
                        No variants available.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="mt-4 pt-4 border-t border-slate-100">
              <div className="flex justify-between items-center text-sm">
                <span className="font-semibold text-slate-700">Total Pipeline Stock</span>
                <span className="font-bold text-slate-900">{currentStock} Units</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function MetricCard({
  title,
  value,
  icon: Icon,
  alert = false,
  valueColor = 'text-slate-900',
}: {
  title: string;
  value: string;
  icon: React.ElementType;
  alert?: boolean;
  valueColor?: string;
}) {
  return (
    <div className={`bg-white border shadow-sm p-4 ${alert ? 'border-red-300 bg-red-50/10' : 'border-slate-200'}`}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
          {title}
        </h3>
        <Icon className={`w-4 h-4 ${alert ? 'text-red-500' : 'text-slate-400'}`} />
      </div>
      <div className="flex items-baseline gap-2">
        <span className={`text-2xl font-bold tracking-tight ${valueColor}`}>
          {value}
        </span>
        {alert && (
          <span className="text-[10px] font-bold text-red-600 bg-red-100 px-1.5 py-0.5 uppercase tracking-wide">
            Low
          </span>
        )}
      </div>
    </div>
  );
}
