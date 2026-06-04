"use server";

import prisma from "@/lib/prisma";
import { withAuditLog } from "@/lib/audit";
import { revalidatePath } from "next/cache";
import { getOrCreateSystemAccount, createDoubleEntryJournal } from "@/lib/accounting";
import { updateStockDualWrite } from "@/lib/inventory";

// ─── PURCHASE CRUD ────────────────────────────────────────────────────────────

async function _createPurchase(
  supplierName: string,
  invoiceNumber: string,
  totalAmount: number,
  discountAmount: number,
  items: { productId: string; variantId: string; quantity: number; unitPrice: number }[]
) {
  try {
    const result = await prisma.$transaction(async (tx) => {
      let supplierId: string | null = null;
      const sName = supplierName?.trim();
      if (sName) {
        let supplier = await tx.supplier.findUnique({ where: { name: sName } });

        if (!supplier) {
          const deleted = await (tx as any).supplier.findFirst({
            where: { name: sName, deletedAt: { not: null } },
          });
          if (deleted) {
            supplier = await (tx as any).supplier.update({
              where: { id: deleted.id },
              data: { deletedAt: null, active: true },
            });
          } else {
            supplier = await tx.supplier.create({ data: { name: sName, active: true } });
          }
        }
        supplierId = supplier.id;
      }

      const purchase = await tx.purchase.create({
        data: {
          supplierName,
          supplierId,
          invoiceNumber,
          totalAmount,
          discountAmount,
          status: "COMPLETED",
          items: {
            create: items.map((i) => ({
              productId: i.productId,
              variantId: i.variantId,
              quantity: i.quantity,
              unitPrice: i.unitPrice,
            })),
          },
        },
      });

      for (const item of items) {
        const warehouse = await tx.warehouse.findUnique({
          where: { code: "WH-MAIN" },
        });
        if (!warehouse) throw new Error("Default warehouse not found");

        const stockRecord = await tx.stock.findUnique({
          where: {
            variantId_warehouseId: {
              variantId: item.variantId,
              warehouseId: warehouse.id,
            },
          },
        });
        const oldStockQty = stockRecord?.availableQuantity ?? 0;

        const pricingMatrix = await tx.variantPricingMatrix.findUnique({
          where: { variantId: item.variantId },
        });
        const oldCostPrice = pricingMatrix?.costPrice ? Number(pricingMatrix.costPrice) : 0;

        await updateStockDualWrite(tx, {
          variantId: item.variantId,
          quantityChange: item.quantity,
          movementType: "RECEIPT",
          referenceId: purchase.id,
          referenceType: "PURCHASE",
        });

        let newCostPrice = item.unitPrice;
        if (oldStockQty > 0) {
          const oldTotalValue = oldStockQty * oldCostPrice;
          const newValueAdded = item.quantity * item.unitPrice;
          const newTotalStock = oldStockQty + item.quantity;
          newCostPrice = (oldTotalValue + newValueAdded) / newTotalStock;
        }

        await tx.variantPricingMatrix.upsert({
          where: { variantId: item.variantId },
          create: {
            variantId: item.variantId,
            costPrice: newCostPrice,
            basePrice: item.unitPrice * 1.5,
          },
          update: {
            costPrice: newCostPrice,
          },
        });
      }

      const account = await getOrCreateSystemAccount(tx, "Inventory Purchases", "EXPENSE");
      await createDoubleEntryJournal(tx, {
        accountId: account.id,
        amount: totalAmount,
        date: new Date(),
        type: "DEBIT",
        description: `Inventory purchase from ${supplierName}`,
        referenceId: purchase.id,
        referenceType: "PURCHASE",
      });
      revalidatePath("/admin/accounting");
      return purchase;
    });

    revalidatePath("/admin/purchases");
    revalidatePath("/admin/products");
    return { success: true, data: result };
  } catch (error: any) {
    if (
      error.message === "NEXT_REDIRECT" ||
      error.digest?.startsWith("NEXT_REDIRECT")
    ) {
      throw error;
    }
    console.error("Error in createPurchase:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "An unexpected error occurred.",
    };
  }
}

export const createPurchase = withAuditLog(_createPurchase, {
  entityType: "Purchase",
  action: "CREATE",
  getEntityId: () => null,
  getEntityIdFromResult: (r: any) => r?.data?.id ?? null,
  fetchAfter: (id) => prisma.purchase.findUnique({ where: { id }, include: { items: true } }),
  describe: (args) => `Created purchase from "${args[0]}" (৳${args[2]})`,
});

async function _updatePurchase(
  purchaseId: string,
  supplierName: string,
  invoiceNumber: string,
  totalAmount: number,
  discountAmount: number,
  items: { productId: string; variantId: string; quantity: number; unitPrice: number }[]
) {
  try {
    await prisma.$transaction(async (tx) => {
      const existingPurchase = await tx.purchase.findUnique({
        where: { id: purchaseId },
        include: { items: true },
      });
      if (!existingPurchase) throw new Error("Purchase not found");

      for (const oldItem of existingPurchase.items) {
        await updateStockDualWrite(tx, {
          variantId: oldItem.variantId,
          quantityChange: -oldItem.quantity,
          movementType: "ADJUSTMENT",
          referenceId: purchaseId,
          referenceType: "PURCHASE_UPDATE_RESET",
        });
      }

      await tx.purchaseItem.deleteMany({ where: { purchaseId } });

      let supplierId: string | null = null;
      const sName = supplierName?.trim();
      if (sName) {
        let supplier = await tx.supplier.findUnique({ where: { name: sName } });
        if (!supplier) {
          supplier = await tx.supplier.create({ data: { name: sName, active: true } });
        }
        supplierId = supplier.id;
      }

      await tx.purchase.update({
        where: { id: purchaseId },
        data: {
          supplierName,
          supplierId,
          invoiceNumber,
          totalAmount,
          discountAmount,
          items: {
            create: items.map((i) => ({
              productId: i.productId,
              variantId: i.variantId,
              quantity: i.quantity,
              unitPrice: i.unitPrice,
            })),
          },
        },
      });

      for (const item of items) {
        const warehouse = await tx.warehouse.findUnique({
          where: { code: "WH-MAIN" },
        });
        if (!warehouse) throw new Error("Default warehouse not found");

        const stockRecord = await tx.stock.findUnique({
          where: {
            variantId_warehouseId: {
              variantId: item.variantId,
              warehouseId: warehouse.id,
            },
          },
        });
        const oldStockQty = stockRecord?.availableQuantity ?? 0;

        const pricingMatrix = await tx.variantPricingMatrix.findUnique({
          where: { variantId: item.variantId },
        });
        const oldCostPrice = pricingMatrix?.costPrice ? Number(pricingMatrix.costPrice) : 0;

        await updateStockDualWrite(tx, {
          variantId: item.variantId,
          quantityChange: item.quantity,
          movementType: "RECEIPT",
          referenceId: purchaseId,
          referenceType: "PURCHASE_UPDATE",
        });

        let newCostPrice = item.unitPrice;
        if (oldStockQty > 0) {
          const oldTotalValue = oldStockQty * oldCostPrice;
          const newValueAdded = item.quantity * item.unitPrice;
          const newTotalStock = oldStockQty + item.quantity;
          newCostPrice = (oldTotalValue + newValueAdded) / newTotalStock;
        }

        await tx.variantPricingMatrix.upsert({
          where: { variantId: item.variantId },
          create: {
            variantId: item.variantId,
            costPrice: newCostPrice,
            basePrice: item.unitPrice * 1.5,
          },
          update: {
            costPrice: newCostPrice,
          },
        });
      }

      const existingTransaction = await tx.transaction.findFirst({
        where: { referenceId: purchaseId, referenceType: "PURCHASE" },
      });
      if (existingTransaction) {
        await tx.transaction.update({
          where: { id: existingTransaction.id },
          data: {
            amount: totalAmount,
            description: `Inventory purchase from ${supplierName} (Updated)`,
          },
        });

        const journalEntry = await tx.journalEntry.findFirst({
          where: { referenceId: purchaseId, referenceType: "PURCHASE" },
        });
        if (journalEntry) {
          await tx.journalEntry.update({
            where: { id: journalEntry.id },
            data: {
              description: `Inventory purchase from ${supplierName} (Updated)`,
              lines: {
                updateMany: {
                  where: { journalEntryId: journalEntry.id },
                  data: { amount: totalAmount },
                },
              },
            },
          });
        }
      } else {
        const account = await getOrCreateSystemAccount(tx, "Inventory Purchases", "EXPENSE");
        await createDoubleEntryJournal(tx, {
          accountId: account.id,
          amount: totalAmount,
          date: new Date(),
          type: "DEBIT",
          description: `Inventory purchase from ${supplierName} (Created via Update)`,
          referenceId: purchaseId,
          referenceType: "PURCHASE",
        });
      }
    });

    revalidatePath("/admin/purchases");
    revalidatePath("/admin/products");
    revalidatePath("/admin/accounting");
    return { success: true, data: { id: purchaseId } };
  } catch (error: any) {
    console.error("Purchase update error:", error);
    return { success: false, error: error.message };
  }
}

export const updatePurchase = withAuditLog(_updatePurchase, {
  entityType: "Purchase",
  action: "UPDATE",
  getEntityId: (args) => args[0],
  fetchBefore: (id) => prisma.purchase.findUnique({ where: { id }, include: { items: true } }),
  fetchAfter: (id) => prisma.purchase.findUnique({ where: { id }, include: { items: true } }),
  describe: (args) => `Updated purchase ${args[0]}`,
});

async function _deletePurchase(id: string) {
  try {
    await prisma.$transaction(async (tx) => {
      const purchase = await tx.purchase.findUnique({
        where: { id },
        include: { items: true },
      });
      if (!purchase) throw new Error("Purchase not found");

      for (const item of purchase.items) {
        await updateStockDualWrite(tx, {
          variantId: item.variantId,
          quantityChange: -item.quantity,
          movementType: "ADJUSTMENT",
          referenceId: id,
          referenceType: "PURCHASE_DELETE",
        });
      }

      const account = await getOrCreateSystemAccount(tx, "Inventory Purchases", "EXPENSE");
      await createDoubleEntryJournal(tx, {
        accountId: account.id,
        amount: purchase.totalAmount,
        date: new Date(),
        type: "CREDIT",
        description: `Purchase deleted - reversing inventory (Purchase: ${purchase.id})`,
        referenceId: purchase.id,
        referenceType: "PURCHASE",
      });

      await tx.purchase.delete({ where: { id } });
    });

    revalidatePath("/admin/purchases");
    revalidatePath("/admin/products");
    return { success: true };
  } catch (error: any) {
    console.error("Error in deletePurchase:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "An unexpected error occurred.",
    };
  }
}

export const deletePurchase = withAuditLog(_deletePurchase, {
  entityType: "Purchase",
  action: "DELETE",
  getEntityId: (args) => args[0],
  fetchBefore: (id) => prisma.purchase.findUnique({ where: { id }, include: { items: true } }),
  describe: (args) => `Deleted purchase ${args[0]}`,
});

async function _updatePurchaseStatus(id: string, newStatus: string) {
  try {
    await prisma.$transaction(async (tx) => {
      const purchase = await tx.purchase.findUnique({
        where: { id },
        include: { items: true },
      });
      if (!purchase) throw new Error("Purchase not found");

      const oldStatus = purchase.status;
      if (oldStatus === newStatus) return;

      if (oldStatus === "COMPLETED" && newStatus !== "COMPLETED") {
        for (const item of purchase.items) {
          await updateStockDualWrite(tx, {
            variantId: item.variantId,
            quantityChange: -item.quantity,
            movementType: "ADJUSTMENT",
            referenceId: id,
            referenceType: "PURCHASE_STATUS_CHANGE",
          });
        }
      }

      if (oldStatus !== "COMPLETED" && newStatus === "COMPLETED") {
        for (const item of purchase.items) {
          await updateStockDualWrite(tx, {
            variantId: item.variantId,
            quantityChange: item.quantity,
            movementType: "RECEIPT",
            referenceId: id,
            referenceType: "PURCHASE_STATUS_CHANGE",
          });
        }
      }

      await tx.purchase.update({ where: { id }, data: { status: newStatus } });
    });

    revalidatePath("/admin/purchases");
    revalidatePath("/admin/products");
    return { success: true };
  } catch (error: any) {
    console.error("Error in updatePurchaseStatus:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "An unexpected error occurred.",
    };
  }
}

export const updatePurchaseStatus = withAuditLog(_updatePurchaseStatus, {
  entityType: "Purchase",
  action: "UPDATE",
  getEntityId: (args) => args[0],
  fetchBefore: (id) => prisma.purchase.findUnique({ where: { id } }),
  fetchAfter: (id) => prisma.purchase.findUnique({ where: { id } }),
  describe: (args) => `Updated purchase ${args[0]} status to "${args[1]}"`,
});

async function _restorePurchase(id: string) {
  try {
    await prisma.$transaction(async (tx) => {
      await (tx as any).purchase.update({
        where: { id, deletedAt: { not: null } },
        data: { deletedAt: null },
      });

      const purchase = await tx.purchase.findUnique({
        where: { id },
        include: { items: true },
      });
      if (!purchase) throw new Error("Purchase not found after restore");

      for (const item of purchase.items) {
        await updateStockDualWrite(tx, {
          variantId: item.variantId,
          quantityChange: item.quantity,
          movementType: "RECEIPT",
          referenceId: id,
          referenceType: "PURCHASE_RESTORE",
        });
      }

      const account = await getOrCreateSystemAccount(tx, "Inventory Purchases", "EXPENSE");
      await createDoubleEntryJournal(tx, {
        accountId: account.id,
        amount: purchase.totalAmount,
        date: new Date(),
        type: "DEBIT",
        description: `Purchase restored - re-adding inventory (Purchase: ${purchase.id})`,
        referenceId: purchase.id,
        referenceType: "PURCHASE",
      });
    });

    revalidatePath("/admin/purchases");
    revalidatePath("/admin/products");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to restore purchase." };
  }
}

export const restorePurchase = withAuditLog(_restorePurchase, {
  entityType: "Purchase",
  action: "UPDATE",
  getEntityId: (args) => args[0],
  describe: (args) => `Restored purchase ${args[0]}`,
});

// ─── SUPPLIER CRUD ────────────────────────────────────────────────────────────

export async function getSuppliers(
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

    const [total, suppliers] = await Promise.all([
      prisma.supplier.count({ where: whereClause }),
      prisma.supplier.findMany({
        where: whereClause,
        include: { purchases: { select: { totalAmount: true } } },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    const formattedSuppliers = suppliers.map((supplier) => {
      const purchaseCount = supplier.purchases.length;
      const totalSpent = supplier.purchases.reduce((sum, p) => sum + p.totalAmount, 0);
      return {
        id: supplier.id,
        name: supplier.name,
        phone: supplier.phone,
        address: supplier.address,
        active: supplier.active,
        createdAt: supplier.createdAt,
        purchaseCount,
        totalSpent,
      };
    });

    return { success: true, data: formattedSuppliers, total, page, pageSize };
  } catch (error: any) {
    console.error("Get suppliers error:", error);
    return { success: false, error: error.message || "Failed to fetch suppliers." };
  }
}

export async function getSupplierDetails(id: string) {
  try {
    const supplier = await prisma.supplier.findUnique({
      where: { id },
      include: {
        purchases: {
          orderBy: { createdAt: "desc" },
          select: { id: true, totalAmount: true, status: true, createdAt: true },
        },
      },
    });

    if (!supplier) {
      return { success: false, error: "Supplier not found." };
    }

    const purchaseCount = supplier.purchases.length;
    const totalSpent = supplier.purchases.reduce((sum, p) => sum + p.totalAmount, 0);

    return { success: true, data: { ...supplier, purchaseCount, totalSpent } };
  } catch (error: any) {
    console.error("Get supplier details error:", error);
    return { success: false, error: error.message || "Failed to fetch supplier details." };
  }
}

async function _createSupplier(data: {
  name: string;
  phone?: string;
  address?: string;
  active?: boolean;
}) {
  try {
    const supplier = await prisma.supplier.create({
      data: {
        name: data.name.trim(),
        phone: data.phone?.trim() || null,
        address: data.address?.trim() || null,
        active: data.active ?? true,
      },
    });
    revalidatePath("/admin/suppliers");
    return { success: true, data: supplier };
  } catch (error: any) {
    console.error("Create supplier error:", error);
    return { success: false, error: error.message || "Failed to create supplier." };
  }
}

export const createSupplier = withAuditLog(_createSupplier, {
  entityType: "Supplier",
  action: "CREATE",
  getEntityId: () => null,
  getEntityIdFromResult: (r: any) => r?.data?.id ?? null,
  fetchAfter: (id) => prisma.supplier.findUnique({ where: { id } }),
  describe: (args) => `Created supplier "${args[0].name}"`,
});

async function _updateSupplier(
  id: string,
  data: { name?: string; phone?: string; address?: string; active?: boolean }
) {
  try {
    const supplier = await prisma.supplier.update({
      where: { id },
      data: {
        name: data.name ? data.name.trim() : undefined,
        phone: data.phone !== undefined ? data.phone?.trim() || null : undefined,
        address: data.address !== undefined ? data.address?.trim() || null : undefined,
        active: data.active !== undefined ? data.active : undefined,
      },
    });
    revalidatePath("/admin/suppliers");
    return { success: true, data: supplier };
  } catch (error: any) {
    console.error("Update supplier error:", error);
    return { success: false, error: error.message || "Failed to update supplier." };
  }
}

export const updateSupplier = withAuditLog(_updateSupplier, {
  entityType: "Supplier",
  action: "UPDATE",
  getEntityId: (args) => args[0],
  getEntityIdFromResult: () => null,
  fetchAfter: (id) => prisma.supplier.findUnique({ where: { id } }),
  describe: (args) => `Updated supplier with ID ${args[0]}`,
});

async function _deleteSupplier(id: string) {
  try {
    await prisma.supplier.delete({ where: { id } });
    revalidatePath("/admin/suppliers");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to delete supplier." };
  }
}

export const deleteSupplier = withAuditLog(_deleteSupplier, {
  entityType: "Supplier",
  action: "DELETE",
  getEntityId: (args) => args[0],
  fetchBefore: (id) => prisma.supplier.findUnique({ where: { id } }),
  describe: (args) => `Deleted supplier ${args[0]}`,
});

async function _restoreSupplier(id: string) {
  try {
    await prisma.supplier.update({
      where: { id, deletedAt: { not: null } as any },
      data: { deletedAt: null },
    });
    revalidatePath("/admin/suppliers");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to restore supplier." };
  }
}

export const restoreSupplier = withAuditLog(_restoreSupplier, {
  entityType: "Supplier",
  action: "UPDATE",
  getEntityId: (args) => args[0],
  describe: (args) => `Restored supplier ${args[0]}`,
});
