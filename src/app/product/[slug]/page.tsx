import { notFound, redirect } from 'next/navigation';
import ProductClient from './ProductClient';
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SidebarCart from "@/components/SidebarCart";
import prisma from "@/lib/prisma";
import { getFooterData } from "@/lib/footer";
import { cookies } from 'next/headers';

export const dynamic = "force-dynamic";

export default async function ProductPage({ params }: { params: { slug: string } }) {
  const cookieStore = cookies();
  const isAdmin = cookieStore.get("admin-auth")?.value === "true";

  const identifier = params.slug;
  // Match UUID pattern (standard Prisma UUID format)
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(identifier);

  let productRes = null;

  if (isUuid) {
    productRes = await prisma.product.findUnique({
      where: { id: identifier },
      include: {
        variants: {
          include: {
            pricingMatrix: true,
            stocks: { where: { warehouse: { code: "WH-MAIN" } } }
          }
        },
        sizeChart: true,
        discount: true,
        mediaAssets: { orderBy: { sortOrder: "asc" } },
        categoryRel: {
          include: {
            attributeMappings: {
              include: {
                attribute: true
              },
              orderBy: {
                sortOrder: "asc"
              }
            }
          }
        },
      }
    });

    // If found by ID and has a slug, do a 301 redirect to the slug-based URL!
    if (productRes && productRes.slug) {
      redirect(`/product/${productRes.slug}`);
    }
  } else {
    productRes = await prisma.product.findUnique({
      where: { slug: identifier },
      include: {
        variants: {
          include: {
            pricingMatrix: true,
            stocks: { where: { warehouse: { code: "WH-MAIN" } } }
          }
        },
        sizeChart: true,
        discount: true,
        mediaAssets: { orderBy: { sortOrder: "asc" } },
        categoryRel: {
          include: {
            attributeMappings: {
              include: {
                attribute: true
              },
              orderBy: {
                sortOrder: "asc"
              }
            }
          }
        },
      }
    });
  }

  // Fallback: If not found by slug, check ID
  if (!productRes) {
    productRes = await prisma.product.findUnique({
      where: { id: identifier },
      include: {
        variants: {
          include: {
            pricingMatrix: true,
            stocks: { where: { warehouse: { code: "WH-MAIN" } } }
          }
        },
        sizeChart: true,
        discount: true,
        mediaAssets: { orderBy: { sortOrder: "asc" } },
        categoryRel: {
          include: {
            attributeMappings: {
              include: {
                attribute: true
              },
              orderBy: {
                sortOrder: "asc"
              }
            }
          }
        },
      }
    });
    if (productRes && productRes.slug) {
      redirect(`/product/${productRes.slug}`);
    }
  }

  if (!productRes || (!productRes.isPublished && !isAdmin)) {
    notFound();
  }

  // Sort variants in-memory
  productRes.variants.sort((a: any, b: any) => (a.order || 0) - (b.order || 0));

  const basePrice = productRes.variants?.[0]?.pricingMatrix?.basePrice
    ? Number(productRes.variants[0].pricingMatrix.basePrice)
    : productRes.price;

  const displayImages = (productRes.mediaAssets && productRes.mediaAssets.length > 0)
    ? productRes.mediaAssets.map((asset: any) => asset.url)
    : ((productRes as any).images || []);

  const product = {
    ...productRes,
    price: basePrice,
    images: displayImages,
    variants: productRes.variants.map((v: any) => ({
      ...v,
      stock: v.stocks?.[0]?.availableQuantity ?? v.stock ?? 0,
      price: v.pricingMatrix?.basePrice ? Number(v.pricingMatrix.basePrice) : basePrice
    }))
  };

  const [delivery, footerData] = await Promise.all([
    prisma.deliverySetting.findUnique({
      where: { id: "default" }
    }),
    getFooterData()
  ]);

  const deliveryData = delivery || { insideDhaka: 80, outsideDhaka: 150 };

  return (
    <div className="min-h-screen bg-white">
      <Header />
      <main className="w-full">
        <ProductClient product={product as any} sizeChartData={product.sizeChart || null} deliveryData={deliveryData} />
      </main>
      <Footer config={footerData} />
      <SidebarCart />
    </div>
  );
}
