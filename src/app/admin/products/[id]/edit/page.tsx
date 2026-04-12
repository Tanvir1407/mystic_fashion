import { updateProduct } from "../../../actions";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";

export default async function EditProductPage({ params }: { params: { id: string } }) {
  const product = await prisma.product.findUnique({
    where: { id: params.id },
  });

  if (!product) {
    notFound();
  }

  const updateProductWithId = updateProduct.bind(null, product.id);

  return (
    <div className="max-w-2xl mx-auto flex flex-col gap-8 pb-12">
      <div className="flex items-center gap-4">
        <Link href="/admin/products" className="w-10 h-10 rounded-full bg-slate-100 dark:bg-zinc-800 flex items-center justify-center text-foreground hover:bg-slate-200 dark:hover:bg-zinc-700 transition-colors">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" /></svg>
        </Link>
        <h1 className="text-3xl font-black text-foreground">Edit Product</h1>
      </div>

      <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-3xl p-8 shadow-sm">
        <form action={updateProductWithId} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="col-span-1 md:col-span-2">
              <label className="block text-sm font-bold text-foreground mb-2">Product Name</label>
              <input type="text" name="name" defaultValue={product.name} required className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-zinc-800/50 border border-slate-200 dark:border-zinc-700 focus:outline-none focus:border-gold transition-colors font-medium" />
            </div>

            <div className="col-span-1 md:col-span-2">
              <label className="block text-sm font-bold text-foreground mb-2">Description</label>
              <textarea name="description" defaultValue={product.description} rows={4} required className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-zinc-800/50 border border-slate-200 dark:border-zinc-700 focus:outline-none focus:border-gold transition-colors font-medium"></textarea>
            </div>

            <div>
              <label className="block text-sm font-bold text-foreground mb-2">Price (BDT)</label>
              <input type="number" name="price" defaultValue={product.price} required className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-zinc-800/50 border border-slate-200 dark:border-zinc-700 focus:outline-none focus:border-gold transition-colors font-mono" />
            </div>

            <div>
              <label className="block text-sm font-bold text-foreground mb-2">Stock</label>
              <input type="number" name="stock" defaultValue={product.stock} required className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-zinc-800/50 border border-slate-200 dark:border-zinc-700 focus:outline-none focus:border-gold transition-colors font-mono" />
            </div>

            <div>
              <label className="block text-sm font-bold text-foreground mb-2">Team</label>
              <input type="text" name="team" defaultValue={product.team} required className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-zinc-800/50 border border-slate-200 dark:border-zinc-700 focus:outline-none focus:border-gold transition-colors font-medium" />
            </div>

            <div>
              <label className="block text-sm font-bold text-foreground mb-2">Category</label>
              <input type="text" name="category" defaultValue={product.category} required className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-zinc-800/50 border border-slate-200 dark:border-zinc-700 focus:outline-none focus:border-gold transition-colors font-medium" />
            </div>

            <div className="col-span-1 md:col-span-2">
              <label className="block text-sm font-bold text-foreground mb-2">Images (Comma separated URLs)</label>
              <input type="text" name="images" defaultValue={product.images.join(", ")} required placeholder="/images/hero.png, /images/thumb.png" className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-zinc-800/50 border border-slate-200 dark:border-zinc-700 focus:outline-none focus:border-gold transition-colors font-medium" />
            </div>

            <div className="col-span-1 md:col-span-2">
              <label className="block text-sm font-bold text-foreground mb-2">Sizes (Comma separated)</label>
              <input type="text" name="sizes" defaultValue={product.sizes.join(", ")} required placeholder="S, M, L, XL" className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-zinc-800/50 border border-slate-200 dark:border-zinc-700 focus:outline-none focus:border-gold transition-colors font-medium" />
            </div>
          </div>

          <div className="pt-6 border-t border-slate-200 dark:border-zinc-800">
            <button type="submit" className="w-full h-14 bg-foreground text-background font-black uppercase tracking-wider rounded-2xl hover:bg-gold hover:text-black hover:shadow-xl hover:shadow-gold/20 transition-all active:scale-95">
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
