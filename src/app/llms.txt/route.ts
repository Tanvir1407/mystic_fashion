import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://mysticfashion.com";

  let markdown = `# Mystic Fashion
> Mystic Fashion is a premium store specializing in authentic sports jerseys, custom team kits, and premium athletic apparel.

## Core Navigation
- [Home](${baseUrl}/) : The main storefront featuring hero collections, trending items, and categories.
- [Products](${baseUrl}/products) : Complete catalog of jerseys and apparel with sorting and filtering options.
- [Order Tracking](${baseUrl}/track) : Track your active jersey or kit order using your phone number or order ID.
- [Search](${baseUrl}/search) : Search our entire inventory for your favorite club, player, or design.

`;

  try {
    // 1. Dynamic Support/Information Pages
    const dbPages = await prisma.page.findMany({
      select: {
        title: true,
        slug: true,
      },
    });

    if (dbPages.length > 0) {
      markdown += `## Support & Policy Pages\n`;
      dbPages.forEach((page) => {
        markdown += `- [${page.title}](${baseUrl}/${page.slug}) : Customer information for ${page.title.toLowerCase()}.\n`;
      });
      markdown += `\n`;
    }
  } catch (error) {
    console.error("Error fetching pages for llms.txt:", error);
  }

  try {
    // 2. Dynamic Published Products List (max 100 for token efficiency)
    const products = await prisma.product.findMany({
      where: {
        isPublished: true,
        deletedAt: null,
      },
      select: {
        name: true,
        slug: true,
        description: true,
        variants: {
          take: 1,
          select: {
            pricingMatrix: {
              select: {
                basePrice: true
              }
            }
          }
        }
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 100,
    });

    if (products.length > 0) {
      markdown += `## Premium Jerseys & Apparel Catalog\n`;
      products.forEach((product) => {
        if (product.slug) {
          const plainDesc = product.description
            ? product.description.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim().substring(0, 120) + "..."
            : "Premium authentic jersey";
          const basePrice = (product.variants?.[0]?.pricingMatrix as any)?.basePrice 
            ? Number((product.variants[0].pricingMatrix as any).basePrice)
            : 0;
          markdown += `- [${product.name}](${baseUrl}/product/${product.slug}) : Price: BDT ${basePrice}. ${plainDesc}\n`;
        }
      });
    }
  } catch (error) {
    console.error("Error fetching products for llms.txt:", error);
  }

  return new Response(markdown, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
    },
  });
}
