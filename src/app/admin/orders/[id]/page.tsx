import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Package, User, MapPin, Phone, CalendarDays, Wallet } from "lucide-react";
import Image from "next/image";

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
            Order #{order.id.slice(0, 8).toUpperCase()}
            <span className={`text-[10px] px-2.5 py-1 rounded-sm uppercase tracking-wider font-black ${
               order.status === 'DELIVERED' ? 'bg-green-100 text-green-700' :
               order.status === 'PENDING' ? 'bg-amber-100 text-amber-700' :
               order.status === 'CANCELLED' ? 'bg-red-100 text-red-700' :
               'bg-blue-100 text-blue-700'
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Customer Breakdown */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
            <h3 className="font-semibold text-slate-900 mb-5 uppercase tracking-wider text-xs flex items-center gap-2 pb-3 border-b border-slate-100">
              <User className="w-4 h-4 text-slate-400" />
              Customer Identity
            </h3>
            <div className="space-y-5 text-sm text-slate-600">
              <div>
                <span className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Full Name</span>
                <span className="font-semibold text-slate-800 text-base">{order.customerName}</span>
              </div>
              <div>
                <span className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Contact Phone</span>
                <a href={`tel:${order.phone}`} className="inline-flex flex items-center gap-2 hover:text-indigo-600 transition-colors font-medium">
                  <Phone className="w-4 h-4 text-slate-400" />
                  {order.phone}
                </a>
              </div>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
            <h3 className="font-semibold text-slate-900 mb-5 uppercase tracking-wider text-xs flex items-center gap-2 pb-3 border-b border-slate-100">
              <MapPin className="w-4 h-4 text-slate-400" />
              Shipping Coordinates
            </h3>
            <div className="space-y-3 text-sm text-slate-600">
               <div>
                 <span className="inline-block bg-[#800020] text-[#FFD700] px-3 py-1 rounded text-xs font-black tracking-widest uppercase mb-3 shadow-sm">
                   {order.district}
                 </span>
                 <p className="leading-relaxed bg-slate-50 p-4 rounded-md border border-slate-100 text-slate-700">{order.address}</p>
               </div>
            </div>
          </div>
        </div>

        {/* Payload Grid */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
            <div className="p-6 border-b border-slate-100 bg-slate-50/50">
              <h3 className="font-semibold text-slate-900 uppercase tracking-wider text-xs flex items-center gap-2">
                <Package className="w-4 h-4 text-slate-400" />
                Physical Artifacts ({order.items.length})
              </h3>
            </div>
            <div className="divide-y divide-slate-100">
              {order.items.map((item) => (
                <div key={item.id} className="p-6 flex flex-col sm:flex-row gap-5 hover:bg-slate-50/50 transition-colors">
                   <div className="w-20 h-24 relative bg-slate-100 rounded-md overflow-hidden border border-slate-200 flex-shrink-0">
                     {item.product.images[0] && (
                        <Image src={item.product.images[0]} alt={item.product.name} fill className="object-cover" />
                     )}
                   </div>
                   <div className="flex-1 flex flex-col justify-center">
                     <h4 className="font-bold text-slate-900 text-base leading-tight mb-2 pr-4">
                        {item.product.name}
                     </h4>
                     <div className="flex items-center gap-3 text-sm text-slate-500 mb-2">
                        <span className="font-mono bg-slate-900 px-2 py-0.5 rounded text-xs font-bold text-white tracking-widest">{item.size}</span>
                        <span className="font-medium bg-slate-100 px-2 py-0.5 rounded text-xs">Qty: {item.quantity}</span>
                     </div>
                   </div>
                   <div className="sm:text-right flex flex-col justify-center sm:min-w-[100px]">
                      <span className="font-bold text-slate-900 text-base">{formatBDT(item.price * item.quantity)}</span>
                      <span className="text-xs text-slate-400 font-medium">{formatBDT(item.price)} each</span>
                   </div>
                </div>
              ))}
            </div>
            
            <div className="bg-slate-50 p-6 border-t border-slate-200">
               <div className="max-w-sm ml-auto space-y-4">
                  <div className="flex justify-between text-sm text-slate-600 font-medium">
                    <span>Subtotal</span>
                    <span className="text-slate-900">{formatBDT(itemSubtotal)}</span>
                  </div>
                  <div className="flex justify-between text-sm text-slate-600 font-medium border-b border-slate-200 pb-4 mt-2">
                    <span>Delivery Fee</span>
                    <span className="text-slate-900">{formatBDT(deliveryDelta)}</span>
                  </div>
                  <div className="flex justify-between items-center pt-2">
                     <span className="font-bold text-slate-900 uppercase tracking-wider text-sm flex items-center gap-2">
                        <Wallet className="w-4 h-4 text-slate-400" />
                        Total
                     </span>
                     <span className="text-2xl font-black text-[#800020]">{formatBDT(order.totalAmount)}</span>
                  </div>
               </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
