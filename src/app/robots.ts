import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://mysticfashion.com";

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/admin/",
        "/staff/",
        "/api/",
        "/test-pathao/",
        "/checkout/",
      ],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
