import { notFound, redirect } from 'next/navigation';
import type { Metadata } from 'next';
import ProductClient from './ProductClient';
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SidebarCart from "@/components/SidebarCart";
import prisma from "@/lib/prisma";
import { getFooterData } from "@/lib/footer";
import { cookies } from 'next/headers';

export const dynamic = "force-dynamic";

// ─── generateMetadata: rich title + OG + meta description ───────────────────
export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://mysticfashion.co";
  const identifier = params.slug;

  const isUuidMeta = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(identifier);
  const product = await prisma.product.findUnique({
    where: isUuidMeta ? { id: identifier } : { slug: identifier },
    select: {
      name: true,
      description: true,
      slug: true,
      team: true,
      categoryRel: { select: { name: true } },
      mediaAssets: { take: 1, orderBy: { sortOrder: "asc" }, select: { url: true } },
      variants: {
        take: 1,
        select: { pricingMatrix: { select: { basePrice: true } } }
      }
    }
  }).catch(() => null);

  if (!product) {
    return { title: "Product Not Found | Mystic Fashion" };
  }

  const plainDesc = product.description
    ? product.description.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim().substring(0, 160)
    : `Shop ${product.name} at Mystic Fashion. Premium authentic jerseys and apparel in Bangladesh.`;

  const basePrice = product.variants?.[0]?.pricingMatrix?.basePrice
    ? Number(product.variants[0].pricingMatrix.basePrice)
    : null;

  const priceText = basePrice ? ` — ৳${basePrice}` : "";
  const categoryText = product.categoryRel?.name ? ` | ${product.categoryRel.name}` : "";
  const imageUrl = product.mediaAssets?.[0]?.url || `${baseUrl}/og-image.jpg`;

  return {
    title: `${product.name}${priceText}${categoryText} | Mystic Fashion`,
    description: plainDesc,
    openGraph: {
      title: `${product.name} | Mystic Fashion`,
      description: plainDesc,
      url: `${baseUrl}/product/${product.slug}`,
      siteName: "Mystic Fashion",
      images: [{ url: imageUrl, width: 800, height: 1067, alt: product.name }],
      type: "website",
      locale: "en_US",
    },
    twitter: {
      card: "summary_large_image",
      title: `${product.name} | Mystic Fashion`,
      description: plainDesc,
      images: [imageUrl],
    },
    alternates: {
      canonical: `${baseUrl}/product/${product.slug}`,
    },
  };
}



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
            stocks: { where: { warehouse: { code: "MAIN" } } }
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
            stocks: { where: { warehouse: { code: "MAIN" } } }
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
            stocks: { where: { warehouse: { code: "MAIN" } } }
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
    : 0;

  const displayImages = (productRes.mediaAssets && productRes.mediaAssets.length > 0)
    ? productRes.mediaAssets.map((asset: any) => asset.url)
    : ((productRes as any).images || []);

  const product = {
    ...productRes,
    price: basePrice,
    images: displayImages,
    variants: productRes.variants.map((v: any) => {
      const { pricingMatrix, ...rest } = v;
      return {
        ...rest,
        stock: v.stocks?.[0]?.availableQuantity ?? 0,
        price: pricingMatrix?.basePrice ? Number(pricingMatrix.basePrice) : basePrice
      };
    })
  };

  let relatedProductsRes = await prisma.product.findMany({
    where: {
      isPublished: true,
      categoryId: productRes.categoryId,
      id: { not: productRes.id }
    },
    take: 4,
    include: {
      variants: {
        include: { pricingMatrix: true }
      },
      discount: true,
      mediaAssets: { orderBy: { sortOrder: "asc" } }
    }
  });

  // Fallback to random if not enough related products
  if (relatedProductsRes.length < 4) {
    const additional = await prisma.product.findMany({
      where: {
        isPublished: true,
        id: { notIn: [productRes.id, ...relatedProductsRes.map(p => p.id)] }
      },
      take: 4 - relatedProductsRes.length,
      include: {
        variants: {
          include: { pricingMatrix: true }
        },
        discount: true,
        mediaAssets: { orderBy: { sortOrder: "asc" } }
      }
    });
    relatedProductsRes = [...relatedProductsRes, ...additional];
  }

  const relatedProducts = relatedProductsRes.map((rp: any) => {
    const rpBasePrice = rp.variants?.[0]?.pricingMatrix?.basePrice
      ? Number(rp.variants[0].pricingMatrix.basePrice)
      : rp.price;
    const rpDisplayImages = (rp.mediaAssets && rp.mediaAssets.length > 0)
      ? rp.mediaAssets.map((asset: any) => asset.url)
      : (rp.images || []);
    return {
      ...rp,
      price: rpBasePrice,
      images: rpDisplayImages,
      variants: rp.variants?.map((v: any) => {
        const { pricingMatrix, ...rest } = v;
        return {
          ...rest,
          price: pricingMatrix?.basePrice ? Number(pricingMatrix.basePrice) : rpBasePrice
        };
      })
    };
  });

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://mysticfashion.co";
  const [delivery, footerData] = await Promise.all([
    prisma.deliverySetting.findUnique({
      where: { id: "default" }
    }),
    getFooterData()
  ]);

  const deliveryData = delivery || { insideDhaka: 80, outsideDhaka: 150 };

  // ─── JSON-LD: schema.org Product for AI & rich search results ────────────
  const prices = product.variants
    .map((v: any) => v.price)
    .filter((p: any) => p > 0);
  const minPrice = prices.length > 0 ? Math.min(...prices) : product.price;
  const maxPrice = prices.length > 0 ? Math.max(...prices) : product.price;
  const totalStock = product.variants.reduce((s: number, v: any) => s + (v.stock || 0), 0);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.description
      ? product.description.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim().substring(0, 500)
      : `Premium ${product.name} available at Mystic Fashion.`,
    url: `${baseUrl}/product/${product.slug}`,
    image: product.images?.length > 0 ? product.images : undefined,
    brand: {
      "@type": "Brand",
      name: "Mystic Fashion",
    },
    offers: prices.length > 1 ? {
      "@type": "AggregateOffer",
      priceCurrency: "BDT",
      lowPrice: minPrice,
      highPrice: maxPrice,
      offerCount: product.variants.length,
      availability: totalStock > 0
        ? "https://schema.org/InStock"
        : "https://schema.org/OutOfStock",
      seller: { "@type": "Organization", name: "Mystic Fashion" },
    } : {
      "@type": "Offer",
      priceCurrency: "BDT",
      price: minPrice,
      availability: totalStock > 0
        ? "https://schema.org/InStock"
        : "https://schema.org/OutOfStock",
      seller: { "@type": "Organization", name: "Mystic Fashion" },
      shippingDetails: {
        "@type": "OfferShippingDetails",
        shippingRate: {
          "@type": "MonetaryAmount",
          value: deliveryData.outsideDhaka,
          currency: "BDT",
        },
        deliveryTime: {
          "@type": "ShippingDeliveryTime",
          businessDays: { "@type": "QuantitativeValue", minValue: 1, maxValue: 3 },
        },
        shippingDestination: {
          "@type": "DefinedRegion",
          addressCountry: "BD",
        },
      },
    },
  };

  return (
    <div className="min-h-screen bg-white">
      {/* JSON-LD Structured Data for AI crawlers & Google rich snippets */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Header />
      <main className="w-full">
        <ProductClient product={product as any} sizeChartData={product.sizeChart || null} relatedProducts={relatedProducts} />
      </main>
      <Footer config={footerData} />
      <SidebarCart />
    </div>
  );
}
