"use server";

import prisma from "@/lib/prisma";
import { OrderStatus, ReturnStatus } from "@/generated/prisma/client";
import { withAuditLog, logActivity } from "@/lib/audit";
import { getAuditContext } from "@/lib/audit";
import { revalidatePath } from "next/cache";
import { pathaoClient } from "@/lib/pathao/PathaoClient";
import { getSession } from "@/lib/auth";
import { getOrCreateSystemAccount, createDoubleEntryJournal } from "@/lib/accounting";
import { normalizePhone } from "@/lib/utils";
import { getEffectiveCommissionRate } from "@/lib/commission";
import { generateOrderId } from "@/lib/order-utils";

// ─── INTERNAL HELPERS ────────────────────────────────────────────────────────

// ─── ORDER STATUS ─────────────────────────────────────────────────────────────

async function _updateOrderStatus(orderId: string, status: OrderStatus) {
  try {
    await prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({
        where: { id: orderId },
        include: { items: true },
      });

      if (!order) throw new Error("Order not found");

      const oldStatus = order.status;
      const newStatus = status;

      if (oldStatus === newStatus) return;

      if (["RETURNED", "CANCELLED"].includes(oldStatus)) {
        throw new Error(`Order is ${oldStatus} and cannot be modified.`);
      }

      if (
        newStatus === "PENDING" &&
        !["CONFIRMED", "PRINTING", "PACKAGING"].includes(oldStatus)
      ) {
        throw new Error(
          "Can only revert to Pending from Confirmed, Printing, or Packaging status."
        );
      }

      const stockHoldingStatuses: OrderStatus[] = [
        "CONFIRMED",
        "PRINTING",
        "PACKAGING",
        "SHIPPED",
        "DELIVERED",
      ];
      const isStockHolding = (s: OrderStatus) => stockHoldingStatuses.includes(s);

      const oldIsHolding = isStockHolding(oldStatus);
      const newIsHolding = isStockHolding(newStatus);

      if (!oldIsHolding && newIsHolding) {
        for (const item of order.items) {
          await tx.productVariant.update({
            where: {
              productId_size_color: {
                productId: item.productId,
                size: item.size,
                color: (item as any).color || "Default",
              },
            },
            data: { stock: { decrement: item.quantity } },
          });
        }
      }

      if (oldIsHolding && !newIsHolding) {
        for (const item of order.items) {
          await tx.productVariant.update({
            where: {
              productId_size_color: {
                productId: item.productId,
                size: item.size,
                color: (item as any).color || "Default",
              },
            },
            data: { stock: { increment: item.quantity } },
          });
        }
      }

      await tx.order.update({ where: { id: orderId }, data: { status: newStatus } });

      if (oldStatus === "PENDING" && newStatus === "CONFIRMED") {
        const account = await getOrCreateSystemAccount(tx, "Sales Revenue", "INCOME");
        await createDoubleEntryJournal(tx, {
          accountId: account.id,
          amount: order.totalAmount,
          date: new Date(),
          type: "CREDIT",
          description: `Order confirmation sale for ${order.id}`,
          referenceId: order.id,
          referenceType: "ORDER",
        });
      }

      if (newStatus === "PENDING" && isStockHolding(oldStatus)) {
        const existingCredit = await tx.transaction.findFirst({
          where: { referenceId: orderId, referenceType: "ORDER", type: "CREDIT" },
        });
        if (existingCredit) {
          const account = await getOrCreateSystemAccount(tx, "Sales Revenue", "INCOME");
          await createDoubleEntryJournal(tx, {
            accountId: account.id,
            amount: order.totalAmount,
            date: new Date(),
            type: "DEBIT",
            description: `Order reverted to PENDING from ${oldStatus} - reversing sale for ${order.id}`,
            referenceId: order.id,
            referenceType: "ORDER",
          });
        }
      }

      if (isStockHolding(oldStatus) && newStatus === "CANCELLED") {
        const account = await getOrCreateSystemAccount(tx, "Sales Refunds", "EXPENSE");
        await createDoubleEntryJournal(tx, {
          accountId: account.id,
          amount: order.totalAmount,
          date: new Date(),
          type: "DEBIT",
          description: `Order cancellation refund for ${order.id}`,
          referenceId: order.id,
          referenceType: "ORDER",
        });
      }
    });

    revalidatePath("/admin/orders");
    revalidatePath("/admin/products");
    return { success: true };
  } catch (error: any) {
    console.error("Order update error:", error);
    return { success: false, error: error.message };
  }
}

export const updateOrderStatus = withAuditLog(_updateOrderStatus, {
  entityType: "Order",
  action: "UPDATE",
  getEntityId: (args) => args[0],
  fetchBefore: (id) => prisma.order.findUnique({ where: { id } }),
  fetchAfter: (id) => prisma.order.findUnique({ where: { id } }),
  describe: (args) => `Updated order ${args[0]} status to ${args[1]}`,
});

export async function bulkUpdateOrderStatus(orderIds: string[], status: OrderStatus) {
  const results = [];
  for (const id of orderIds) {
    const res = await updateOrderStatus(id, status);
    results.push(res);
  }
  return results;
}

// ─── DELETE / RESTORE ORDER ───────────────────────────────────────────────────

async function _deleteOrder(id: string) {
  try {
    await prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({
        where: { id },
        include: { items: true },
      });
      if (order) {
        const stockHoldingStatuses = [
          "CONFIRMED",
          "PRINTING",
          "PACKAGING",
          "SHIPPED",
          "DELIVERED",
        ];
        if (stockHoldingStatuses.includes(order.status)) {
          for (const item of order.items) {
            await tx.productVariant.update({
              where: {
                productId_size_color: {
                  productId: item.productId,
                  size: item.size,
                  color: (item as any).color || "Default",
                },
              },
              data: { stock: { increment: item.quantity } },
            });
          }
        }
      }
      await tx.order.delete({ where: { id } });
    });
    revalidatePath("/admin/orders");
    return { success: true };
  } catch (error: any) {
    console.error("Delete order error:", error);
    return { success: false, error: error.message };
  }
}

export const deleteOrder = withAuditLog(_deleteOrder, {
  entityType: "Order",
  action: "DELETE",
  getEntityId: (args) => args[0],
  fetchBefore: (id) => prisma.order.findUnique({ where: { id }, include: { items: true } }),
  describe: (args) => `Deleted order ${args[0]}`,
});

export async function bulkDeleteOrders(orderIds: string[]) {
  try {
    const orders = await prisma.order.findMany({
      where: { id: { in: orderIds } },
      include: { items: true },
    });

    await prisma.$transaction(async (tx) => {
      const stockHoldingStatuses = [
        "CONFIRMED",
        "PRINTING",
        "PACKAGING",
        "SHIPPED",
        "DELIVERED",
      ];
      for (const order of orders) {
        if (stockHoldingStatuses.includes(order.status)) {
          for (const item of order.items) {
            await tx.productVariant.update({
              where: {
                productId_size_color: {
                  productId: item.productId,
                  size: item.size,
                  color: (item as any).color || "Default",
                },
              },
              data: { stock: { increment: item.quantity } },
            });
          }
        }
      }
      await tx.order.deleteMany({ where: { id: { in: orderIds } } });
    });

    const auditContext = await getAuditContext();
    if (auditContext) {
      for (const order of orders) {
        logActivity({
          userId: auditContext.userId,
          userEmail: auditContext.userEmail,
          userRole: auditContext.userRole,
          action: "DELETE",
          entityType: "Order",
          entityId: order.id,
          description: `Deleted order ${order.id} (Bulk Delete)`,
          dataBefore: order as any,
          ipAddress: auditContext.ipAddress,
          userAgent: auditContext.userAgent,
        });
      }
    }

    revalidatePath("/admin/orders");
    return { success: true };
  } catch (error: any) {
    console.error("Bulk delete orders error:", error);
    return { success: false, error: error.message };
  }
}

async function _restoreOrder(id: string) {
  try {
    await prisma.$transaction(async (tx) => {
      await (tx as any).order.update({
        where: { id, deletedAt: { not: null } },
        data: { deletedAt: null },
      });

      const order = await tx.order.findUnique({
        where: { id },
        include: { items: true },
      });

      if (!order) throw new Error("Order not found after restore");

      const stockHoldingStatuses = [
        "CONFIRMED",
        "PRINTING",
        "PACKAGING",
        "SHIPPED",
        "DELIVERED",
      ];
      if (stockHoldingStatuses.includes(order.status)) {
        for (const item of order.items) {
          await tx.productVariant.update({
            where: {
              productId_size_color: {
                productId: item.productId,
                size: item.size,
                color: (item as any).color || "Default",
              },
            },
            data: { stock: { decrement: item.quantity } },
          });
        }
      }
    });

    revalidatePath("/admin/orders");
    revalidatePath("/admin/products");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to restore order." };
  }
}

export const restoreOrder = withAuditLog(_restoreOrder, {
  entityType: "Order",
  action: "UPDATE",
  getEntityId: (args) => args[0],
  describe: (args) => `Restored order ${args[0]}`,
});

// ─── ORDER DETAILS ────────────────────────────────────────────────────────────

async function _updateOrderDetails(
  id: string,
  data: {
    customerName: string;
    phone: string;
    district: string;
    address: string;
    advancePaid: number;
    discountAmount: number;
    deliveryCharge?: number;
    isStorePickup?: boolean;
    pathaoCityId?: number;
    pathaoZoneId?: number;
    pathaoAreaId?: number;
    tags?: string[];
    items?: {
      id: string;
      productId: string;
      size: string;
      quantity: number;
      price: number;
      requiresPrint: boolean;
      printName?: string;
      printNumber?: string;
      printCost: number;
    }[];
  }
) {
  if ((data.discountAmount ?? 0) < 0)
    return { success: false, error: "Discount amount cannot be negative." };
  if ((data.advancePaid ?? 0) < 0)
    return { success: false, error: "Advance paid cannot be negative." };
  if ((data.deliveryCharge ?? 0) < 0)
    return { success: false, error: "Delivery charge cannot be negative." };

  try {
    await prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({
        where: { id },
        include: { items: true },
      });

      if (!order) throw new Error("Order not found");

      if (data.items) {
        const stockHoldingStatuses = [
          "CONFIRMED",
          "PRINTING",
          "PACKAGING",
          "SHIPPED",
          "DELIVERED",
        ];
        const isStockHolding = stockHoldingStatuses.includes(order.status);
        const oldItemsMap = new Map(order.items.map((i) => [i.id, i]));

        for (const newItem of data.items) {
          const oldItem = oldItemsMap.get(newItem.id);
          if (oldItem) {
            const diff = newItem.quantity - oldItem.quantity;
            if (diff !== 0 && isStockHolding) {
              await tx.productVariant.update({
                where: {
                  productId_size_color: {
                    productId: newItem.productId,
                    size: newItem.size,
                    color: (newItem as any).color || "Default",
                  },
                },
                data: { stock: { decrement: diff } },
              });
            }
            oldItemsMap.delete(newItem.id);
          } else {
            if (isStockHolding) {
              await tx.productVariant.update({
                where: {
                  productId_size_color: {
                    productId: newItem.productId,
                    size: newItem.size,
                    color: (newItem as any).color || "Default",
                  },
                },
                data: { stock: { decrement: newItem.quantity } },
              });
            }
          }
        }

        if (isStockHolding) {
          for (const remainingOld of oldItemsMap.values()) {
            await tx.productVariant.update({
              where: {
                productId_size_color: {
                  productId: remainingOld.productId,
                  size: remainingOld.size,
                  color: (remainingOld as any).color || "Default",
                },
              },
              data: { stock: { increment: remainingOld.quantity } },
            });
          }
        }

        await tx.orderItem.deleteMany({ where: { orderId: id } });

        for (const newItem of data.items) {
          await tx.orderItem.create({
            data: {
              orderId: id,
              productId: newItem.productId,
              size: newItem.size,
              quantity: newItem.quantity,
              price: newItem.price,
              requiresPrint: newItem.requiresPrint,
              printName: newItem.printName || null,
              printNumber: newItem.printNumber || null,
              printCost: newItem.printCost,
            },
          });
        }
      }

      const activeItems = data.items || order.items;

      const deliverySettings = await tx.deliverySetting.upsert({
        where: { id: "default" },
        update: {},
        create: { id: "default", insideDhaka: 70, outsideDhaka: 120 },
      });

      const subtotal = activeItems.reduce((acc, item) => {
        const itemTotal =
          item.price * item.quantity +
          (item.requiresPrint ? (item.printCost || 0) * item.quantity : 0);
        return acc + itemTotal;
      }, 0);

      const isStorePickup =
        data.isStorePickup !== undefined ? data.isStorePickup : order.isStorePickup;
      const deliveryCharge = isStorePickup
        ? data.deliveryCharge !== undefined
          ? data.deliveryCharge
          : order.deliveryCharge
        : data.district === "Dhaka"
        ? deliverySettings.insideDhaka
        : data.district === "Self Pickup"
        ? 0
        : deliverySettings.outsideDhaka;

      const newTotalAmount = subtotal + deliveryCharge - data.discountAmount;

      await tx.order.update({
        where: { id },
        data: {
          customerName: data.customerName,
          phone: data.phone,
          district: data.district,
          address: data.address,
          advancePaid: data.advancePaid,
          discountAmount: data.discountAmount,
          totalAmount: newTotalAmount,
          deliveryCharge: deliveryCharge,
          isStorePickup: isStorePickup,
          pathaoCityId: data.pathaoCityId,
          pathaoZoneId: data.pathaoZoneId,
          pathaoAreaId: data.pathaoAreaId,
          tags: data.tags,
        },
      });

      const existingTx = await tx.transaction.findFirst({
        where: { referenceId: id, referenceType: "ORDER" },
      });
      if (existingTx) {
        await tx.transaction.update({
          where: { id: existingTx.id },
          data: { amount: newTotalAmount },
        });

        const journalEntry = await tx.journalEntry.findFirst({
          where: { referenceId: id, referenceType: "ORDER" },
          include: { lines: true },
        });
        if (journalEntry) {
          for (const line of journalEntry.lines) {
            await tx.journalLine.update({
              where: { id: line.id },
              data: { amount: newTotalAmount },
            });
          }
        }
      }
    });

    revalidatePath("/admin/orders");
    revalidatePath(`/admin/orders/${id}`);
    return { success: true };
  } catch (error: any) {
    console.error("Update order error:", error);
    return { success: false, error: error.message };
  }
}

export const updateOrderDetails = withAuditLog(_updateOrderDetails, {
  entityType: "Order",
  action: "UPDATE",
  getEntityId: (args) => args[0],
  fetchBefore: (id) => prisma.order.findUnique({ where: { id }, include: { items: true } }),
  fetchAfter: (id) => prisma.order.findUnique({ where: { id }, include: { items: true } }),
  describe: (args) => `Updated order details for ${args[0]}`,
});

async function _updateOrderRemark(orderId: string, remarks: string) {
  try {
    await prisma.order.update({ where: { id: orderId }, data: { remarks } });
    revalidatePath("/admin/orders");
    revalidatePath(`/admin/orders/${orderId}`);
    return { success: true };
  } catch (error: any) {
    console.error("Update order remark error:", error);
    return { success: false, error: error.message };
  }
}

export const updateOrderRemark = withAuditLog(_updateOrderRemark, {
  entityType: "Order",
  action: "UPDATE",
  getEntityId: (args) => args[0],
  fetchBefore: (id) =>
    prisma.order.findUnique({ where: { id }, select: { id: true, remarks: true } }),
  fetchAfter: (id) =>
    prisma.order.findUnique({ where: { id }, select: { id: true, remarks: true } }),
  describe: (args) => `Updated order remark for ${args[0]}`,
});

// ─── CREATE ORDERS ────────────────────────────────────────────────────────────

async function _createAdminOrder(data: {
  customerName: string;
  phone: string;
  district: string;
  address: string;
  items: {
    productId: string;
    size: string;
    quantity: number;
    price: number;
    requiresPrint?: boolean;
    printName?: string;
    printNumber?: string;
    printCost?: number;
    printDetails?: { name: string; number: string }[];
  }[];
  totalAmount: number;
  advancePaid: number;
  discountAmount: number;
  remarks?: string;
  pathaoCityId?: number;
  pathaoZoneId?: number;
  pathaoAreaId?: number;
  hasBackorderItems?: boolean;
  isStorePickup?: boolean;
  deliveryCharge?: number;
  isExchange?: boolean;
  exchangeRefOrderId?: string;
  exchangeItemNote?: string;
  tags?: string[];
}) {
  try {
    const session = await getSession();
    const createdById = session?.userId || null;
    let commissionRate: number | null = null;
    if (createdById) {
      const staff = await prisma.staff.findUnique({ where: { id: createdById }, select: { id: true } });
      if (staff) {
        commissionRate = await getEffectiveCommissionRate(staff.id);
      }
    }

    const order = await prisma.$transaction(async (tx) => {
      const customId = await generateOrderId(tx);

      const phone = data.phone ? normalizePhone(data.phone) : undefined;
      let customerId: string | null = null;
      if (phone) {
        let customer = await tx.customer.findUnique({ where: { phone } });
        if (!customer) {
          customer = await tx.customer.create({
            data: {
              phone,
              name: data.customerName?.trim() || `Customer ${phone}`,
              address: data.address?.trim() || null,
            },
          });
        } else {
          const nameToUse = data.customerName?.trim();
          const addressToUse = data.address?.trim();
          if (
            (nameToUse && nameToUse !== customer.name) ||
            (addressToUse && addressToUse !== customer.address)
          ) {
            customer = await tx.customer.update({
              where: { phone },
              data: {
                name: nameToUse || customer.name,
                address: addressToUse || customer.address,
              },
            });
          }
        }
        customerId = customer.id;
      }

      const newOrder = await tx.order.create({
        data: {
          id: customId,
          customerName: data.customerName,
          phone: data.phone,
          district: data.district,
          address: data.address,
          totalAmount: data.totalAmount,
          advancePaid: data.advancePaid,
          discountAmount: data.discountAmount,
          remarks: data.remarks,
          pathaoCityId: data.pathaoCityId,
          pathaoZoneId: data.pathaoZoneId,
          pathaoAreaId: data.pathaoAreaId,
          isStorePickup: data.isStorePickup ?? false,
          deliveryCharge: data.deliveryCharge ?? 0,
          isExchange: data.isExchange ?? false,
          exchangeRefOrderId: data.exchangeRefOrderId || null,
          exchangeItemNote: data.exchangeItemNote || null,
          status: "PENDING",
          orderSource: "Salesman",
          createdById,
          commissionRate,
          customerId,
          tags: data.tags || [],
          items: {
            create: data.items.flatMap((item) => {
              if (item.requiresPrint && item.printDetails && item.printDetails.length > 0) {
                const printedItems = item.printDetails.map((pd) => ({
                  productId: item.productId,
                  size: item.size,
                  quantity: 1,
                  price: item.price,
                  requiresPrint: true,
                  printName: pd.name,
                  printNumber: pd.number,
                  printCost: item.printCost || 0,
                }));
                const remainingQty = item.quantity - item.printDetails.length;
                if (remainingQty > 0) {
                  printedItems.push({
                    productId: item.productId,
                    size: item.size,
                    quantity: remainingQty,
                    price: item.price,
                    requiresPrint: false,
                    printName: null,
                    printNumber: null,
                    printCost: 0,
                  });
                }
                return printedItems;
              } else {
                return [
                  {
                    productId: item.productId,
                    size: item.size,
                    quantity: item.quantity,
                    price: item.price,
                    requiresPrint: item.requiresPrint || false,
                    printName: item.printName || null,
                    printNumber: item.printNumber || null,
                    printCost: item.printCost || 0,
                  },
                ];
              }
            }),
          },
        },
      });

      return newOrder;
    });

    revalidatePath("/admin/orders");
    revalidatePath("/admin/products");
    return { success: true, orderId: order.id };
  } catch (error: any) {
    console.error("Create admin order error:", error);
    return { success: false, error: error.message || "Failed to create order." };
  }
}

export const createAdminOrder = withAuditLog(_createAdminOrder, {
  entityType: "Order",
  action: "CREATE",
  getEntityId: () => null,
  getEntityIdFromResult: (r: any) => r?.orderId ?? null,
  fetchAfter: (id) =>
    prisma.order.findUnique({ where: { id }, include: { items: true } }),
  describe: (args) =>
    `Created admin order for "${args[0].customerName}" (৳${args[0].totalAmount})`,
});

async function _createExchangeOrder(data: {
  customerName: string;
  phone: string;
  district: string;
  address: string;
  totalAmount: number;
  advancePaid: number;
  discountAmount: number;
  remarks?: string;
  pathaoCityId?: number;
  pathaoZoneId?: number;
  pathaoAreaId?: number;
  isStorePickup?: boolean;
  deliveryCharge?: number;
  items: any[];
  exchangeRefOrderId: string;
  exchangeItemNote: string;
  tags?: string[];
}) {
  if (data.exchangeRefOrderId) {
    const refOrder = await prisma.order.findUnique({
      where: { id: data.exchangeRefOrderId },
    });
    if (!refOrder) {
      return { success: false, error: "Reference order for exchange not found." };
    }
    if (!["DELIVERED", "RETURNED"].includes(refOrder.status)) {
      return {
        success: false,
        error: `Exchange can only be created for DELIVERED or RETURNED orders. Current status: ${refOrder.status}`,
      };
    }
  }
  return _createAdminOrder({ ...data, isExchange: true });
}

export const createExchangeOrder = withAuditLog(_createExchangeOrder, {
  entityType: "Order",
  action: "CREATE",
  getEntityId: () => null,
  getEntityIdFromResult: (r: any) => r?.orderId ?? null,
  fetchAfter: (id) =>
    prisma.order.findUnique({ where: { id }, include: { items: true } }),
  describe: (args) =>
    `Created exchange order for "${args[0].customerName}" (Ref: ${args[0].exchangeRefOrderId}, ৳${args[0].totalAmount})`,
});

// ─── PATHAO ───────────────────────────────────────────────────────────────────

export async function bulkSendToPathaoAction(orderIds: string[]) {
  try {
    const stores = await pathaoClient.getStores();
    if (stores.length === 0) {
      throw new Error(
        "No Pathao stores found. Please create a store in Pathao Merchant Panel first."
      );
    }
    const storeId = stores[0].store_id;

    const orders = await prisma.order.findMany({
      where: { id: { in: orderIds } },
      include: { items: { include: { product: true } } },
    });

    let successCount = 0;
    const errors: string[] = [];

    const sanitizePhone = (phone: string): string => {
      let p = phone.trim();
      if (p.startsWith("+88")) p = p.slice(3);
      else if (p.startsWith("88") && p.length > 11) p = p.slice(2);
      return p;
    };

    for (const order of orders) {
      if (order.pathaoConsignmentId) continue;
      if (order.status !== "PACKAGING") {
        errors.push(`${order.id}: Order must be in PACKAGING status.`);
        continue;
      }

      try {
        const collectionAmount = Math.max(0, order.totalAmount - (order.advancePaid || 0));
        const totalQuantity = order.items.reduce((sum, i) => sum + i.quantity, 0);

        const payload = {
          store_id: storeId,
          merchant_order_id: order.id,
          recipient_name: order.customerName,
          recipient_phone: sanitizePhone(order.phone),
          recipient_address: order.address,
          recipient_city: order.pathaoCityId || undefined,
          recipient_zone: order.pathaoZoneId || undefined,
          recipient_area: order.pathaoAreaId || undefined,
          delivery_type: 48,
          item_type: 2,
          item_quantity: totalQuantity,
          item_weight: 0.5,
          amount_to_collect: collectionAmount,
          item_description: order.items
            .map(
              (i) =>
                `• ${i.product.name} (Size: ${i.size}, Qty: ${i.quantity})`
            )
            .join("\n"),
        };

        const res = await pathaoClient.createOrder(payload);

        if (res.consignment_id) {
          const orderBefore = await prisma.order.findUnique({
            where: { id: order.id },
            include: { items: true },
          });

          const updatedOrder = await prisma.order.update({
            where: { id: order.id },
            data: { pathaoConsignmentId: res.consignment_id, status: "SHIPPED" },
            include: { items: true },
          });

          const auditContext = await getAuditContext();
          if (auditContext) {
            logActivity({
              userId: auditContext.userId,
              userEmail: auditContext.userEmail,
              userRole: auditContext.userRole,
              action: "UPDATE",
              entityType: "Order",
              entityId: order.id,
              description: `Pathao pickup requested for order ${order.id} (Consignment: ${res.consignment_id}) — status set to SHIPPED`,
              dataBefore: orderBefore as any,
              dataAfter: updatedOrder as any,
              changedFields: ["pathaoConsignmentId", "status"],
              ipAddress: auditContext.ipAddress,
              userAgent: auditContext.userAgent,
            });
          }

          successCount++;
        }
      } catch (err: any) {
        console.error(`Failed to send order ${order.id} to Pathao:`, err);
        errors.push(`${order.id}: ${err.message}`);
      }
    }

    revalidatePath("/admin/orders");

    if (errors.length > 0 && successCount === 0) {
      return {
        success: false,
        error: `Failed to send orders: ${errors.join(", ")}`,
      };
    }

    return {
      success: true,
      message: `${successCount} orders sent to Pathao successfully.${errors.length > 0 ? ` Note: ${errors.length} failed.` : ""}`,
    };
  } catch (error: any) {
    console.error("Bulk Pathao action error:", error);
    return {
      success: false,
      error: error.message || "Failed to process bulk Pathao request.",
    };
  }
}

export async function cancelPathaoPickupAction(orderId: string) {
  try {
    const order = await prisma.order.findUnique({ where: { id: orderId } });
    if (!order) return { success: false, error: "Order not found" };
    if (!order.pathaoConsignmentId)
      return { success: false, error: "No Pathao pickup to cancel" };

    await prisma.order.update({
      where: { id: orderId },
      data: { pathaoConsignmentId: null },
    });

    revalidatePath("/admin/orders");
    return {
      success: true,
      warning:
        "Consignment ID cleared from system. Please also cancel this order manually from Pathao Merchant Panel.",
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function sendPathaoPickupManually(orderId: string) {
  try {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { items: { include: { product: true } } },
    });
    if (!order) return { success: false, error: "Order not found" };
    if (order.pathaoConsignmentId)
      return { success: false, error: "Pickup already requested" };
    if (order.status !== "PACKAGING")
      return { success: false, error: "Order must be in Packaged status" };

    const stores = await pathaoClient.getStores();
    if (stores.length === 0) return { success: false, error: "No Pathao stores found" };
    const storeId = stores[0].store_id;

    const sanitizePhone = (phone: string): string => {
      let p = phone.trim();
      if (p.startsWith("+88")) p = p.slice(3);
      else if (p.startsWith("88") && p.length > 11) p = p.slice(2);
      return p;
    };

    const totalQuantity = order.items.reduce((sum, i) => sum + i.quantity, 0);
    const collectionAmount = Math.max(0, order.totalAmount - (order.advancePaid || 0));

    const payload = {
      store_id: storeId,
      merchant_order_id: order.id,
      recipient_name: order.customerName,
      recipient_phone: sanitizePhone(order.phone),
      recipient_address: order.address,
      recipient_city: order.pathaoCityId || undefined,
      recipient_zone: order.pathaoZoneId || undefined,
      recipient_area: order.pathaoAreaId || undefined,
      delivery_type: 48,
      item_type: 2,
      item_quantity: totalQuantity,
      item_weight: 0.5,
      amount_to_collect: collectionAmount,
      item_description: order.items
        .map((i) => `${i.product?.name || "Item"} (Size: ${i.size}, Qty: ${i.quantity})`)
        .join(", "),
    };

    const res = await pathaoClient.createOrder(payload);
    if (!res.consignment_id)
      return { success: false, error: "Pathao did not return a consignment ID" };

    await prisma.order.update({
      where: { id: orderId },
      data: { pathaoConsignmentId: res.consignment_id },
    });

    revalidatePath("/admin/orders");
    return { success: true, consignmentId: res.consignment_id };
  } catch (error: any) {
    console.error("Manual Pathao send error:", error);
    return { success: false, error: error.message };
  }
}

// ─── SALES RETURNS ────────────────────────────────────────────────────────────

async function _processSalesReturn(data: {
  orderId: string;
  orderItemId: string;
  returnReason: string;
  deliveryLossAmount?: number;
  returnActionType: ReturnStatus;
  returnCost?: number;
  returnCostPaid?: boolean;
  quantity?: number;
}) {
  try {
    const { orderId, orderItemId, returnReason, deliveryLossAmount, returnActionType, quantity } =
      data;

    const result = await prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({
        where: { id: orderId },
        select: { status: true },
      });
      if (!order) throw new Error("Order not found");
      if (["RETURNED", "CANCELLED"].includes(order.status)) {
        throw new Error(`Cannot process a return for a ${order.status} order.`);
      }

      const orderItem = await tx.orderItem.findUnique({
        where: { id: orderItemId },
        include: { product: true },
      });
      if (!orderItem) throw new Error("Order item not found");
      if (orderItem.orderId !== orderId) {
        throw new Error("Order ID mismatch for the specified order item");
      }

      const existingReturns = await tx.salesReturn.findMany({
        where: { orderItemId },
        select: { quantity: true },
      });
      const alreadyReturnedQty = existingReturns.reduce((sum, r) => sum + r.quantity, 0);
      const remainingQty = orderItem.quantity - alreadyReturnedQty;
      const returnQty = quantity ?? remainingQty;

      if (returnQty <= 0) throw new Error("Return quantity must be greater than zero");
      if (returnQty > remainingQty) {
        throw new Error(`Cannot return ${returnQty} items. Only ${remainingQty} remaining.`);
      }

      const variant = await tx.productVariant.findUnique({
        where: {
          productId_size_color: {
            productId: orderItem.productId,
            size: orderItem.size,
            color: (orderItem as any).color || "Default",
          },
        },
      });
      if (!variant) throw new Error("Product variant not found");

      const status: ReturnStatus = returnActionType;
      const deliveryLoss = deliveryLossAmount ?? 0;
      let productLoss = 0;
      let printingLoss = 0;

      if (status === "WASTAGE") {
        const purchasePrice = orderItem.product.purchasePrice ?? orderItem.product.price;
        productLoss = purchasePrice * returnQty;
        printingLoss = orderItem.printCost * returnQty;
      }

      const totalLoss = deliveryLoss + productLoss + printingLoss;

      if (status === "RESTOCKED") {
        const previousQuantity = variant.stock;
        const newQuantity = previousQuantity + returnQty;
        await tx.productVariant.update({
          where: { id: variant.id },
          data: { stock: newQuantity },
        });
        await tx.stockAdjustment.create({
          data: {
            variantId: variant.id,
            adjustmentType: "ADDITION",
            quantity: returnQty,
            previousQuantity,
            newQuantity,
            reason: `Sales Return Restock (Order: ${orderId})`,
          },
        });
      }

      if (totalLoss > 0) {
        const account = await getOrCreateSystemAccount(tx, "Returns & Wastage Loss", "EXPENSE");
        await createDoubleEntryJournal(tx, {
          accountId: account.id,
          amount: totalLoss,
          date: new Date(),
          type: "DEBIT",
          description: `Loss on return for Order Item ${orderItemId} (Order: ${orderId}). Status: ${status}.`,
          referenceId: orderId,
          referenceType: "ORDER",
        });
      }

      const allExistingReturns = await tx.salesReturn.findMany({
        where: { orderId },
        select: { quantity: true },
      });
      const totalReturnedQty =
        allExistingReturns.reduce((sum, r) => sum + r.quantity, 0) + returnQty;
      const orderItems = await tx.orderItem.findMany({
        where: { orderId },
        select: { quantity: true },
      });
      const totalOrderQty = orderItems.reduce((sum, i) => sum + i.quantity, 0);

      if (totalReturnedQty >= totalOrderQty) {
        await tx.order.update({ where: { id: orderId }, data: { status: "RETURNED" } });
      }

      const salesReturn = await tx.salesReturn.create({
        data: {
          orderId,
          orderItemId,
          variantId: variant.id,
          quantity: returnQty,
          returnReason,
          status,
          deliveryLoss,
          productLoss,
          printingLoss,
          returnCost: data.returnCost ?? 0,
          returnCostPaid: data.returnCostPaid ?? false,
        },
        include: {
          order: true,
          orderItem: { include: { product: true } },
          variant: true,
        },
      });

      return salesReturn;
    });

    revalidatePath("/admin/orders");
    revalidatePath("/admin/orders/returns");
    revalidatePath("/admin/inventory");
    revalidatePath("/admin/inventory/adjustments");
    revalidatePath("/admin/accounting");
    return { success: true, data: result };
  } catch (error: any) {
    console.error("Process sales return error:", error);
    return { success: false, error: error.message || "Failed to process sales return" };
  }
}

export const processSalesReturn = withAuditLog(_processSalesReturn, {
  entityType: "SalesReturn",
  action: "CREATE",
  getEntityId: () => null,
  getEntityIdFromResult: (r: any) => r?.data?.id ?? null,
  fetchAfter: (id) =>
    prisma.salesReturn.findUnique({
      where: { id },
      include: { order: true, orderItem: true },
    }),
  describe: (args) =>
    `Processed sales return for item ${args[0].orderItemId} (Order: ${args[0].orderId}, Action: ${args[0].returnActionType})`,
});

async function _processFullSalesReturn(data: {
  orderId: string;
  deliveryLossAmount: number;
  returnReason: string;
  returnCost: number;
  returnCostPaid: boolean;
}) {
  try {
    const { orderId, deliveryLossAmount, returnReason, returnCost, returnCostPaid } = data;

    await prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({
        where: { id: orderId },
        include: { items: { include: { product: true } } },
      });
      if (!order) throw new Error("Order not found");
      if (order.items.length === 0) throw new Error("Order has no items");

      const itemCount = order.items.length;
      const deliveryLossPerItem = Number((deliveryLossAmount / itemCount).toFixed(2));
      let totalAccountingLoss = 0;

      for (const orderItem of order.items) {
        const variant = await tx.productVariant.findUnique({
          where: {
            productId_size_color: {
              productId: orderItem.productId,
              size: orderItem.size,
              color: (orderItem as any).color || "Default",
            },
          },
        });
        if (!variant) continue;

        const status: ReturnStatus = orderItem.requiresPrint ? "WASTAGE" : "RESTOCKED";
        const deliveryLoss = deliveryLossPerItem;
        let productLoss = 0;
        let printingLoss = 0;

        if (status === "WASTAGE") {
          const purchasePrice = orderItem.product.purchasePrice ?? orderItem.product.price;
          productLoss = purchasePrice * orderItem.quantity;
          printingLoss = orderItem.printCost * orderItem.quantity;
        }

        const itemLoss = deliveryLoss + productLoss + printingLoss;
        totalAccountingLoss += itemLoss;

        if (status === "RESTOCKED") {
          const previousQuantity = variant.stock;
          const newQuantity = previousQuantity + orderItem.quantity;
          await tx.productVariant.update({
            where: { id: variant.id },
            data: { stock: newQuantity },
          });
          await tx.stockAdjustment.create({
            data: {
              variantId: variant.id,
              adjustmentType: "ADDITION",
              quantity: orderItem.quantity,
              previousQuantity,
              newQuantity,
              reason: `Full Sales Return Restock (Order: ${orderId})`,
            },
          });
        }

        await tx.salesReturn.create({
          data: {
            orderId,
            orderItemId: orderItem.id,
            variantId: variant.id,
            quantity: orderItem.quantity,
            returnReason,
            status,
            deliveryLoss,
            productLoss,
            printingLoss,
            returnCost,
            returnCostPaid,
          },
        });
      }

      if (totalAccountingLoss > 0) {
        const account = await getOrCreateSystemAccount(tx, "Returns & Wastage Loss", "EXPENSE");
        await createDoubleEntryJournal(tx, {
          accountId: account.id,
          amount: totalAccountingLoss,
          date: new Date(),
          type: "DEBIT",
          description: `Full return loss for Order ${orderId}.`,
          referenceId: orderId,
          referenceType: "ORDER",
        });
      }

      await tx.order.update({ where: { id: orderId }, data: { status: "RETURNED" } });
    });

    revalidatePath("/admin/orders");
    revalidatePath("/admin/orders/returns");
    return { success: true };
  } catch (error: any) {
    console.error("Full return error:", error);
    return { success: false, error: error.message };
  }
}

export const processFullSalesReturn = withAuditLog(_processFullSalesReturn, {
  entityType: "SalesReturn",
  action: "CREATE",
  getEntityId: () => null,
  getEntityIdFromResult: () => null,
  describe: (args) => `Processed FULL sales return for Order ${args[0].orderId}`,
});

// ─── ORDER QUERIES ────────────────────────────────────────────────────────────

export async function getRecentSalesReturns() {
  try {
    return await prisma.salesReturn.findMany({
      include: {
        order: { select: { id: true, customerName: true } },
        orderItem: { include: { product: { select: { name: true } } } },
        variant: { select: { size: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
  } catch (error: any) {
    console.error("Get recent sales returns error:", error);
    return [];
  }
}

export async function getOrderById(id: string) {
  try {
    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            product: {
              select: { name: true, price: true, purchasePrice: true, images: true },
            },
          },
        },
        salesReturns: { select: { orderItemId: true, quantity: true } },
        exchangeOrders: { select: { id: true } },
      },
    });
    return { success: true, data: order };
  } catch (error: any) {
    console.error("Get order by ID error:", error);
    return { success: false, error: error.message || "Failed to fetch order." };
  }
}

export async function searchOrdersForReturn(searchQuery: string) {
  try {
    const trimmed = searchQuery.trim();
    if (!trimmed) return { success: true, data: [] };

    const orders = await prisma.order.findMany({
      where: {
        OR: [
          { id: { contains: trimmed, mode: "insensitive" } },
          { phone: { contains: trimmed, mode: "insensitive" } },
          { customerName: { contains: trimmed, mode: "insensitive" } },
        ],
      },
      include: {
        items: {
          include: {
            product: {
              select: { name: true, price: true, purchasePrice: true, images: true },
            },
          },
        },
        salesReturns: { select: { orderItemId: true, quantity: true } },
        exchangeOrders: { select: { id: true } },
      },
      take: 10,
    });

    return { success: true, data: orders };
  } catch (error: any) {
    console.error("Search orders for return error:", error);
    return { success: false, error: error.message || "Failed to search orders." };
  }
}
