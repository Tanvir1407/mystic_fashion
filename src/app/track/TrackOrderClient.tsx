"use client";

import { useState } from "react";
import { trackCustomerOrder } from "../actions/pathao";
import { Search, Package, CheckCircle, Truck, PackageCheck, AlertCircle } from "lucide-react";
import { formatDate } from "@/utils/formatDate";

export default function TrackOrderClient() {
  const [orderId, setOrderId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<any>(null);

  const handleTrack = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderId.trim()) return;

    setLoading(true);
    setError(null);
    setResult(null);

    const res = await trackCustomerOrder(orderId.trim());

    if (!res.success) {
      setError(res.error || "Failed to track order.");
    } else {
      setResult(res.data);
    }
    setLoading(false);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "PENDING":
        return <Package className="w-10 h-10 text-primary" />;
      case "CONFIRMED":
      case "PACKAGING":
        return <PackageCheck className="w-10 h-10 text-primary" />;
      case "SHIPPED":
        return <Truck className="w-10 h-10 text-primary" />;
      case "DELIVERED":
        return <CheckCircle className="w-10 h-10 text-primary" />;
      case "CANCELLED":
        return <AlertCircle className="w-10 h-10 text-red-500" />;
      default:
        return <Package className="w-10 h-10 text-primary" />;
    }
  };

  return (
    <main className="flex-1 bg-slate-50 py-16 px-4">
      <div className="max-w-xl mx-auto w-full">
        
        <div className="text-center mb-10">
          <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mb-3 tracking-tight">Track Your Order</h1>
          <p className="text-slate-500">Enter your order ID below to get real-time tracking updates.</p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-6 md:p-8 mb-8">
          <form onSubmit={handleTrack} className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                placeholder="Order ID e.g. 123e4567..."
                value={orderId}
                onChange={(e) => setOrderId(e.target.value)}
                className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder:text-slate-400 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
                required
              />
            </div>
            <button
              type="submit"
              disabled={loading || !orderId.trim()}
              className="px-8 py-3 bg-primary text-white rounded-xl font-medium tracking-wide hover:bg-primary/90 focus:ring-2 focus:ring-primary focus:ring-offset-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
            >
              {loading ? "Tracking..." : "Track"}
            </button>
          </form>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 p-4 rounded-xl text-sm font-medium border border-red-100 flex items-center gap-3 mb-8">
            <AlertCircle className="w-5 h-5 shrink-0" />
            {error}
          </div>
        )}

        {result && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Order Overview Header */}
            <div className="flex flex-col sm:flex-row gap-5 items-center sm:items-start text-center sm:text-left bg-white p-6 rounded-2xl border border-slate-200">
              <div className="bg-primary/5 p-4 rounded-full">
                {getStatusIcon(result.order.status)}
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-bold text-slate-900 mb-1">Order {result.order.status}</h2>
                <p className="text-sm text-slate-500 font-mono mb-2">ID: {result.order.id}</p>
                <p className="text-xs text-slate-400 font-medium uppercase tracking-wider block">Placed on {formatDate(result.order.createdAt)}</p>
              </div>
            </div>

            {/* Pathao Tracking Box (If available) */}
            {result.pathaoInfo && (
              <div className="bg-white border border-slate-200 rounded-2xl p-6 relative overflow-hidden">
                <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
                  <Truck className="w-5 h-5 text-primary" />
                  Courier Tracking Info
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                    <p className="text-xs uppercase font-bold text-slate-400 tracking-wider mb-1">Current Status</p>
                    <p className="font-semibold text-slate-800">{result.pathaoInfo.order_status || 'Unknown'}</p>
                  </div>
                  <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                    <p className="text-xs uppercase font-bold text-slate-400 tracking-wider mb-1">Last Updated</p>
                    <p className="font-semibold text-slate-800">
                      {result.pathaoInfo.updated_at ? formatDate(result.pathaoInfo.updated_at) : 'N/A'}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Items List */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6">
              <h3 className="font-bold text-slate-900 mb-4">Order Summary</h3>
              <div className="space-y-3">
                {result.order.items.map((item: any, idx: number) => (
                  <div key={idx} className="flex justify-between items-center py-3 border-b border-slate-100 last:border-0 last:pb-0">
                    <div className="text-sm font-medium text-slate-700">{item.product?.name}</div>
                    <div className="text-sm text-slate-500 font-mono bg-slate-50 px-2 py-1 rounded-lg border border-slate-100">x{item.quantity}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Pricing */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-3 text-sm">
              <div className="flex justify-between text-slate-600">
                <span>Total Amount</span>
                <span className="font-medium font-mono">৳{result.order.totalAmount.toLocaleString("en-IN")}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Advance Paid</span>
                <span className="font-medium font-mono text-primary">- ৳{result.order.advancePaid.toLocaleString("en-IN")}</span>
              </div>
              <div className="flex justify-between font-bold text-slate-900 pt-3 border-t border-slate-100 mt-1">
                <span>Due on Delivery</span>
                <span className="font-mono text-primary">৳{(result.order.totalAmount - result.order.advancePaid).toLocaleString("en-IN")}</span>
              </div>
            </div>

          </div>
        )}
      </div>
    </main>
  );
}
