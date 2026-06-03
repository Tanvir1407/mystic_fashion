"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Calendar, Truck, AlertCircle, ChevronDown, Download, Loader2, Package } from "lucide-react";
import { trackCustomerOrder } from "../../actions/pathao";
import { formatBDT } from "@/utils/formatPrice";
import { AdminPagination } from "@/components/AdminPagination";

interface OrderItem {
  id: string;
  size: string | null;
  quantity: number;
  price: number;
  requiresPrint: boolean;
  printName: string | null;
  printNumber: string | null;
  product: {
    name: string;
    image: string | null;
  };
}

interface Order {
  id: string;
  status: string;
  totalAmount: number;
  advancePaid: number;
  deliveryCharge: number;
  discountAmount: number;
  couponCode: string | null;
  remarks: string | null;
  address: string;
  customerName: string;
  phone: string;
  pathaoConsignmentId: string | null;
  createdAt: string;
  items: OrderItem[];
}

interface OrdersTabProps {
  orders: Order[];
}

export default function OrdersTab({ orders }: OrdersTabProps) {
  const searchParams = useSearchParams();
  const pageParam = searchParams.get("page");
  const limitParam = searchParams.get("limit");

  const currentPage = pageParam ? parseInt(pageParam) : 1;
  const limit = limitParam && ["10", "20", "50", "100"].includes(limitParam) ? parseInt(limitParam) : 10;

  const totalPages = Math.ceil(orders.length / limit);

  // Slice the orders array to only show items for the current page
  const startIndex = (currentPage - 1) * limit;
  const endIndex = startIndex + limit;
  const paginatedOrders = orders.slice(startIndex, endIndex);

  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  const [liveTrackingInfo, setLiveTrackingInfo] = useState<any>(null);
  const [loadingTracking, setLoadingTracking] = useState(false);

  // Format Date utility
  const formatDate = (isoString: string) => {
    return new Date(isoString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  // Map order status to visual indicators
  const getStatusColor = (status: string) => {
    switch (status.toUpperCase()) {
      case "PENDING":
        return "bg-amber-50/60 text-amber-700 border border-amber-200/50";
      case "PROCESSING":
      case "PRINTING":
        return "bg-blue-50/60 text-blue-700 border border-blue-200/50";
      case "SHIPPED":
        return "bg-indigo-50/60 text-indigo-700 border border-indigo-200/50";
      case "DELIVERED":
      case "COMPLETED":
        return "bg-emerald-50/60 text-emerald-700 border border-emerald-200/50";
      case "CANCELLED":
        return "bg-rose-50/60 text-rose-700 border border-rose-200/50";
      default:
        return "bg-slate-50/60 text-slate-700 border border-slate-200/50";
    }
  };

  // Toggle order expanded view & fetch Pathao Tracking info
  const handleOrderExpand = async (orderId: string, pathaoId: string | null) => {
    if (expandedOrderId === orderId) {
      setExpandedOrderId(null);
      setLiveTrackingInfo(null);
      return;
    }

    setExpandedOrderId(orderId);
    setLiveTrackingInfo(null);

    if (pathaoId) {
      setLoadingTracking(true);
      const res = await trackCustomerOrder(orderId);
      if (res.success && res.data?.pathaoInfo) {
        setLiveTrackingInfo(res.data.pathaoInfo);
      }
      setLoadingTracking(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
        <h2 className="text-base font-medium text-slate-900 tracking-tight">Order History</h2>
        <span className="text-xs text-slate-400 font-light">{orders.length} orders</span>
      </div>

      {orders.length === 0 ? (
        <div className="py-16 text-center">
          <Package className="w-10 h-10 text-slate-300 mx-auto mb-4" />
          <p className="font-semibold text-slate-700 text-sm">No orders placed yet</p>
          <p className="text-xs text-slate-400 mt-1 mb-6">Explore our latest jerseys and apparel collections.</p>
          <Link
            href="/products"
            className="bg-[#800020] text-white px-5 py-2.5 text-xs font-semibold tracking-wider hover:bg-[#600018] transition-colors inline-block rounded"
          >
            Start Shopping
          </Link>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="divide-y divide-slate-100 max-h-[390px] overflow-y-auto">
            {paginatedOrders.map((order) => (
              <div key={order.id} className="py-1 first:pt-0">
                {/* Order Header Summary */}
                <div
                  onClick={() => handleOrderExpand(order.id, order.pathaoConsignmentId)}
                  className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer hover:bg-slate-50/50 px-3 rounded-lg transition-colors select-none"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-3">
                      <span className="font-medium text-sm text-slate-900">
                        {order.id}
                      </span>
                      <span
                        className={`text-[9px] font-semibold tracking-wider uppercase px-2.5 py-0.5 rounded-full ${getStatusColor(
                          order.status
                        )}`}
                      >
                        {order.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-slate-400 font-light">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" /> {formatDate(order.createdAt)}
                      </span>
                      <span>&bull;</span>
                      <span>{order.items.reduce((sum, item) => sum + item.quantity, 0)} items</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between sm:justify-end gap-6">
                    <div className="text-right flex flex-col items-end">
                      <p className="font-semibold text-slate-900 text-sm">{formatBDT(order.totalAmount)}</p>
                      <span className="text-[10px] text-slate-400 font-light">Total Amount</span>
                    </div>
                    <ChevronDown
                      className={`w-4 h-4 text-slate-400 transition-transform duration-300 ${expandedOrderId === order.id ? "rotate-180" : ""
                        }`}
                    />
                  </div>
                </div>

                {/* Order Expansion Detail */}
                {expandedOrderId === order.id && (
                  <div className="mt-4 px-3 pb-6 pt-3 space-y-6 border-t border-slate-100/60 animate-slideDown">
                    {/* Product List */}
                    <div className="space-y-3">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                        Items Ordered
                      </p>
                      <div className="divide-y divide-slate-100">
                        {order.items.map((item) => (
                          <div key={item.id} className="py-3.5 flex gap-4 items-center first:pt-0 last:pb-0">
                            <div className="relative w-12 h-16 bg-slate-50 overflow-hidden border border-slate-100 rounded flex-shrink-0">
                              {item.product.image && (
                                <Image
                                  src={item.product.image}
                                  alt={item.product.name}
                                  fill
                                  className="object-cover"
                                />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="font-medium text-xs text-slate-800 truncate">
                                {item.product.name}
                              </h4>
                              <div className="flex items-center gap-3 mt-1.5 text-[10px] text-slate-400 font-normal">
                                {item.size && (
                                  <span className="bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded-sm">
                                    Size: {item.size}
                                  </span>
                                )}
                                <span>Qty: {item.quantity}</span>
                                <span>Price: {formatBDT(item.price)}</span>
                              </div>

                              {item.requiresPrint && (
                                <div className="mt-2 text-[10px] bg-amber-50/50 border border-amber-100/50 text-amber-800 px-2 py-0.5 rounded inline-flex items-center gap-1.5 font-medium">
                                  <span className="text-amber-600">DTF Custom:</span>
                                  <span className="font-semibold">"{item.printName}"</span>
                                  <span>&bull;</span>
                                  <span className="font-semibold">#{item.printNumber}</span>
                                </div>
                              )}
                            </div>
                            <p className="font-semibold text-slate-800 text-xs">
                              {formatBDT(item.price * item.quantity)}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Live Pathao Courier Tracking Timeline */}
                    {order.pathaoConsignmentId && (
                      <div className="space-y-3">
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                          <Truck className="w-3.5 h-3.5 text-slate-500" /> Live Delivery Status (Pathao Courier)
                        </p>

                        <div className="bg-slate-50/60 border border-slate-100 p-4 rounded-md">
                          {loadingTracking ? (
                            <div className="flex items-center gap-2 text-xs text-slate-400 py-1 justify-center">
                              <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-400" /> Fetching live
                              tracking...
                            </div>
                          ) : liveTrackingInfo ? (
                            <div className="space-y-3.5">
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
                                <div>
                                  <span className="text-[9px] font-medium text-slate-400 uppercase tracking-wider">
                                    Consignment ID:
                                  </span>
                                  <span className="text-xs font-semibold text-slate-700 ml-1.5">
                                    {order.pathaoConsignmentId}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-[9px] font-medium text-slate-400 uppercase tracking-wider">
                                    Current Status:
                                  </span>
                                  <span className="ml-1.5 text-xs font-semibold text-[#800020] uppercase bg-rose-50/60 px-2.5 py-0.5 rounded-full border border-rose-100/60">
                                    {liveTrackingInfo.current_status || "In Transit"}
                                  </span>
                                </div>
                              </div>

                              {/* Consignment Timeline / Description */}
                              <div className="text-xs text-slate-500 leading-relaxed bg-white p-3 border border-slate-100/50 rounded flex items-start gap-2.5">
                                <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                                <div>
                                  <p className="font-semibold text-slate-700">Tracking Statement:</p>
                                  <p className="mt-0.5 text-slate-500 font-light">
                                    The consignment is handled by Pathao Courier. Current checkpoint: "
                                    {liveTrackingInfo.current_status}". Last updated:{" "}
                                    {liveTrackingInfo.update_time
                                      ? formatDate(liveTrackingInfo.update_time)
                                      : "recently"}
                                    .
                                  </p>
                                </div>
                              </div>
                            </div>
                          ) : (
                            <p className="text-xs text-slate-400 italic py-1 text-center font-light">
                              Tracking data is temporarily unavailable. Consignment ID:{" "}
                              {order.pathaoConsignmentId}
                            </p>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Summary & Invoice Print Actions */}
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pt-4 border-t border-slate-100">
                      <div className="text-xs text-slate-400 font-light space-y-1">
                        <p>
                          Shipping Address:{" "}
                          <span className="font-medium text-slate-700">{order.address}</span>
                        </p>
                        {order.remarks && (
                          <p>
                            Remarks: <span className="italic text-slate-500">"{order.remarks}"</span>
                          </p>
                        )}
                      </div>
                      <div className="flex gap-3 w-full sm:w-auto">
                        <a
                          href={`/account/orders/${order.id}/invoice`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-1 sm:flex-none px-4 py-2 border border-primary text-primary hover:bg-primary hover:text-white text-xs font-medium transition-colors duration-200 flex items-center justify-center gap-2 rounded bg-white"
                        >
                          <Download className="w-3.5 h-3.5" /> Download Invoice
                        </a>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          <AdminPagination totalPages={totalPages} currentPage={currentPage} />
        </div>
      )}
    </div>
  );
}
