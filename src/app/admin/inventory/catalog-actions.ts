"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { withAuditLog } from "@/lib/audit";

// ═══════════════════════════════════════════════════════════════════════════
// BRANDS
// ═══════════════════════════════════════════════════════════════════════════

async function _createBrand(data: { name: string; active?: boolean }) {
  try {
    const brand = await prisma.brand.create({
      data: { 
        name: data.name.trim(),
        active: data.active !== undefined ? data.active : true
      }
    });
    revalidatePath("/admin/inventory/brands");
    revalidatePath("/admin/products/new");
    return { success: true, brand };
  } catch (error: any) {
    if (error.code === 'P2002') return { success: false, error: "Brand already exists." };
    return { success: false, error: error.message || "Failed to create brand" };
  }
}

export const createBrand = withAuditLog(_createBrand, {
  entityType: "Brand",
  action: "CREATE",
  getEntityId: () => null,
  getEntityIdFromResult: (r: any) => r?.brand?.id ?? null,
  fetchAfter: (id) => prisma.brand.findUnique({ where: { id } }),
  describe: (args) => `Created brand "${args[0].name.trim()}"`,
});

async function _updateBrand(id: string, data: { name: string; active?: boolean }) {
  try {
    const brand = await prisma.brand.update({
      where: { id },
      data: { 
        name: data.name.trim(),
        active: data.active !== undefined ? data.active : true
      }
    });
    revalidatePath("/admin/inventory/brands");
    revalidatePath("/admin/products/new");
    return { success: true, brand };
  } catch (error: any) {
    if (error.code === 'P2002') return { success: false, error: "Brand name already exists." };
    return { success: false, error: error.message || "Failed to update brand" };
  }
}

export const updateBrand = withAuditLog(_updateBrand, {
  entityType: "Brand",
  action: "UPDATE",
  getEntityId: (args) => args[0],
  fetchBefore: (id) => prisma.brand.findUnique({ where: { id } }),
  fetchAfter: (id) => prisma.brand.findUnique({ where: { id } }),
  describe: (args) => `Updated brand ${args[0]}`,
});

async function _deleteBrand(id: string) {
  try {
    await prisma.brand.delete({ where: { id } });
    revalidatePath("/admin/inventory/brands");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: "Cannot delete brand. It may be linked to products." };
  }
}

export const deleteBrand = withAuditLog(_deleteBrand, {
  entityType: "Brand",
  action: "DELETE",
  getEntityId: (args) => args[0],
  fetchBefore: (id) => prisma.brand.findUnique({ where: { id } }),
  describe: (args) => `Deleted brand ${args[0]}`,
});

// ═══════════════════════════════════════════════════════════════════════════
// CATEGORIES
// ═══════════════════════════════════════════════════════════════════════════

async function _createCategory(data: { name: string; active?: boolean }) {
  try {
    const category = await prisma.category.create({
      data: { 
        name: data.name.trim(),
        active: data.active !== undefined ? data.active : true
      }
    });
    revalidatePath("/admin/inventory/categories");
    revalidatePath("/admin/products/new");
    return { success: true, category };
  } catch (error: any) {
    if (error.code === 'P2002') return { success: false, error: "Category already exists." };
    return { success: false, error: error.message || "Failed to create category" };
  }
}

export const createCategory = withAuditLog(_createCategory, {
  entityType: "Category",
  action: "CREATE",
  getEntityId: () => null,
  getEntityIdFromResult: (r: any) => r?.category?.id ?? null,
  fetchAfter: (id) => prisma.category.findUnique({ where: { id } }),
  describe: (args) => `Created category "${args[0].name.trim()}"`,
});

async function _updateCategory(id: string, data: { name: string; active?: boolean }) {
  try {
    const category = await prisma.category.update({
      where: { id },
      data: { 
        name: data.name.trim(),
        active: data.active !== undefined ? data.active : true
      }
    });
    revalidatePath("/admin/inventory/categories");
    revalidatePath("/admin/products/new");
    return { success: true, category };
  } catch (error: any) {
    if (error.code === 'P2002') return { success: false, error: "Category name already exists." };
    return { success: false, error: error.message || "Failed to update category" };
  }
}

export const updateCategory = withAuditLog(_updateCategory, {
  entityType: "Category",
  action: "UPDATE",
  getEntityId: (args) => args[0],
  fetchBefore: (id) => prisma.category.findUnique({ where: { id } }),
  fetchAfter: (id) => prisma.category.findUnique({ where: { id } }),
  describe: (args) => `Updated category ${args[0]}`,
});

async function _deleteCategory(id: string) {
  try {
    await prisma.category.delete({ where: { id } });
    revalidatePath("/admin/inventory/categories");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: "Cannot delete category. It may be linked to products or subcategories." };
  }
}

export const deleteCategory = withAuditLog(_deleteCategory, {
  entityType: "Category",
  action: "DELETE",
  getEntityId: (args) => args[0],
  fetchBefore: (id) => prisma.category.findUnique({ where: { id } }),
  describe: (args) => `Deleted category ${args[0]}`,
});

// ═══════════════════════════════════════════════════════════════════════════
// SUBCATEGORIES
// ═══════════════════════════════════════════════════════════════════════════

async function _createSubcategory(data: { name: string; categoryId: string; active?: boolean }) {
  try {
    const subcategory = await prisma.subcategory.create({
      data: { 
        name: data.name.trim(),
        categoryId: data.categoryId,
        active: data.active !== undefined ? data.active : true
      }
    });
    revalidatePath("/admin/inventory/subcategories");
    revalidatePath("/admin/products/new");
    return { success: true, subcategory };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to create subcategory" };
  }
}

export const createSubcategory = withAuditLog(_createSubcategory, {
  entityType: "Subcategory",
  action: "CREATE",
  getEntityId: () => null,
  getEntityIdFromResult: (r: any) => r?.subcategory?.id ?? null,
  fetchAfter: (id) => prisma.subcategory.findUnique({ where: { id } }),
  describe: (args) => `Created subcategory "${args[0].name.trim()}"`,
});

async function _updateSubcategory(id: string, data: { name: string; categoryId: string; active?: boolean }) {
  try {
    const subcategory = await prisma.subcategory.update({
      where: { id },
      data: { 
        name: data.name.trim(),
        categoryId: data.categoryId,
        active: data.active !== undefined ? data.active : true
      }
    });
    revalidatePath("/admin/inventory/subcategories");
    revalidatePath("/admin/products/new");
    return { success: true, subcategory };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to update subcategory" };
  }
}

export const updateSubcategory = withAuditLog(_updateSubcategory, {
  entityType: "Subcategory",
  action: "UPDATE",
  getEntityId: (args) => args[0],
  fetchBefore: (id) => prisma.subcategory.findUnique({ where: { id } }),
  fetchAfter: (id) => prisma.subcategory.findUnique({ where: { id } }),
  describe: (args) => `Updated subcategory ${args[0]}`,
});

async function _deleteSubcategory(id: string) {
  try {
    await prisma.subcategory.delete({ where: { id } });
    revalidatePath("/admin/inventory/subcategories");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: "Cannot delete subcategory. It may be linked to products." };
  }
}

export const deleteSubcategory = withAuditLog(_deleteSubcategory, {
  entityType: "Subcategory",
  action: "DELETE",
  getEntityId: (args) => args[0],
  fetchBefore: (id) => prisma.subcategory.findUnique({ where: { id } }),
  describe: (args) => `Deleted subcategory ${args[0]}`,
});

async function _restoreBrand(id: string) {
  try {
    await prisma.brand.update({
      where: { id, deletedAt: { not: null } as any },
      data: { deletedAt: null },
    });
    revalidatePath("/admin/inventory/brands");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to restore brand" };
  }
}

export const restoreBrand = withAuditLog(_restoreBrand, {
  entityType: "Brand",
  action: "UPDATE",
  getEntityId: (args) => args[0],
  describe: (args) => `Restored brand ${args[0]}`,
});

async function _restoreCategory(id: string) {
  try {
    await prisma.$transaction(async (tx) => {
      // Restore category
      await (tx as any).category.update({
        where: { id, deletedAt: { not: null } },
        data: { deletedAt: null },
      });

      // Find soft-deleted subcategories before restoring (need IDs for product re-link)
      const subs = await (tx as any).subcategory.findMany({
        where: { categoryId: id, deletedAt: { not: null } },
        select: { id: true },
      });
      const subIds = subs.map((s: any) => s.id);

      // Cascade restore subcategories
      await (tx as any).subcategory.updateMany({
        where: { categoryId: id, deletedAt: { not: null } },
        data: { deletedAt: null },
      });

      // Products under restored subcategories had their categoryId set to null on delete.
      // Re-link them now that their subcategory is restored.
      if (subIds.length > 0) {
        await (tx as any).product.updateMany({
          where: { subcategoryId: { in: subIds }, categoryId: null, deletedAt: null },
          data: { categoryId: id },
        });
      }
      // Note: Products that were directly under this category (no subcategory) had their categoryId
      // set to null and cannot be safely re-linked here — admin must reassign them manually.
    });
    revalidatePath("/admin/inventory/categories");
    revalidatePath("/admin/products");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to restore category" };
  }
}

export const restoreCategory = withAuditLog(_restoreCategory, {
  entityType: "Category",
  action: "UPDATE",
  getEntityId: (args) => args[0],
  describe: (args) => `Restored category ${args[0]}`,
});

async function _restoreSubcategory(id: string) {
  try {
    await prisma.subcategory.update({
      where: { id, deletedAt: { not: null } as any },
      data: { deletedAt: null },
    });
    revalidatePath("/admin/inventory/subcategories");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to restore subcategory" };
  }
}

export const restoreSubcategory = withAuditLog(_restoreSubcategory, {
  entityType: "Subcategory",
  action: "UPDATE",
  getEntityId: (args) => args[0],
  describe: (args) => `Restored subcategory ${args[0]}`,
});

