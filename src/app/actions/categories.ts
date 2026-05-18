"use server";

import prisma from "@/lib/prisma";

export async function getHeaderCategories() {
  try {
    const categories = await prisma.category.findMany({
      where: {
        active: true,
      },
      include: {
        subcategories: {
          where: {
            active: true,
          },
          orderBy: {
            name: "asc",
          },
        },
      },
      orderBy: {
        name: "asc",
      },
    });

    return { success: true, categories };
  } catch (error: any) {
    console.error("Error fetching header categories:", error);
    return { success: false, error: error.message || "Failed to fetch categories" };
  }
}
