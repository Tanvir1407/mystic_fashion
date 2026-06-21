"use server";

import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import { AdjustmentType } from "@/generated/prisma/client";
import { withAuditLog, logActivity } from "@/lib/audit";
import { getAuditContext } from "@/lib/audit";
import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { createSession, destroySession } from "@/lib/auth";
import { getRedirectUrlForSession } from "@/lib/permissions";
import { updateStockDualWrite } from "@/lib/inventory";

// ─── LOGIN RATE LIMITER ───────────────────────────────────────────────────────
const _loginAttempts = new Map<string, { count: number; resetAt: number }>();
const LOGIN_MAX = 5;
const LOGIN_WINDOW_MS = 15 * 60 * 1000;

function _checkLoginRateLimit(email: string): void {
  const now = Date.now();
  const entry = _loginAttempts.get(email);
  if (entry && now < entry.resetAt) {
    if (entry.count >= LOGIN_MAX) {
      const mins = Math.ceil((entry.resetAt - now) / 60000);
      throw new Error(`Too many login attempts. Try again in ${mins} minute(s).`);
    }
    entry.count++;
  } else {
    _loginAttempts.set(email, { count: 1, resetAt: now + LOGIN_WINDOW_MS });
  }
}

// ─── AUTH ─────────────────────────────────────────────────────────────────────

export async function adminLogin(email: string, password: string) {
  try {
    _checkLoginRateLimit(email);

    const staff = await prisma.staff.findUnique({
      where: { email },
      include: { role: { include: { permissions: true } } },
    });

    if (!staff) {
      return { success: false, error: "Invalid email or password" };
    }

    const isHashed = staff.password.startsWith("$2b$") || staff.password.startsWith("$2a$");
    let passwordValid: boolean;

    if (isHashed) {
      passwordValid = await bcrypt.compare(password, staff.password);
    } else {
      passwordValid = staff.password === password;
      if (passwordValid) {
        const hashed = await bcrypt.hash(password, 10);
        await prisma.staff.update({ where: { id: staff.id }, data: { password: hashed } });
      }
    }

    if (!passwordValid) {
      return { success: false, error: "Invalid email or password" };
    }

    if (!staff.role) {
      return { success: false, error: "Access denied: No role assigned." };
    }

    _loginAttempts.delete(email);

    const sessionPayload = {
      userId: staff.id,
      roleName: staff.role.name,
      permissions:
        staff.role.name === "SUPERADMIN"
          ? []
          : staff.role.permissions.map((p) => ({ action: p.action, subject: p.subject })),
    };

    const token = await createSession(sessionPayload);
    const redirectUrl = getRedirectUrlForSession(sessionPayload);

    return { success: true, token, redirectUrl };
  } catch (error: any) {
    console.error("Error in adminLogin:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "An unexpected error occurred.",
    };
  }
}

export async function adminLogout() {
  await destroySession();
  redirect("/admin/login");
}

// ─── DELIVERY SETTINGS ────────────────────────────────────────────────────────

export async function getDeliverySettings() {
  try {
    const settings = await prisma.deliverySetting.findUnique({
      where: { id: "default" },
    });
    if (settings) return settings;

    return await prisma.deliverySetting.create({
      data: { id: "default", insideDhaka: 70, outsideDhaka: 120 },
    });
  } catch (error: any) {
    if (error.code === "P2002") {
      return await prisma.deliverySetting.findUnique({
        where: { id: "default" },
      }) ?? { id: "default", insideDhaka: 70, outsideDhaka: 120, updatedAt: new Date() };
    }
    throw error;
  }
}

async function _updateDeliverySettings(insideDhaka?: number, outsideDhaka?: number, posFooter?: string) {
  try {
    const updateData: any = {};
    if (insideDhaka !== undefined) updateData.insideDhaka = insideDhaka;
    if (outsideDhaka !== undefined) updateData.outsideDhaka = outsideDhaka;
    if (posFooter !== undefined) updateData.posFooter = posFooter;

    const settings = await prisma.deliverySetting.upsert({
      where: { id: "default" },
      update: updateData,
      create: { 
        id: "default", 
        insideDhaka: insideDhaka ?? 80, 
        outsideDhaka: outsideDhaka ?? 150, 
        posFooter: posFooter ?? "Thank you for shopping with Mystic. We hope you love your purchase!" 
      },
    });
    revalidatePath("/admin/settings");
    revalidatePath("/");
    revalidatePath("/checkout");
    revalidatePath("/product/[slug]", "page");
    return { success: true, data: settings };
  } catch (error: any) {
    console.error("Error in updateDeliverySettings:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "An unexpected error occurred.",
    };
  }
}

export const updateDeliverySettings = withAuditLog(_updateDeliverySettings, {
  entityType: "DeliverySetting",
  action: "UPDATE",
  getEntityId: () => "default",
  fetchBefore: (id) => prisma.deliverySetting.findUnique({ where: { id } }),
  fetchAfter: (id) => prisma.deliverySetting.findUnique({ where: { id } }),
  describe: (args) => {
    const parts = [];
    if (args[0] !== undefined) parts.push(`Inside: ৳${args[0]}`);
    if (args[1] !== undefined) parts.push(`Outside: ৳${args[1]}`);
    if (args[2] !== undefined) parts.push(`POS Footer updated`);
    return `Updated delivery settings (${parts.join(", ")})`;
  },
});

// ─── INVENTORY SETTINGS ───────────────────────────────────────────────────────

export async function getInventorySettings() {
  try {
    const settings = await prisma.inventorySetting.findUnique({
      where: { id: "default" },
    });
    if (settings) return settings;

    return await prisma.inventorySetting.create({
      data: { id: "default", lowStockThreshold: 5 },
    });
  } catch (error: any) {
    if (error.code === "P2002") {
      return await prisma.inventorySetting.findUnique({
        where: { id: "default" },
      }) ?? { id: "default", lowStockThreshold: 5, updatedAt: new Date() };
    }
    throw error;
  }
}

async function _updateInventorySettings(lowStockThreshold: number) {
  try {
    const settings = await prisma.inventorySetting.upsert({
      where: { id: "default" },
      update: { lowStockThreshold },
      create: { id: "default", lowStockThreshold },
    });
    revalidatePath("/admin/inventory");
    return { success: true, data: settings };
  } catch (error: any) {
    console.error("Error in updateInventorySettings:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "An unexpected error occurred.",
    };
  }
}

export const updateInventorySettings = withAuditLog(_updateInventorySettings, {
  entityType: "InventorySetting",
  action: "UPDATE",
  getEntityId: () => "default",
  fetchBefore: (id) => prisma.inventorySetting.findUnique({ where: { id } }),
  fetchAfter: (id) => prisma.inventorySetting.findUnique({ where: { id } }),
  describe: (args) => `Updated inventory low stock threshold to ${args[0]}`,
});

// ─── DTF PRINT SETTINGS ───────────────────────────────────────────────────────

export async function getDTFPrintSetting() {
  try {
    const setting = await prisma.dTFPrintSetting.findUnique({
      where: { id: "default" },
    });
    if (setting) return setting;

    return await prisma.dTFPrintSetting.create({
      data: { id: "default", printCost: 300 },
    });
  } catch (error: any) {
    if (error.code === "P2002") {
      return await prisma.dTFPrintSetting.findUnique({
        where: { id: "default" },
      }) ?? { id: "default", printCost: 300, updatedAt: new Date() };
    }
    throw error;
  }
}

async function _updateDTFPrintSetting(printCost: number) {
  try {
    const setting = await prisma.dTFPrintSetting.upsert({
      where: { id: "default" },
      update: { printCost },
      create: { id: "default", printCost },
    });
    revalidatePath("/admin/settings");
    revalidatePath("/checkout");
    return { success: true, data: setting };
  } catch (error: any) {
    console.error("Error in updateDTFPrintSetting:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "An unexpected error occurred.",
    };
  }
}

export const updateDTFPrintSetting = withAuditLog(_updateDTFPrintSetting, {
  entityType: "DTFPrintSetting",
  action: "UPDATE",
  getEntityId: () => "default",
  fetchBefore: (id) => prisma.dTFPrintSetting.findUnique({ where: { id } }),
  fetchAfter: (id) => prisma.dTFPrintSetting.findUnique({ where: { id } }),
  describe: (args) => `Updated DTF print cost to ৳${args[0]}`,
});

// ─── INVENTORY ────────────────────────────────────────────────────────────────

export async function getLowStockProducts(options?: { limit?: number; page?: number }) {
  const setting = await getInventorySettings();
  const threshold = setting.lowStockThreshold;
  const limit = options?.limit ?? 100;
  const skip = ((options?.page ?? 1) - 1) * limit;

  const productsData = await prisma.product.findMany({
    where: {
      variants: {
        some: {
          stocks: {
            some: {
              warehouse: { code: "MAIN" },
              physicalQuantity: { lte: threshold }
            }
          }
        }
      }
    },
    include: {
      variants: {
        include: {
          stocks: true
        }
      },
      categoryRel: { select: { name: true } }
    },
    orderBy: { updatedAt: "desc" },
    take: limit,
    skip,
  });

  return productsData.map(product => ({
    ...product,
    category: product.categoryRel?.name || "",
    variants: product.variants.map(variant => ({
      ...variant,
      stock: variant.stocks.reduce((sum, s) => sum + s.physicalQuantity, 0)
    }))
  }));
}

async function _adjustStock(data: {
  variantId: string;
  adjustmentType: AdjustmentType;
  quantity: number;
  reason?: string;
}) {
  try {
    const { variantId, adjustmentType, quantity, reason } = data;

    const result = await prisma.$transaction(async (tx) => {
      const warehouse = await tx.warehouse.upsert({
        where: { code: "MAIN" },
        create: { code: "MAIN", name: "Main Warehouse", address: "Central Fulfillment Center, Dhaka, Bangladesh", isActive: true },
        update: {},
      });

      let stock = await tx.stock.findUnique({
        where: { variantId_warehouseId: { variantId, warehouseId: warehouse.id } }
      });

      if (!stock) {
        stock = await tx.stock.create({
          data: {
            variantId,
            warehouseId: warehouse.id,
            physicalQuantity: 0,
            availableQuantity: 0,
            reservedQuantity: 0,
            version: 0
          }
        });
      }

      const previousQuantity = stock.physicalQuantity;
      let newQuantity = previousQuantity;

      if (adjustmentType === "ADDITION") newQuantity = previousQuantity + quantity;
      else if (adjustmentType === "SUBTRACTION") newQuantity = previousQuantity - quantity;
      else if (adjustmentType === "SET") newQuantity = quantity;

      if (adjustmentType === "SUBTRACTION" && newQuantity < 0) {
        throw new Error("Stock cannot go below zero");
      }

      await updateStockDualWrite(tx, {
        variantId,
        absoluteQuantity: newQuantity,
        movementType: "ADJUSTMENT",
        referenceType: "MANUAL_ADJUSTMENT",
        referenceId: reason || undefined
      });

      const adjustment = await tx.stockAdjustment.create({
        data: { variantId, adjustmentType, quantity, previousQuantity, newQuantity, reason },
      });

      return adjustment;
    });

    revalidatePath("/admin/inventory");
    revalidatePath("/admin/inventory/adjustments");
    return { success: true, data: result };
  } catch (error: any) {
    console.error("Stock adjustment error:", error);
    return { success: false, error: error.message || "Failed to adjust stock" };
  }
}

export const adjustStock = withAuditLog(_adjustStock, {
  entityType: "StockAdjustment",
  action: "CREATE",
  getEntityId: () => null,
  getEntityIdFromResult: (r: any) => r?.data?.id ?? null,
  fetchAfter: (id) => prisma.stockAdjustment.findUnique({ where: { id } }),
  describe: (args) =>
    `Adjusted stock for variant ${args[0].variantId} (${args[0].adjustmentType}: ${args[0].quantity})`,
});

export async function bulkAdjustStock(
  adjustments: {
    variantId: string;
    adjustmentType: AdjustmentType;
    quantity: number;
    reason?: string;
  }[]
) {
  try {
    const results = await prisma.$transaction(async (tx) => {
      const createdAdjustments = [];

      const warehouse = await tx.warehouse.upsert({
        where: { code: "MAIN" },
        create: { code: "MAIN", name: "Main Warehouse", address: "Central Fulfillment Center, Dhaka, Bangladesh", isActive: true },
        update: {},
      });

      for (const adj of adjustments) {
        const { variantId, adjustmentType, quantity, reason } = adj;

        let stock = await tx.stock.findUnique({
          where: { variantId_warehouseId: { variantId, warehouseId: warehouse.id } }
        });

        if (!stock) {
          stock = await tx.stock.create({
            data: {
              variantId,
              warehouseId: warehouse.id,
              physicalQuantity: 0,
              availableQuantity: 0,
              reservedQuantity: 0,
              version: 0
            }
          });
        }

        const previousQuantity = stock.physicalQuantity;
        let newQuantity = previousQuantity;

        if (adjustmentType === "ADDITION") newQuantity = previousQuantity + quantity;
        else if (adjustmentType === "SUBTRACTION") newQuantity = previousQuantity - quantity;
        else if (adjustmentType === "SET") newQuantity = quantity;

        if (adjustmentType === "SUBTRACTION" && newQuantity < 0) {
          throw new Error(`Stock cannot go below zero for variant ${variantId}`);
        }

        await updateStockDualWrite(tx, {
          variantId,
          absoluteQuantity: newQuantity,
          movementType: "ADJUSTMENT",
          referenceType: "MANUAL_BULK_ADJUSTMENT",
          referenceId: reason || undefined
        });

        const adjustment = await tx.stockAdjustment.create({
          data: { variantId, adjustmentType, quantity, previousQuantity, newQuantity, reason },
        });

        createdAdjustments.push(adjustment);
      }
      return createdAdjustments;
    });

    const auditContext = await getAuditContext();
    if (auditContext && results && Array.isArray(results)) {
      for (const adj of results) {
        logActivity({
          userId: auditContext.userId,
          userEmail: auditContext.userEmail,
          userRole: auditContext.userRole,
          action: "CREATE",
          entityType: "StockAdjustment",
          entityId: adj.id,
          description: `Adjusted stock for variant ${adj.variantId} (${adj.adjustmentType}: ${adj.quantity}) (Bulk Adjust)`,
          dataAfter: adj as any,
          ipAddress: auditContext.ipAddress,
          userAgent: auditContext.userAgent,
        });
      }
    }

    revalidatePath("/admin/inventory");
    revalidatePath("/admin/inventory/adjustments");
    return { success: true, data: results };
  } catch (error: any) {
    console.error("Bulk stock adjustment error:", error);
    return { success: false, error: error.message || "Failed to process bulk stock adjustments" };
  }
}

export async function getRecentAdjustments() {
  return await prisma.stockAdjustment.findMany({
    include: {
      variant: { include: { product: { select: { name: true } } } },
    },
    orderBy: { createdAt: "desc" },
    take: 20,
  });
}

// ─── CMS PAGES ────────────────────────────────────────────────────────────────

export async function getPageBySlug(slug: string) {
  try {
    const page = await prisma.page.findUnique({ where: { slug } });
    return { success: true, data: page };
  } catch (error: any) {
    console.error("Error in getPageBySlug:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "An unexpected error occurred.",
    };
  }
}

async function _updatePage(slug: string, data: { title: string; content: string }) {
  try {
    const page = await prisma.page.upsert({
      where: { slug },
      update: { title: data.title, content: data.content },
      create: { slug, title: data.title, content: data.content },
    });
    revalidatePath("/");
    revalidatePath(`/pages/${slug}`);
    return { success: true, data: page };
  } catch (error: any) {
    console.error("Error in updatePage:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "An unexpected error occurred.",
    };
  }
}

export const updatePage = withAuditLog(_updatePage, {
  entityType: "Page",
  action: "UPDATE",
  getEntityId: (args) => args[0],
  fetchBefore: (id) => prisma.page.findUnique({ where: { slug: id } }),
  fetchAfter: (id) => prisma.page.findUnique({ where: { slug: id } }),
  describe: (args) => `Updated page "${args[0]}" (${args[1].title})`,
});

// ─── CUSTOMERS ────────────────────────────────────────────────────────────────

export async function getCustomers(
  search?: string,
  page: number = 1,
  pageSize: number = 20
) {
  try {
    const whereClause = search
      ? {
          OR: [
            { name: { contains: search, mode: "insensitive" as any } },
            { phone: { contains: search, mode: "insensitive" as any } },
          ],
        }
      : {};

    const [total, customers] = await Promise.all([
      prisma.customer.count({ where: whereClause }),
      prisma.customer.findMany({
        where: whereClause,
        include: { orders: { select: { totalAmount: true } } },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    const formattedCustomers = customers.map((customer) => {
      const orderCount = customer.orders.length;
      const totalSpent = customer.orders.reduce((sum, o) => sum + o.totalAmount, 0);
      return {
        id: customer.id,
        name: customer.name,
        phone: customer.phone,
        address: customer.address,
        createdAt: customer.createdAt,
        orderCount,
        totalSpent,
      };
    });

    return { success: true, data: formattedCustomers, total, page, pageSize };
  } catch (error: any) {
    console.error("Get customers error:", error);
    return { success: false, error: error.message || "Failed to fetch customers." };
  }
}

export async function getCustomerDetails(id: string) {
  try {
    const customer = await prisma.customer.findUnique({
      where: { id },
      include: {
        orders: {
          orderBy: { createdAt: "desc" },
          select: { id: true, totalAmount: true, status: true, createdAt: true },
        },
      },
    });

    if (!customer) {
      return { success: false, error: "Customer not found." };
    }

    const orderCount = customer.orders.length;
    const totalSpent = customer.orders.reduce((sum, o) => sum + o.totalAmount, 0);

    return { success: true, data: { ...customer, orderCount, totalSpent } };
  } catch (error: any) {
    console.error("Get customer details error:", error);
    return { success: false, error: error.message || "Failed to fetch customer details." };
  }
}
