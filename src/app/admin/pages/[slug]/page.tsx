import prisma from "@/lib/prisma";
import { notFound } from "next/navigation";
import EditPageClient from "./EditPageClient";

const SLUG_TITLES: Record<string, string> = {
  about: "About Us",
  contact: "Contact Us",
  faq: "FAQ",
  privacy: "Privacy Policy",
  terms: "Terms & Conditions",
};

export default async function EditPage({ params }: { params: { slug: string } }) {
  const { slug } = params;
  
  if (!SLUG_TITLES[slug]) {
    notFound();
  }

  const page = await prisma.page.findUnique({
    where: { slug },
  });

  return (
    <EditPageClient 
      slug={slug} 
      initialData={page ? { title: page.title, content: page.content } : { title: SLUG_TITLES[slug], content: "" }} 
    />
  );
}
