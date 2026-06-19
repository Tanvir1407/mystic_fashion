import type { Metadata } from "next";
import StaticPage from "@/components/StaticPage";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Contact Us | Mystic Fashion",
  description: "Get in touch with Mystic Fashion. We're here to help with orders, returns & any questions about our products.",
  alternates: { canonical: "https://mysticfashion.co/contact" },
};

export default function ContactPage() {
  return <StaticPage slug="contact" defaultTitle="Contact Us" />;
}
