import prisma from "@/lib/prisma";
import { getDeliverySettings, getProductsForOrder } from "../../actions";
import { pathaoClient } from "@/lib/pathao/PathaoClient";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Package, User, MapPin, Phone, CalendarDays, Wallet } from "lucide-react";
import Image from "next/image";
import OrderDetailsClient from "./OrderDetailsClient";

export const dynamic = "force-dynamic";

export default async function SingleOrderPage({ params }: { params: { id: string } }) {
  const order = await prisma.order.findUnique({
    where: { id: params.id },
    include: {
      items: {
        include: {
          product: true,
        }
      },
      createdBy: true,
    }
  });
  const deliverySettings = await getDeliverySettings();

  if (!order) {
    notFound();
  }

  // Fetch live Pathao courier status only when order is SHIPPED and has a consignment ID
  let pathaoInfo: any = null;
  if (order.status === 'SHIPPED' && order.pathaoConsignmentId) {
    try {
      pathaoInfo = await pathaoClient.getOrderInfo(order.pathaoConsignmentId);
    } catch (e) {
      // Non-fatal: page still renders without live courier data
      console.error('[AdminOrderPage] Failed to fetch Pathao order info:', e);
    }
  }



  const itemSubtotal = order.items.reduce((acc, item) => acc + (item.price * item.quantity), 0);
  const deliveryDelta = order.totalAmount - itemSubtotal;
  const products = await getProductsForOrder();

  return (
    <div className="flex flex-col gap-4 sm:gap-6 max-w-7xl mx-auto pb-10 px-4 sm:px-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-6 mb-2">
        <div className="flex items-center gap-4">
          <Link href="/admin/orders" className="p-2 bg-white border border-slate-200 rounded-md text-slate-500 hover:text-slate-900 shadow-sm transition-colors hover:bg-slate-50 shrink-0">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 flex flex-wrap items-center gap-3">
              Order #{order.id}
              <span className={`text-[9px] sm:text-[10px] px-2.5 py-1 rounded-sm uppercase tracking-wider font-black ${order.status === 'DELIVERED' ? 'bg-green-100 text-green-700' :
                order.status === 'PENDING' ? 'bg-amber-100 text-amber-700' :
                  order.status === 'CONFIRMED' ? 'bg-blue-100 text-blue-700' :
                    order.status === 'PACKAGING' ? 'bg-purple-100 text-purple-700' :
                      order.status === 'SHIPPED' ? 'bg-indigo-100 text-indigo-700' :
                        order.status === 'CANCELLED' ? 'bg-red-100 text-red-700' :
                          'bg-slate-100 text-slate-700'
                }`}>
                {order.status}
              </span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 flex items-center gap-2 mt-1">
              <CalendarDays className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              {new Date(order.createdAt).toLocaleString()}
            </p>
          </div>
        </div>
      </div>

      <div className="w-full">
        <OrderDetailsClient order={order} deliverySettings={deliverySettings} products={products} pathaoInfo={pathaoInfo} />
      </div>
    </div>
  );
}
