import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SidebarCart from "@/components/SidebarCart";
import { getFooterData } from "@/lib/footer";
import TrackOrderClient from "./TrackOrderClient";
import { Metadata } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Track Your Order | Mystic Fashion",
  description: "Get real-time updates on your Mystic Fashion order.",
};

export default async function TrackPage() {
  const footerData = await getFooterData();

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <TrackOrderClient />
      <Footer config={footerData} />
      <SidebarCart />
    </div>
  );
}
