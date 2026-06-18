import { notFound, redirect } from "next/navigation";
import ProductClient from "./ProductClient";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SidebarCart from "@/components/SidebarCart";
import prisma from "@/lib/prisma";
import { getFooterData } from "@/lib/footer";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

export default async function ProductPage({
  params,
}: {
  params: { slug: string };
}) {
  const cookieStore = cookies();
  const isAdmin = cookieStore.get("admin-auth")?.value === "true";

  const identifier = params.slug;
  // Match UUID pattern (standard Prisma UUID format)
  const isUuid =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      identifier,
    );

  let product = null;

  if (isUuid) {
    product = await prisma.product.findUnique({
      where: { id: identifier },
      include: {
        variants: {
          include: { pricingMatrix: true },
        },
        sizeChart: true,
        discount: true,
      },
    });

    // If found by ID and has a slug, do a 301 redirect to the slug-based URL!
    if (product && product.slug) {
      redirect(`/product/${product.slug}`);
    }
  } else {
    product = await prisma.product.findUnique({
      where: { slug: identifier },
      include: {
        variants: {
          include: { pricingMatrix: true },
        },
        sizeChart: true,
        discount: true,
      },
    });
  }

  // Fallback: If not found by slug, maybe check if it's an ID (non-standard format fallback)
  if (!product) {
    product = await prisma.product.findUnique({
      where: { id: identifier },
      include: {
        variants: {
          include: { pricingMatrix: true },
        },
        sizeChart: true,
        discount: true,
      },
    });
    if (product && product.slug) {
      redirect(`/product/${product.slug}`);
    }
  }

  if (!product || (!product.isPublished && !isAdmin)) {
    notFound();
  }

  // Sort variants in-memory to prevent Prisma Client caching issues
  product.variants.sort((a, b) => (a.order || 0) - (b.order || 0));

  const [delivery, footerData, relatedProducts] = await Promise.all([
    prisma.deliverySetting.findUnique({
      where: { id: "default" },
    }),
    getFooterData(),
    (async () => {
      // Fetch up to 12 potential related products matching subcategory, category, or brand
      const relatedCandidates = await prisma.product.findMany({
        where: {
          isPublished: true,
          deletedAt: null,
          id: { not: product.id },
          OR: [
            product.subcategoryId
              ? { subcategoryId: product.subcategoryId }
              : undefined,
            product.categoryId ? { categoryId: product.categoryId } : undefined,
            product.brandId ? { brandId: product.brandId } : undefined,
            { category: { equals: product.category, mode: "insensitive" } },
          ].filter(Boolean) as any,
        },
        take: 12,
        orderBy: { createdAt: "desc" },
        include: {
          discount: true,
          variants: true,
        },
      });

      // Score candidates based on matching attributes
      const scoredProducts = relatedCandidates.map((p) => {
        let score = 0;
        if (product.subcategoryId && p.subcategoryId === product.subcategoryId)
          score += 4;
        if (product.categoryId && p.categoryId === product.categoryId)
          score += 3;
        if (product.brandId && p.brandId === product.brandId) score += 1;
        if (
          product.category &&
          p.category &&
          p.category.toLowerCase() === product.category.toLowerCase()
        )
          score += 2;

        return { product: p, score };
      });

      // Sort by score desc, then by createdAt desc
      scoredProducts.sort((a, b) => {
        if (b.score !== a.score) {
          return b.score - a.score;
        }
        return (
          new Date(b.product.createdAt).getTime() -
          new Date(a.product.createdAt).getTime()
        );
      });

      let selected = scoredProducts.map((sp) => sp.product).slice(0, 4);

      // Fallback: if fewer than 4 related products, fetch latest products to fill
      if (selected.length < 4) {
        const excludedIds = [product.id, ...selected.map((p) => p.id)];
        const fallbackProducts = await prisma.product.findMany({
          where: {
            isPublished: true,
            deletedAt: null,
            id: { notIn: excludedIds },
          },
          take: 4 - selected.length,
          orderBy: { createdAt: "desc" },
          include: {
            discount: true,
            variants: true,
          },
        });
        selected = [...selected, ...fallbackProducts];
      }

      // Sort variants of related products
      selected.forEach((p) => {
        if (p.variants) {
          p.variants.sort((a, b) => (a.order || 0) - (b.order || 0));
        }
      });

      return selected;
    })(),
  ]);

  const deliveryData = delivery || { insideDhaka: 80, outsideDhaka: 150 };

  return (
    <div className="min-h-screen bg-white">
      <Header />
      <main className="w-full">
        <ProductClient
          product={product}
          sizeChartData={product.sizeChart || null}
          deliveryData={deliveryData}
          relatedProducts={relatedProducts}
        />
      </main>
      <Footer config={footerData} />
      <SidebarCart />
    </div>
  );
}
