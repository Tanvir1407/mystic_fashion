import { notFound } from 'next/navigation';
import ProductClient from './ProductClient';
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SidebarCart from "@/components/SidebarCart";

const RAW_PRODUCTS = [
  { id: 1, name: "Mystic Classic Jersey", team: "Mystic FC", price: 4500, image: "/images/mystic.jpg" },
  { id: 2, name: "Mystic Home Kit", team: "Mystic FC", price: 3800, image: "/images/mystic-1.jpg" },
  { id: 3, name: "Mystic Third Kit", team: "Mystic FC", price: 4200, image: "/images/mystic-3.jpg" },
  { id: 4, name: "Mystic Away Jersey", team: "Mystic FC", price: 3900, image: "/images/mysitc-4.jpg" },
  { id: 5, name: "Mystic Pro Elite", team: "Mystic FC", price: 5500, image: "/images/mystic-5.jpg" },
  { id: 6, name: "Mystic Training Kit", team: "Mystic FC", price: 3200, image: "/images/mystic-6.jpg" },
  { id: 7, name: "Mystic Match Day", team: "Mystic FC", price: 4800, image: "/images/mystic-7.jpg" },
  { id: 8, name: "Mystic Retro Edition", team: "Mystic FC", price: 5200, image: "/images/mystic-8.jpg" },
  { id: 9, name: "Mystic Limited Edition", team: "Mystic FC", price: 6500, image: "/images/mystic-9.jpg" },
  { id: 10, name: "Mystic Champions Kit", team: "Mystic FC", price: 5800, image: "/images/mystic-10.jpg" },
  { id: 11, name: "Mystic Signature Series", team: "Mystic FC", price: 7000, image: "/images/mystic-11.jpg" },
];

export const dynamic = "force-dynamic";

export default async function ProductPage({ params }: { params: { id: string } }) {
  
  const rawProduct = RAW_PRODUCTS.find(p => p.id.toString() === params.id);

  if (!rawProduct) {
    notFound();
  }

  // Map to the Product type expected by ProductClient
  const product = {
    id: rawProduct.id.toString(),
    name: rawProduct.name,
    description: "Experience the ultimate in comfort and style with this premium authentic product. Crafted with breathable, moisture-wicking fabric to keep you cool under pressure. Designed for the true fans of Mystic Fashion.",
    price: rawProduct.price,
    images: [rawProduct.image],
    sizes: ["S", "M", "L", "XL", "XXL"],
    team: rawProduct.team,
    stock: 50,
    category: "Jersey"
  };

  return (
    <div className="min-h-screen bg-white">
      <Header />
      <main className="w-full">
        <ProductClient product={product} />
      </main>
      <Footer />
      <SidebarCart />
    </div>
  );
}
