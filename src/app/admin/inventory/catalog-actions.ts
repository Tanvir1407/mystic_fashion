"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function createBrand(data: { name: string }) {
  try {
    const brand = await prisma.brand.create({
      data: { name: data.name.trim() }
    });
    revalidatePath("/admin/inventory/brands");
    revalidatePath("/admin/products/new");
    return { success: true, brand };
  } catch (error: any) {
    if (error.code === 'P2002') return { success: false, error: "Brand already exists." };
    return { success: false, error: error.message || "Failed to create brand" };
  }
}

export async function deleteBrand(id: string) {
  try {
    await prisma.brand.delete({ where: { id } });
    revalidatePath("/admin/inventory/brands");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: "Cannot delete brand. It may be linked to products." };
  }
}

export async function createCategory(data: { name: string }) {
  try {
    const category = await prisma.category.create({
      data: { name: data.name.trim() }
    });
    revalidatePath("/admin/inventory/categories");
    revalidatePath("/admin/products/new");
    return { success: true, category };
  } catch (error: any) {
    if (error.code === 'P2002') return { success: false, error: "Category already exists." };
    return { success: false, error: error.message || "Failed to create category" };
  }
}

export async function deleteCategory(id: string) {
  try {
    await prisma.category.delete({ where: { id } });
    revalidatePath("/admin/inventory/categories");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: "Cannot delete category. It may be linked to products or subcategories." };
  }
}

export async function createSubcategory(data: { name: string; categoryId: string }) {
  try {
    const subcategory = await prisma.subcategory.create({
      data: { 
        name: data.name.trim(),
        categoryId: data.categoryId
      }
    });
    revalidatePath("/admin/inventory/subcategories");
    revalidatePath("/admin/products/new");
    return { success: true, subcategory };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to create subcategory" };
  }
}

export async function deleteSubcategory(id: string) {
  try {
    await prisma.subcategory.delete({ where: { id } });
    revalidatePath("/admin/inventory/subcategories");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: "Cannot delete subcategory. It may be linked to products." };
  }
}
