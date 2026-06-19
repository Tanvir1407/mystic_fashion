import type { Metadata } from "next";
import StaticPage from "@/components/StaticPage";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Privacy Policy | Mystic Fashion",
  description: "Read Mystic Fashion's privacy policy to understand how we collect, use and protect your personal information.",
  alternates: { canonical: "https://mysticfashion.co/privacy" },
  robots: { index: true, follow: false },
};

export default function PrivacyPage() {
  return <StaticPage slug="privacy" defaultTitle="Privacy Policy" />;
}
