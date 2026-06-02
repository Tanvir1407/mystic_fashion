import { MetadataRoute } from "next";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const revalidate = 3600; // Cache sitemap for 1 hour

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://mysticfashion.com";

  // 1. Static Pages
  const staticPaths = [
    {
      url: `${baseUrl}/`,
      lastModified: new Date(),
      changeFrequency: "daily" as const,
      priority: 1.0,
    },
    {
      url: `${baseUrl}/products`,
      lastModified: new Date(),
      changeFrequency: "daily" as const,
      priority: 0.9,
    },
    {
      url: `${baseUrl}/search`,
      lastModified: new Date(),
      changeFrequency: "weekly" as const,
      priority: 0.5,
    },
    {
      url: `${baseUrl}/track`,
      lastModified: new Date(),
      changeFrequency: "weekly" as const,
      priority: 0.5,
    },
  ];

  // 2. Dynamic Product Pages (Only published and non-deleted products)
  let productPaths: MetadataRoute.Sitemap = [];
  try {
    const products = await prisma.product.findMany({
      where: {
        isPublished: true,
        deletedAt: null,
      },
      select: {
        slug: true,
        updatedAt: true,
      },
    });

    productPaths = products
      .filter((product) => product.slug)
      .map((product) => ({
        url: `${baseUrl}/product/${product.slug}`,
        lastModified: new Date(product.updatedAt),
        changeFrequency: "weekly" as const,
        priority: 0.8,
      }));
  } catch (error) {
    console.error("Error generating product sitemap paths:", error);
  }

  // 3. Dynamic Custom support/information Pages (from DB Page model)
  let dbPagePaths: MetadataRoute.Sitemap = [];
  try {
    const dbPages = await prisma.page.findMany({
      select: {
        slug: true,
        updatedAt: true,
      },
    });

    dbPagePaths = dbPages
      .filter((page) => page.slug)
      .map((page) => ({
        url: `${baseUrl}/${page.slug}`,
        lastModified: new Date(page.updatedAt),
        changeFrequency: "monthly" as const,
        priority: 0.6,
      }));
  } catch (error) {
    console.error("Error generating db pages sitemap paths:", error);
  }

  return [...staticPaths, ...productPaths, ...dbPagePaths];
}
