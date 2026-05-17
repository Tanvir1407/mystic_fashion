import prisma from "@/lib/prisma";
import SubcategoriesClient from "./SubcategoriesClient";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Manage Subcategories | Mystic Admin",
};

export default async function SubcategoriesPage({ searchParams }: { searchParams: { page?: string } }) {
  const page = Number(searchParams?.page) || 1;
  const PER_PAGE = 10;

  const [categories, subcategories, totalCount] = await Promise.all([
    prisma.category.findMany({
      orderBy: { name: "asc" },
    }),
    prisma.subcategory.findMany({
      include: { category: true },
      orderBy: { name: "asc" },
      skip: (page - 1) * PER_PAGE,
      take: PER_PAGE,
    }),
    prisma.subcategory.count(),
  ]);

  const totalPages = Math.ceil(totalCount / PER_PAGE);

  return <SubcategoriesClient subcategories={subcategories} categories={categories} currentPage={page} totalPages={totalPages} />;
}
