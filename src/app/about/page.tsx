import type { Metadata } from "next";
import StaticPage from "@/components/StaticPage";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "About Us | Mystic Fashion",
  description: "Learn about Mystic Fashion — Bangladesh's premium destination for authentic jerseys, sportswear & fashion apparel.",
  alternates: { canonical: "https://mysticfashion.co/about" },
};

export default function AboutPage() {
  return <StaticPage slug="about" defaultTitle="About Us" />;
}
