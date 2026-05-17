import prisma from "@/lib/prisma";
import CategoriesClient from "./CategoriesClient";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Manage Categories | Mystic Admin",
};

export default async function CategoriesPage({ searchParams }: { searchParams: { page?: string } }) {
  const page = Number(searchParams?.page) || 1;
  const PER_PAGE = 10;

  const [categories, totalCount] = await Promise.all([
    prisma.category.findMany({
      orderBy: { name: "asc" },
      skip: (page - 1) * PER_PAGE,
      take: PER_PAGE,
    }),
    prisma.category.count(),
  ]);

  const totalPages = Math.ceil(totalCount / PER_PAGE);

  return <CategoriesClient categories={categories} currentPage={page} totalPages={totalPages} />;
}
