import prisma from "@/lib/prisma";
import BrandsClient from "./BrandsClient";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Manage Brands | Mystic Admin",
};

export default async function BrandsPage({ searchParams }: { searchParams: { page?: string } }) {
  const page = Number(searchParams?.page) || 1;
  const PER_PAGE = 10;

  const [brands, totalCount] = await Promise.all([
    prisma.brand.findMany({
      orderBy: { name: "asc" },
      skip: (page - 1) * PER_PAGE,
      take: PER_PAGE,
    }),
    prisma.brand.count(),
  ]);

  const totalPages = Math.ceil(totalCount / PER_PAGE);

  return <BrandsClient brands={brands} currentPage={page} totalPages={totalPages} />;
}
