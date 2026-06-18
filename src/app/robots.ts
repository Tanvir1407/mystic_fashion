import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://mysticfashion.co";

  return {
    rules: [
      // Standard search engine crawlers — full access to public pages
      {
        userAgent: "*",
        allow: ["/", "/products", "/product/", "/search", "/track"],
        disallow: [
          "/admin/",
          "/staff/",
          "/api/",
          "/test-pathao/",
          "/checkout/",
          "/account/",
        ],
      },
      // Google AI (Bard/Gemini) crawler
      {
        userAgent: "Google-Extended",
        allow: ["/", "/products", "/product/", "/llms.txt", "/sitemap.xml"],
        disallow: ["/admin/", "/staff/", "/api/", "/checkout/"],
      },
      // OpenAI GPT crawler
      {
        userAgent: "GPTBot",
        allow: ["/", "/products", "/product/", "/llms.txt", "/sitemap.xml"],
        disallow: ["/admin/", "/staff/", "/api/", "/checkout/"],
      },
      // Anthropic Claude crawler
      {
        userAgent: "Claude-Web",
        allow: ["/", "/products", "/product/", "/llms.txt", "/sitemap.xml"],
        disallow: ["/admin/", "/staff/", "/api/", "/checkout/"],
      },
      // Meta AI crawler
      {
        userAgent: "FacebookBot",
        allow: ["/", "/products", "/product/", "/llms.txt"],
        disallow: ["/admin/", "/staff/", "/api/", "/checkout/"],
      },
      // Perplexity AI
      {
        userAgent: "PerplexityBot",
        allow: ["/", "/products", "/product/", "/llms.txt", "/sitemap.xml"],
        disallow: ["/admin/", "/staff/", "/api/", "/checkout/"],
      },
      // Common AI research crawlers
      {
        userAgent: "CCBot",
        allow: ["/", "/products", "/product/", "/llms.txt"],
        disallow: ["/admin/", "/staff/", "/api/", "/checkout/"],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
    host: baseUrl,
  };
}
