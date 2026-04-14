import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SidebarCart from "@/components/SidebarCart";
import ProductCard from "@/components/ProductCard";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function SearchPage({
  searchParams,
}: {
  searchParams: { q: string };
}) {
  const query = searchParams.q || "";

  let products: any[] = [];
  if (query) {
    try {
      products = await prisma.product.findMany({
        where: {
          OR: [
            { name: { contains: query, mode: 'insensitive' } },
            { team: { contains: query, mode: 'insensitive' } },
            { category: { contains: query, mode: 'insensitive' } },
            { description: { contains: query, mode: 'insensitive' } },
          ],
        },
        orderBy: { createdAt: "desc" },
        include: { discount: true, variants: true },
      });
    } catch (error) {
      console.error("Error fetching search results:", error);
    }
  }

  return (
    <main className="min-h-screen bg-white dark:bg-zinc-950">
      <Header />

      <div className="container mx-auto py-12 px-4 md:px-0">
        <div className="mb-10 text-center md:text-left">
          <h1 className="text-xl font-semibold text-primary">
            {query ? `Search Results for "${query}"` : "Search Products"}
          </h1>
          <p className="text-zinc-500 mt-2 font-medium">
            {products.length} {products.length === 1 ? "product" : "products"} found
          </p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>

        {products.length === 0 && query && (
          <div className="py-20 text-center flex flex-col items-center">
            <div className="w-20 h-20 bg-slate-100 dark:bg-zinc-900 rounded-full flex items-center justify-center mb-6">
              <span className="text-3xl">🔍</span>
            </div>
            <h2 className="text-xl font-bold text-zinc-800 dark:text-zinc-100">No matching products found</h2>
            <p className="text-slate-500 mt-2 max-w-sm">
              We couldn't find anything matching "{query}". Try searching for another team, jersey, or accessory.
            </p>
          </div>
        )}

        {!query && (
          <div className="py-20 text-center text-slate-500">
            Type something in the search bar to find products.
          </div>
        )}
      </div>

      <Footer />
      <SidebarCart />
    </main>
  );
}
