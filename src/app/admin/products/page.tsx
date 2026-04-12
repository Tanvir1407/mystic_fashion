import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { deleteProduct } from "../actions";

export const dynamic = "force-dynamic";

export default async function AdminProductsPage() {
  const products = await prisma.product.findMany({
    orderBy: { team: "asc" },
  });

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-foreground">Products Dashboard</h1>
          <p className="text-foreground/60 mt-1 font-medium">Manage your jerseys, inventory, and pricing.</p>
        </div>
        <Link
          href="/admin/products/new"
          className="h-12 px-6 bg-foreground text-background font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-gold hover:text-black transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
          Add Product
        </Link>
      </div>

      <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-3xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-800/50">
                <th className="p-4 font-bold text-sm text-foreground/60 uppercase tracking-wider">Product</th>
                <th className="p-4 font-bold text-sm text-foreground/60 uppercase tracking-wider">Price (BDT)</th>
                <th className="p-4 font-bold text-sm text-foreground/60 uppercase tracking-wider">Stock</th>
                <th className="p-4 font-bold text-sm text-foreground/60 uppercase tracking-wider">Team</th>
                <th className="p-4 font-bold text-sm text-foreground/60 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-zinc-800">
              {products.map((product) => (
                <tr key={product.id} className="hover:bg-slate-50 dark:hover:bg-zinc-800/50 transition-colors">
                  <td className="p-4">
                    <div className="font-bold text-foreground">{product.name}</div>
                    <div className="text-xs text-foreground/50">{product.category}</div>
                  </td>
                  <td className="p-4 font-mono font-medium">৳{product.price.toLocaleString("en-IN")}</td>
                  <td className="p-4 font-medium">{product.stock}</td>
                  <td className="p-4 font-medium">{product.team}</td>
                  <td className="p-4 flex items-center justify-end gap-3">
                    <Link
                      href={`/admin/products/${product.id}/edit`}
                      className="text-sm font-bold text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
                    >
                      Edit
                    </Link>
                    <form action={async () => {
                      "use server";
                      await deleteProduct(product.id);
                    }}>
                      <button
                        type="submit"
                        className="text-sm font-bold text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 transition-colors"
                      >
                        Delete
                      </button>
                    </form>
                  </td>
                </tr>
              ))}
              {products.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-foreground/50 font-medium">
                    No products found. Add some jerseys!
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
