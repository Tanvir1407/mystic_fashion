"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { withAuditLog } from "@/lib/audit";

// ═══════════════════════════════════════════════════════════════════════════
// ATTRIBUTE REGISTRY ACTIONS
// ═══════════════════════════════════════════════════════════════════════════

export async function getAttributes() {
  try {
    const attributes = await prisma.attributeRegistry.findMany({
      orderBy: { name: "asc" }
    });
    return { success: true, attributes };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to fetch attributes" };
  }
}

async function _createAttribute(data: { name: string; code: string; type: string; description?: string | null; presets?: string[] }) {
  try {
    const code = data.code.trim().toLowerCase();
    if (!code) return { success: false, error: "Attribute code is required." };
    if (!data.name.trim()) return { success: false, error: "Attribute name is required." };

    const attribute = await prisma.attributeRegistry.create({
      data: {
        code,
        name: data.name.trim(),
        type: data.type || "TEXT",
        description: data.description?.trim() || null,
        presets: data.presets || []
      }
    });

    revalidatePath("/admin/inventory/attributes");
    revalidatePath("/admin/products/new");
    return { success: true, attribute };
  } catch (error: any) {
    if (error.code === "P2002") {
      return { success: false, error: "Attribute code already exists." };
    }
    return { success: false, error: error.message || "Failed to create attribute" };
  }
}

export const createAttribute = withAuditLog(_createAttribute, {
  entityType: "AttributeRegistry",
  action: "CREATE",
  getEntityId: () => null,
  getEntityIdFromResult: (r: any) => r?.attribute?.id ?? null,
  fetchAfter: (id) => prisma.attributeRegistry.findUnique({ where: { id } }),
  describe: (args) => `Created attribute registry item "${args[0].name.trim()} (${args[0].code.trim().toLowerCase()})"`,
});

async function _updateAttribute(id: string, data: { name: string; code: string; type: string; description?: string | null; presets?: string[] }) {
  try {
    const code = data.code.trim().toLowerCase();
    if (!code) return { success: false, error: "Attribute code is required." };
    if (!data.name.trim()) return { success: false, error: "Attribute name is required." };

    const attribute = await prisma.attributeRegistry.update({
      where: { id },
      data: {
        code,
        name: data.name.trim(),
        type: data.type || "TEXT",
        description: data.description?.trim() || null,
        presets: data.presets || []
      }
    });

    revalidatePath("/admin/inventory/attributes");
    revalidatePath("/admin/products/new");
    return { success: true, attribute };
  } catch (error: any) {
    if (error.code === "P2002") {
      return { success: false, error: "Attribute code already exists." };
    }
    return { success: false, error: error.message || "Failed to update attribute" };
  }
}

export const updateAttribute = withAuditLog(_updateAttribute, {
  entityType: "AttributeRegistry",
  action: "UPDATE",
  getEntityId: (args) => args[0],
  fetchBefore: (id) => prisma.attributeRegistry.findUnique({ where: { id } }),
  fetchAfter: (id) => prisma.attributeRegistry.findUnique({ where: { id } }),
  describe: (args) => `Updated attribute registry item ${args[0]}`,
});

async function _deleteAttribute(id: string) {
  try {
    await prisma.attributeRegistry.delete({
      where: { id }
    });
    revalidatePath("/admin/inventory/attributes");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: "Cannot delete attribute. It may be mapped to active categories." };
  }
}

export const deleteAttribute = withAuditLog(_deleteAttribute, {
  entityType: "AttributeRegistry",
  action: "DELETE",
  getEntityId: (args) => args[0],
  fetchBefore: (id) => prisma.attributeRegistry.findUnique({ where: { id } }),
  describe: (args) => `Deleted attribute registry item ${args[0]}`,
});

// ═══════════════════════════════════════════════════════════════════════════
// CATEGORY MAPPING ACTIONS
// ═══════════════════════════════════════════════════════════════════════════

export async function getCategoryMappings(categoryId: string) {
  try {
    const mappings = await prisma.categoryAttributeMapping.findMany({
      where: { categoryId },
      include: { attribute: true },
      orderBy: { sortOrder: "asc" }
    });
    return { success: true, mappings };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to fetch category mappings" };
  }
}

async function _updateCategoryMappings(categoryId: string, attributeIds: string[]) {
  try {
    const result = await prisma.$transaction(async (tx) => {
      // 1. Delete all existing mappings for this category
      await tx.categoryAttributeMapping.deleteMany({
        where: { categoryId }
      });

      // 2. Re-create new mappings in order
      const mappings = [];
      for (let i = 0; i < attributeIds.length; i++) {
        const attributeId = attributeIds[i];
        const mapping = await tx.categoryAttributeMapping.create({
          data: {
            categoryId,
            attributeId,
            sortOrder: i
          },
          include: { attribute: true }
        });
        mappings.push(mapping);
      }

      return mappings;
    });

    revalidatePath("/admin/inventory/attributes");
    revalidatePath("/admin/products/new");
    return { success: true, mappings: result };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to update category mappings" };
  }
}

export const updateCategoryMappings = withAuditLog(_updateCategoryMappings, {
  entityType: "Category",
  action: "UPDATE",
  getEntityId: (args) => args[0],
  fetchBefore: (id) => prisma.category.findUnique({ where: { id } }),
  fetchAfter: (id) => prisma.category.findUnique({ where: { id } }),
  describe: (args) => `Updated attribute mappings for category ${args[0]}`,
});
