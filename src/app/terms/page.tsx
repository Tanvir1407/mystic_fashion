import type { Metadata } from "next";
import StaticPage from "@/components/StaticPage";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Terms & Conditions | Mystic Fashion",
  description: "Read Mystic Fashion's terms and conditions for shopping, returns, and use of our website.",
  alternates: { canonical: "https://mysticfashion.co/terms" },
  robots: { index: true, follow: false },
};

export default function TermsPage() {
  return <StaticPage slug="terms" defaultTitle="Terms & Conditions" />;
}
