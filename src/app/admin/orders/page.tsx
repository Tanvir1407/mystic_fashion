import { prisma } from "@/lib/prisma";
import OrderRowClient from "./OrderRowClient";

export const dynamic = "force-dynamic";

export default async function AdminOrdersPage() {
  const orders = await prisma.order.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      items: {
        include: {
          product: true,
        },
      },
    },
  });

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-3xl font-black text-foreground">Orders Dashboard</h1>
        <p className="text-foreground/60 mt-1 font-medium">Manage customer orders and fulfillments.</p>
      </div>

      <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-3xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-800/50">
                <th className="p-4 font-bold text-sm text-foreground/60 uppercase tracking-wider">Customer</th>
                <th className="p-4 font-bold text-sm text-foreground/60 uppercase tracking-wider">Address</th>
                <th className="p-4 font-bold text-sm text-foreground/60 uppercase tracking-wider">Items</th>
                <th className="p-4 font-bold text-sm text-foreground/60 uppercase tracking-wider">Total</th>
                <th className="p-4 font-bold text-sm text-foreground/60 uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-zinc-800">
              {orders.map((order) => (
                <OrderRowClient key={order.id} order={order} items={order.items} />
              ))}
              {orders.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-foreground/50 font-medium">
                    No orders have been placed yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
