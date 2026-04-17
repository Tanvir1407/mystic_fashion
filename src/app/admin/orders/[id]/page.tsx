import prisma from "@/lib/prisma";
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
      }
    }
  });

  if (!order) {
    notFound();
  }

  // Format BDT utility
  const formatBDT = (price: number) => {
    return price === 0 ? "Free" : `৳${price.toLocaleString("en-IN")}`;
  };

  const itemSubtotal = order.items.reduce((acc, item) => acc + (item.price * item.quantity), 0);
  const deliveryDelta = order.totalAmount - itemSubtotal;

  return (
    <div className="flex flex-col gap-6 max-w-5xl mx-auto pb-10">
      <div className="flex items-center gap-4 border-b border-slate-200 pb-6 mb-2">
        <Link href="/admin/orders" className="p-2 bg-white border border-slate-200 rounded-md text-slate-500 hover:text-slate-900 shadow-sm transition-colors hover:bg-slate-50">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-3">
            Order #{order.id}
            <span className={`text-[10px] px-2.5 py-1 rounded-sm uppercase tracking-wider font-black ${
               order.status === 'DELIVERED'  ? 'bg-green-100 text-green-700' :
               order.status === 'PENDING'    ? 'bg-amber-100 text-amber-700' :
               order.status === 'CONFIRMED'   ? 'bg-blue-100 text-blue-700' :
               order.status === 'PACKAGING'  ? 'bg-purple-100 text-purple-700' :
               order.status === 'SHIPPED'    ? 'bg-indigo-100 text-indigo-700' :
               order.status === 'CANCELLED'  ? 'bg-red-100 text-red-700' :
               'bg-slate-100 text-slate-700'
            }`}>
              {order.status}
            </span>
          </h1>
          <p className="text-sm text-slate-500 flex items-center gap-2 mt-1">
            <CalendarDays className="w-4 h-4" />
            {new Date(order.createdAt).toLocaleString()}
          </p>
        </div>
      </div>

      <div className="w-full">
        <OrderDetailsClient order={order} />
      </div>
    </div>
  );
}
