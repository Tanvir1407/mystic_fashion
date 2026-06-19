import type { Metadata } from "next";
import StaticPage from "@/components/StaticPage";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "FAQ | Mystic Fashion",
  description: "Frequently asked questions about orders, delivery, returns & products at Mystic Fashion.",
  alternates: { canonical: "https://mysticfashion.co/faq" },
};

export default function FAQPage() {
  return <StaticPage slug="faq" defaultTitle="FAQ" />;
}
