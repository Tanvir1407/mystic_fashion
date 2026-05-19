"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import { OrderStatus, AdjustmentType, ReturnStatus } from "@/generated/prisma/client";
import { revalidatePath } from "next/cache";
import { writeFile, mkdir } from "fs/promises";
import { join, dirname } from "path";
import { pathaoClient } from "@/lib/pathao/PathaoClient";

async function getOrCreateSystemAccount(tx: any, name: string, type: "INCOME" | "EXPENSE") {
  let account = await tx.chartOfAccount.findUnique({ where: { name } });
  if (!account) {
    account = await tx.chartOfAccount.create({
      data: { name, type, status: "ACTIVE" },
    });
  }
  return account;
}

import { createSession, destroySession, getSession } from "@/lib/auth";
import { getRedirectUrlForSession } from "@/lib/permissions";

export async function adminLogin(email: string, password: string) {
  try {
    const staff = await prisma.staff.findUnique({
      where: { email },
      include: {
        role: {
          include: { permissions: true }
        }
      }
    });

    if (staff && staff.password === password) {
      if (!staff.role) {
        return { success: false, error: "Access denied: No role assigned." };
      }

      const sessionPayload = {
        userId: staff.id,
        roleName: staff.role.name,
        permissions: staff.role.name === "SUPERADMIN" ? [] : staff.role.permissions.map(p => ({
          action: p.action,
          subject: p.subject
        }))
      };

      const token = await createSession(sessionPayload);
      const redirectUrl = getRedirectUrlForSession(sessionPayload);

      return { success: true, token, redirectUrl };
    } else {
      return { success: false, error: "Invalid email or password" };
    }
  } catch (error: any) {
    console.error("Error in adminLogin:", error);
    return { success: false, error: error instanceof Error ? error.message : "An unexpected error occurred." };
  }
}

export async function adminLogout() {
  await destroySession();
  redirect("/admin/login");
}

export async function createProduct(data: {
  name: string;
  description: string;
  price: number;
  images: string[];
  team?: string;
  category: string;
  brandId?: string | null;
  categoryId?: string | null;
  subcategoryId?: string | null;
  sizeChartId?: string | null;
  discountId?: string | null;
  isFeatured: boolean;
  isPublished: boolean;
  isCustomize?: boolean | null;
  variants: { size: string; color: string; colorCode?: string; sku?: string; stock: number }[];
}) {
  try {
    const product = await prisma.product.create({
      data: {
        name: data.name,
        description: data.description,
        price: data.price,
        images: data.images,
        team: data.team,
        category: data.category,
        brandId: data.brandId || null,
        categoryId: data.categoryId || null,
        subcategoryId: data.subcategoryId || null,
        isFeatured: data.isFeatured,
        isPublished: data.isPublished,
        isCustomize: data.isCustomize ?? false,
        sizeChartId: data.sizeChartId || null,
        discountId: data.discountId || null,
        variants: {
          create: data.variants.map((v, idx) => ({
            size: v.size,
            color: v.color,
            colorCode: v.colorCode,
            sku: v.sku,
            stock: v.stock,
            order: idx,
          })),
        },
      },
    });

    revalidatePath("/admin/products");
    revalidatePath("/");
    revalidatePath("/product/[id]", "page");
    redirect("/admin/products");
    return { success: true, data: product };
  } catch (error: any) {
    if (error.message === 'NEXT_REDIRECT' || error.digest?.startsWith('NEXT_REDIRECT')) {
      throw error;
    }
    console.error("Error in createProduct:", error);
    return { success: false, error: error instanceof Error ? error.message : "An unexpected error occurred." };
  }
}

export async function updateProduct(id: string, data: {
  name: string;
  description: string;
  price: number;
  images: string[];
  team?: string;
  category: string;
  brandId?: string | null;
  categoryId?: string | null;
  subcategoryId?: string | null;
  sizeChartId?: string | null;
  discountId?: string | null;
  isFeatured: boolean;
  isPublished: boolean;
  isCustomize?: boolean | null;
  variants: { size: string; color: string; colorCode?: string; sku?: string; stock: number }[];
}) {
  try {
    const product = await prisma.product.update({
      where: { id },
      data: {
        name: data.name,
        description: data.description,
        price: data.price,
        images: data.images,
        team: data.team,
        category: data.category,
        brandId: data.brandId || null,
        categoryId: data.categoryId || null,
        subcategoryId: data.subcategoryId || null,
        isFeatured: data.isFeatured,
        isPublished: data.isPublished,
        isCustomize: data.isCustomize ?? false,
        sizeChartId: data.sizeChartId || null,
        discountId: data.discountId || null,
      },
    });

    const upsertedVariants = await prisma.$transaction(
      data.variants.map((v, idx) =>
        prisma.productVariant.upsert({
          where: { productId_size_color: { productId: id, size: v.size, color: v.color } },
          update: { sku: v.sku, stock: v.stock, order: idx, colorCode: v.colorCode },
          create: { productId: id, size: v.size, color: v.color, colorCode: v.colorCode, sku: v.sku, stock: v.stock, order: idx },
        })
      )
    );

    const keptVariantIds = upsertedVariants.map(v => v.id);

    await prisma.productVariant.deleteMany({
      where: {
        productId: id,
        id: { notIn: keptVariantIds },
      },
    });

    revalidatePath("/admin/products");
    revalidatePath(`/admin/products/${id}`);
    revalidatePath("/");
    revalidatePath(`/product/${id}`);
    revalidatePath("/product/[id]", "page");
    redirect("/admin/products");
    return { success: true, data: product };
  } catch (error: any) {
    if (error.message === 'NEXT_REDIRECT' || error.digest?.startsWith('NEXT_REDIRECT')) {
      throw error;
    }
    console.error("Error in updateProduct:", error);
    return { success: false, error: error instanceof Error ? error.message : "An unexpected error occurred." };
  }
}

export async function deleteProduct(id: string) {
  try {
    const product = await prisma.product.delete({
      where: { id },
    });
    revalidatePath("/admin/products");
    return { success: true, data: product };
  } catch (error: any) {
    console.error("Error in deleteProduct:", error);
    return { success: false, error: error instanceof Error ? error.message : "An unexpected error occurred." };
  }
}

export async function updateOrderStatus(orderId: string, status: OrderStatus) {
  try {
    await prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({
        where: { id: orderId },
        include: { items: true },
      });

      if (!order) throw new Error("Order not found");

      const oldStatus = order.status;
      const newStatus = status;

      // If already the same status, do nothing
      if (oldStatus === newStatus) return;

      // Define Active States
      const activeStatuses: OrderStatus[] = ["CONFIRMED", "PACKAGING", "SHIPPED", "DELIVERED"];
      const isActive = (s: OrderStatus) => activeStatuses.includes(s);

      // Rule 2: Once an order status has moved away from 'Pending', it should be impossible to set it back to 'Pending'
      if (oldStatus !== "PENDING" && newStatus === "PENDING") {
        throw new Error("Cannot revert order status back to Pending once it has been processed.");
      }

      // Execute Stock Action: Stock is deducted ONLY when the order transitions to SHIPPED for the first time
      if (newStatus === "SHIPPED" && oldStatus !== "SHIPPED") {
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

      // Update the order status
      await tx.order.update({
        where: { id: orderId },
        data: { status: newStatus },
      });

      // --- AUTO ACCOUNTING LOGIC ---
      if (oldStatus === "PENDING" && newStatus === "CONFIRMED") {
        const account = await getOrCreateSystemAccount(tx, "Sales Revenue", "INCOME");
        await tx.transaction.create({
          data: {
            accountId: account.id,
            amount: order.totalAmount,
            date: new Date(),
            type: "CREDIT",
            description: `Order confirmation sale for ${order.id}`,
            referenceId: order.id,
            referenceType: "ORDER",
          }
        });
      }

      if (isActive(oldStatus) && newStatus === "CANCELLED") {
        const account = await getOrCreateSystemAccount(tx, "Sales Refunds", "EXPENSE");
        await tx.transaction.create({
          data: {
            accountId: account.id,
            amount: order.totalAmount,
            date: new Date(),
            type: "DEBIT",
            description: `Order cancellation refund for ${order.id}`,
            referenceId: order.id,
            referenceType: "ORDER",
          }
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

export async function bulkUpdateOrderStatus(orderIds: string[], status: OrderStatus) {
  const results = [];
  for (const id of orderIds) {
    const res = await updateOrderStatus(id, status);
    results.push(res);
  }
  return results;
}

export async function deleteOrder(id: string) {
  try {
    await prisma.$transaction(async (tx) => {
      await tx.orderItem.deleteMany({
        where: { orderId: id },
      });
      await tx.order.delete({
        where: { id },
      });
    });
    revalidatePath("/admin/orders");
    return { success: true };
  } catch (error: any) {
    console.error("Delete order error:", error);
    return { success: false, error: error.message };
  }
}

export async function bulkDeleteOrders(orderIds: string[]) {
  try {
    await prisma.$transaction(async (tx) => {
      await tx.orderItem.deleteMany({
        where: { orderId: { in: orderIds } },
      });
      await tx.order.deleteMany({
        where: { id: { in: orderIds } },
      });
    });
    revalidatePath("/admin/orders");
    return { success: true };
  } catch (error: any) {
    console.error("Bulk delete orders error:", error);
    return { success: false, error: error.message };
  }
}

export async function updateOrderDetails(id: string, data: {
  customerName: string;
  phone: string;
  district: string;
  address: string;
  advancePaid: number;
  discountAmount: number;
  pathaoCityId?: number;
  pathaoZoneId?: number;
  pathaoAreaId?: number;
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
}) {
  try {
    await prisma.$transaction(async (tx) => {
      // 1. Fetch current order items and delivery settings
      const order = await tx.order.findUnique({
        where: { id },
        include: { items: true },
      });

      if (!order) throw new Error("Order not found");

      // Handle items update and stock adjustment
      if (data.items) {
        const oldItemsMap = new Map(order.items.map(i => [i.id, i]));

        for (const newItem of data.items) {
          const oldItem = oldItemsMap.get(newItem.id);
          if (oldItem) {
            // Determine if quantity changed on exact size
            const diff = newItem.quantity - oldItem.quantity;
            if (diff !== 0) {
              await tx.productVariant.update({
                where: { productId_size_color: { productId: newItem.productId, size: newItem.size, color: (newItem as any).color || "Default" } },
                data: { stock: { decrement: diff } } // If increased (diff > 0), decrement stock
              });
            }
            oldItemsMap.delete(newItem.id);
          } else {
            // New Item added
            await tx.productVariant.update({
              where: { productId_size_color: { productId: newItem.productId, size: newItem.size, color: (newItem as any).color || "Default" } },
              data: { stock: { decrement: newItem.quantity } }
            });
          }
        }

        // Remaining items in oldItemsMap are deleted items
        for (const remainingOld of oldItemsMap.values()) {
          await tx.productVariant.update({
            where: { productId_size_color: { productId: remainingOld.productId, size: remainingOld.size, color: (remainingOld as any).color || "Default" } },
            data: { stock: { increment: remainingOld.quantity } }
          });
        }

        // Wipe old items and create new ones
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
            }
          });
        }
      }

      const activeItems = data.items || order.items;

      const deliverySettings = await tx.deliverySetting.upsert({
        where: { id: "default" },
        update: {},
        create: { id: "default", insideDhaka: 70, outsideDhaka: 120 },
      });

      // 2. Calculate Subtotal (Base + Print Costs)
      const subtotal = activeItems.reduce((acc, item) => {
        const itemTotal = (item.price * item.quantity) + (item.requiresPrint ? (item.printCost || 0) * item.quantity : 0);
        return acc + itemTotal;
      }, 0);

      // 3. Determine Delivery Charge base on NEW district
      const deliveryCharge = data.district === "Dhaka"
        ? deliverySettings.insideDhaka
        : data.district === "Self Pickup"
          ? 0
          : deliverySettings.outsideDhaka;

      // 4. Calculate Final Total
      const newTotalAmount = (subtotal + deliveryCharge) - data.discountAmount;

      // 5. Update Record
      await tx.order.update({
        where: { id },
        data: {
          customerName: data.customerName,
          phone: data.phone,
          district: data.district,
          address: data.address,
          advancePaid: data.advancePaid,
          discountAmount: data.discountAmount,
          totalAmount: newTotalAmount, // Explicitly saved
          pathaoCityId: data.pathaoCityId,
          pathaoZoneId: data.pathaoZoneId,
          pathaoAreaId: data.pathaoAreaId,
        },
      });

      // 6. Automatically update Accounting Ledger (since totalAmount may have shifted)
      // Only updates if the transaction had already been created (e.g. order moved past PENDING)
      const existingTx = await tx.transaction.findFirst({
        where: { referenceId: id, referenceType: "ORDER" }
      });
      if (existingTx) {
        await tx.transaction.update({
          where: { id: existingTx.id },
          data: { amount: newTotalAmount }
        });
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

export async function updateOrderRemark(orderId: string, remarks: string) {
  try {
    await prisma.order.update({
      where: { id: orderId },
      data: { remarks },
    });
    revalidatePath("/admin/orders");
    revalidatePath(`/admin/orders/${orderId}`);
    return { success: true };
  } catch (error: any) {
    console.error("Update order remark error:", error);
    return { success: false, error: error.message };
  }
}

export async function saveSizeChart(category: string, data: any) {
  try {
    const chart = await prisma.sizeChart.upsert({
      where: { category },
      update: { data },
      create: { category, data },
    });
    revalidatePath("/admin/size-charts");
    redirect("/admin/size-charts");
    return { success: true, data: chart };
  } catch (error: any) {
    if (error.message === 'NEXT_REDIRECT' || error.digest?.startsWith('NEXT_REDIRECT')) {
      throw error;
    }
    console.error("Error in saveSizeChart:", error);
    return { success: false, error: error instanceof Error ? error.message : "An unexpected error occurred." };
  }
}

export async function deleteSizeChart(id: string) {
  try {
    const chart = await prisma.sizeChart.delete({
      where: { id },
    });
    revalidatePath("/admin/size-charts");
    return { success: true, data: chart };
  } catch (error: any) {
    console.error("Error in deleteSizeChart:", error);
    return { success: false, error: error instanceof Error ? error.message : "An unexpected error occurred." };
  }
}

export async function createPurchase(
  supplierName: string,
  invoiceNumber: string,
  totalAmount: number,
  discountAmount: number,
  items: { productId: string; variantId: string; quantity: number; unitPrice: number }[]
) {
  try {
    const result = await prisma.$transaction(async (tx) => {
      const purchase = await tx.purchase.create({
        data: {
          supplierName,
          invoiceNumber,
          totalAmount,
          discountAmount,
          status: "COMPLETED", // Assuming immediate stock update on creation
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
        const productBefore = await tx.product.findUnique({
          where: { id: item.productId },
          include: { variants: true },
        });

        if (productBefore) {
          const oldTotalStock = productBefore.variants.reduce((sum: number, v: any) => sum + v.stock, 0);
          const oldAvgPrice = productBefore.purchasePrice || 0;

          await tx.productVariant.update({
            where: { id: item.variantId },
            data: { stock: { increment: item.quantity } },
          });

          let newAvgPrice = item.unitPrice;
          if (oldTotalStock > 0) {
            const oldTotalValue = oldTotalStock * oldAvgPrice;
            const newValueAdded = item.quantity * item.unitPrice;
            const newTotalStock = oldTotalStock + item.quantity;
            newAvgPrice = (oldTotalValue + newValueAdded) / newTotalStock;
          }

          await tx.product.update({
            where: { id: item.productId },
            data: { purchasePrice: newAvgPrice },
          });
        }
      }

      const account = await getOrCreateSystemAccount(tx, "Inventory Purchases", "EXPENSE");
      await tx.transaction.create({
        data: {
          accountId: account.id,
          amount: totalAmount,
          date: new Date(),
          type: "DEBIT",
          description: `Inventory purchase from ${supplierName}`,
          referenceId: purchase.id,
          referenceType: "PURCHASE",
        }
      });
      revalidatePath("/admin/accounting");
      return purchase;
    });

    revalidatePath("/admin/purchases");
    revalidatePath("/admin/products");
    redirect("/admin/purchases");
    return { success: true, data: result };
  } catch (error: any) {
    if (error.message === 'NEXT_REDIRECT' || error.digest?.startsWith('NEXT_REDIRECT')) {
      throw error;
    }
    console.error("Error in createPurchase:", error);
    return { success: false, error: error instanceof Error ? error.message : "An unexpected error occurred." };
  }
}

export async function updatePurchase(
  purchaseId: string,
  supplierName: string,
  invoiceNumber: string,
  totalAmount: number,
  discountAmount: number,
  items: { productId: string; variantId: string; quantity: number; unitPrice: number }[]
) {
  try {
    await prisma.$transaction(async (tx) => {
      // 1. Fetch existing purchase with its original items
      const existingPurchase = await tx.purchase.findUnique({
        where: { id: purchaseId },
        include: { items: true },
      });

      if (!existingPurchase) throw new Error("Purchase not found");

      // 2. Revert Old Items (Decrement Stock)
      for (const oldItem of existingPurchase.items) {
        await tx.productVariant.update({
          where: { id: oldItem.variantId },
          data: { stock: { decrement: oldItem.quantity } },
        });
      }

      // 3. Wipe old relational items
      await tx.purchaseItem.deleteMany({
        where: { purchaseId },
      });

      // 4. Update the Purchase record and recreate items
      await tx.purchase.update({
        where: { id: purchaseId },
        data: {
          supplierName,
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

      // 5. Apply New Items (Increment Stock and Update Product Price)
      for (const item of items) {
        const productBefore = await tx.product.findUnique({
          where: { id: item.productId },
          include: { variants: true },
        });

        if (productBefore) {
          const oldTotalStock = productBefore.variants.reduce((sum: number, v: any) => sum + v.stock, 0);
          const oldAvgPrice = productBefore.purchasePrice || 0;

          await tx.productVariant.update({
            where: { id: item.variantId },
            data: { stock: { increment: item.quantity } },
          });

          let newAvgPrice = item.unitPrice;
          if (oldTotalStock > 0) {
            const oldTotalValue = oldTotalStock * oldAvgPrice;
            const newValueAdded = item.quantity * item.unitPrice;
            const newTotalStock = oldTotalStock + item.quantity;
            newAvgPrice = (oldTotalValue + newValueAdded) / newTotalStock;
          }

          await tx.product.update({
            where: { id: item.productId },
            data: { purchasePrice: newAvgPrice },
          });
        }
      }

      // 6. Update Accounting Ledger seamlessly
      const existingTransaction = await tx.transaction.findFirst({
        where: { referenceId: purchaseId, referenceType: "PURCHASE" }
      });
      if (existingTransaction) {
        await tx.transaction.update({
          where: { id: existingTransaction.id },
          data: {
            amount: totalAmount,
            description: `Inventory purchase from ${supplierName} (Updated)`,
          }
        });
      } else {
        const account = await getOrCreateSystemAccount(tx, "Inventory Purchases", "EXPENSE");
        await tx.transaction.create({
          data: {
            accountId: account.id,
            amount: totalAmount,
            date: new Date(),
            type: "DEBIT",
            description: `Inventory purchase from ${supplierName} (Created via Update)`,
            referenceId: purchaseId,
            referenceType: "PURCHASE",
          }
        });
      }
    });

    revalidatePath("/admin/purchases");
    revalidatePath("/admin/products");
    revalidatePath("/admin/accounting");
  } catch (error: any) {
    console.error("Purchase update error:", error);
    return { success: false, error: error.message };
  }

  redirect("/admin/purchases");
}

export async function deletePurchase(id: string) {
  try {
    const purchase = await prisma.purchase.delete({ where: { id } });
    revalidatePath("/admin/purchases");
    return { success: true, data: purchase };
  } catch (error: any) {
    console.error("Error in deletePurchase:", error);
    return { success: false, error: error instanceof Error ? error.message : "An unexpected error occurred." };
  }
}

export async function updatePurchaseStatus(id: string, status: string) {
  try {
    const purchase = await prisma.purchase.update({
      where: { id },
      data: { status },
    });
    revalidatePath("/admin/purchases");
    return { success: true, data: purchase };
  } catch (error: any) {
    console.error("Error in updatePurchaseStatus:", error);
    return { success: false, error: error instanceof Error ? error.message : "An unexpected error occurred." };
  }
}

export async function uploadImage(formData: FormData) {
  const file = formData.get("file") as File;
  if (!file) throw new Error("No file received");

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  const uniqueName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;

  // Ensure the uploads directory exists
  const publicUploadsDir = join(process.cwd(), "public", "uploads");
  try { await mkdir(publicUploadsDir, { recursive: true }); } catch (e) { }

  const filePath = join(publicUploadsDir, uniqueName);
  await writeFile(filePath, buffer);

  return `/uploads/${uniqueName}`;
}

export async function getDeliverySettings() {
  return await prisma.deliverySetting.upsert({
    where: { id: "default" },
    update: {},
    create: { id: "default", insideDhaka: 70, outsideDhaka: 120 },
  });
}

export async function updateDeliverySettings(insideDhaka: number, outsideDhaka: number) {
  try {
    const settings = await prisma.deliverySetting.upsert({
      where: { id: "default" },
      update: { insideDhaka, outsideDhaka },
      create: { id: "default", insideDhaka, outsideDhaka },
    });
    revalidatePath("/admin/settings");
    revalidatePath("/");
    revalidatePath("/checkout");
    revalidatePath("/product/[id]", "page");
    return { success: true, data: settings };
  } catch (error: any) {
    console.error("Error in updateDeliverySettings:", error);
    return { success: false, error: error instanceof Error ? error.message : "An unexpected error occurred." };
  }
}

export async function getInventorySettings() {
  return await prisma.inventorySetting.upsert({
    where: { id: "default" },
    update: {},
    create: { id: "default", lowStockThreshold: 5 },
  });
}

export async function updateInventorySettings(lowStockThreshold: number) {
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
    return { success: false, error: error instanceof Error ? error.message : "An unexpected error occurred." };
  }
}

export async function getDTFPrintSetting() {
  return await prisma.dTFPrintSetting.upsert({
    where: { id: "default" },
    update: {},
    create: { id: "default", printCost: 300 },
  });
}

export async function updateDTFPrintSetting(printCost: number) {
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
    return { success: false, error: error instanceof Error ? error.message : "An unexpected error occurred." };
  }
}

export async function getLowStockProducts() {
  const setting = await getInventorySettings();
  const threshold = setting.lowStockThreshold;

  return await prisma.product.findMany({
    where: {
      variants: {
        some: {
          stock: {
            lte: threshold,
          },
        },
      },
    },
    include: {
      variants: true,
    },
    orderBy: {
      updatedAt: "desc",
    },
  });
}

export async function getProductsForOrder() {
  return await prisma.product.findMany({
    include: {
      variants: true,
      discount: true,
    },
    orderBy: { name: "asc" },
  });
}

async function generateOrderIdInternal(tx: any) {
  const now = new Date();
  const year = now.getFullYear().toString().slice(-2);
  const month = (now.getMonth() + 1).toString().padStart(2, '0');
  const date = now.getDate().toString().padStart(2, '0');
  const datePrefix = `MJEPE-${year}${month}${date}`;

  const lastOrder = await tx.order.findFirst({
    where: { id: { startsWith: datePrefix } },
    orderBy: { id: 'desc' },
    select: { id: true }
  });

  let nextNum = 1;
  if (lastOrder) {
    const lastNumStr = lastOrder.id.replace(datePrefix, "");
    nextNum = parseInt(lastNumStr) + 1;
  }
  return `${datePrefix}${nextNum.toString().padStart(2, '0')}`;
}

export async function createAdminOrder(data: {
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
}) {
  try {
    const session = await getSession();
    const createdById = session?.userId || null;

    const order = await prisma.$transaction(async (tx) => {
      const customId = await generateOrderIdInternal(tx);

      // 1. Determine order status
      // If any item is a backorder (out-of-stock), the order stays PENDING
      // until stock is replenished via a Purchase and admin manually confirms.
      const orderStatus = data.hasBackorderItems ? "PENDING" : "CONFIRMED";

      // 2. Create the order
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
          status: orderStatus,
          orderSource: "Salesman",
          createdById: createdById,
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
                return [{
                  productId: item.productId,
                  size: item.size,
                  quantity: item.quantity,
                  price: item.price,
                  requiresPrint: item.requiresPrint || false,
                  printName: item.printName || null,
                  printNumber: item.printNumber || null,
                  printCost: item.printCost || 0,
                }];
              }
            }),
          },
        },
      });

      // 3. Update stock for each item (allowed to go negative for backorders)
      for (const item of data.items) {
        await tx.productVariant.update({
          where: {
            productId_size_color: {
              productId: item.productId,
              size: item.size,
              color: (item as any).color || "Default"
            },
          },
          data: {
            stock: {
              decrement: item.quantity,
            },
          },
        });
      }

      // 4. Accounting Automation — only for CONFIRMED orders
      // PENDING (backorder) orders get the accounting entry when they are later confirmed.
      if (orderStatus === "CONFIRMED") {
        const account = await getOrCreateSystemAccount(tx, "Sales Revenue", "INCOME");
        await tx.transaction.create({
          data: {
            accountId: account.id,
            amount: data.totalAmount,
            date: new Date(),
            type: "CREDIT",
            description: `Order confirmation sale for ${newOrder.id}`,
            referenceId: newOrder.id,
            referenceType: "ORDER",
          }
        });
      }

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

export async function getPageBySlug(slug: string) {
  try {
    const page = await prisma.page.findUnique({
      where: { slug },
    });
    return { success: true, data: page };
  } catch (error: any) {
    console.error("Error in getPageBySlug:", error);
    return { success: false, error: error instanceof Error ? error.message : "An unexpected error occurred." };
  }
}

export async function updatePage(slug: string, data: { title: string; content: string }) {
  try {
    const page = await prisma.page.upsert({
      where: { slug },
      update: {
        title: data.title,
        content: data.content,
      },
      create: {
        slug,
        title: data.title,
        content: data.content,
      },
    });

    revalidatePath(`/${slug}`);
    revalidatePath(`/admin/pages/${slug}`);
    revalidatePath("/admin/pages");

    return { success: true, data: page };
  } catch (error: any) {
    console.error("Error in updatePage:", error);
    return { success: false, error: error instanceof Error ? error.message : "An unexpected error occurred." };
  }
}

export async function bulkSendToPathaoAction(orderIds: string[]) {
  try {
    const stores = await pathaoClient.getStores();
    if (stores.length === 0) {
      throw new Error("No Pathao stores found. Please create a store in Pathao Merchant Panel first.");
    }
    const storeId = stores[0].store_id;

    const orders = await prisma.order.findMany({
      where: { id: { in: orderIds } },
      include: {
        items: {
          include: {
            product: true,
          }
        }
      },
    });

    let successCount = 0;
    let errors: string[] = [];

    for (const order of orders) {
      // 1. Strict Status & Consignment Checks
      if (order.pathaoConsignmentId) continue;
      if (order.status !== "PACKAGING") {
        errors.push(`${order.id}: Order must be in PACKAGING status.`);
        continue;
      }

      // (Removed City Gatekeeping as per request)


      try {
        const collectionAmount = Math.max(0, order.totalAmount - (order.advancePaid || 0));

        const totalQuantity = order.items.reduce((sum, i) => sum + i.quantity, 0);

        // Sanitize phone: strip +88 or 88 prefix to get the 11-digit local number
        const sanitizePhone = (phone: string): string => {
          let p = phone.trim();
          if (p.startsWith("+88")) p = p.slice(3);
          else if (p.startsWith("88") && p.length > 11) p = p.slice(2);
          return p;
        };

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
          item_description: order.items.map(i => `• ${i.product.name} (Size: ${i.size}, Qty: ${i.quantity})`).join("\n"),
        };

        const res = await pathaoClient.createOrder(payload);

        if (res.consignment_id) {
          // 2. Simultaneous Database Update (ID + Status)
          await prisma.order.update({
            where: { id: order.id },
            data: {
              pathaoConsignmentId: res.consignment_id,
              status: "SHIPPED",
            }
          });
          successCount++;
        }
      } catch (err: any) {
        console.error(`Failed to send order ${order.id} to Pathao:`, err);
        errors.push(`${order.id}: ${err.message}`);
      }
    }

    revalidatePath("/admin/orders");

    if (errors.length > 0 && successCount === 0) {
      return { success: false, error: `Failed to send orders: ${errors.join(", ")}` };
    }

    return {
      success: true,
      message: `${successCount} orders sent to Pathao successfully.${errors.length > 0 ? ` Note: ${errors.length} failed.` : ""}`
    };
  } catch (error: any) {
    console.error("Bulk Pathao action error:", error);
    return { success: false, error: error.message || "Failed to process bulk Pathao request." };
  }
}

export async function adjustStock(data: {
  variantId: string;
  adjustmentType: AdjustmentType;
  quantity: number;
  reason?: string;
}) {
  try {
    const { variantId, adjustmentType, quantity, reason } = data;

    const result = await prisma.$transaction(async (tx) => {
      // 1. Fetch current variant to get previousQuantity
      const variant = await tx.productVariant.findUnique({
        where: { id: variantId },
        select: { stock: true, id: true },
      });

      if (!variant) throw new Error("Product variant not found");

      const previousQuantity = variant.stock;
      let newQuantity = previousQuantity;

      // 2. Calculate newQuantity
      if (adjustmentType === "ADDITION") {
        newQuantity = previousQuantity + quantity;
      } else if (adjustmentType === "SUBTRACTION") {
        newQuantity = previousQuantity - quantity;
      } else if (adjustmentType === "SET") {
        newQuantity = quantity;
      }

      // 3. Validation: Subtraction cannot result in negative stock
      if (adjustmentType === "SUBTRACTION" && newQuantity < 0) {
        throw new Error("Stock cannot go below zero");
      }

      // 4. Update variant stock
      await tx.productVariant.update({
        where: { id: variantId },
        data: { stock: newQuantity },
      });

      // 5. Create adjustment record
      const adjustment = await tx.stockAdjustment.create({
        data: {
          variantId,
          adjustmentType,
          quantity,
          previousQuantity,
          newQuantity,
          reason,
        },
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

export async function bulkAdjustStock(adjustments: {
  variantId: string;
  adjustmentType: AdjustmentType;
  quantity: number;
  reason?: string;
}[]) {
  try {
    const results = await prisma.$transaction(async (tx) => {
      const createdAdjustments = [];
      
      for (const adj of adjustments) {
        const { variantId, adjustmentType, quantity, reason } = adj;
        
        const variant = await tx.productVariant.findUnique({
          where: { id: variantId },
          select: { stock: true, id: true },
        });

        if (!variant) throw new Error(`Product variant not found: ${variantId}`);

        const previousQuantity = variant.stock;
        let newQuantity = previousQuantity;

        if (adjustmentType === "ADDITION") {
          newQuantity = previousQuantity + quantity;
        } else if (adjustmentType === "SUBTRACTION") {
          newQuantity = previousQuantity - quantity;
        } else if (adjustmentType === "SET") {
          newQuantity = quantity;
        }

        if (adjustmentType === "SUBTRACTION" && newQuantity < 0) {
          throw new Error(`Stock cannot go below zero for variant ${variantId}`);
        }

        await tx.productVariant.update({
          where: { id: variantId },
          data: { stock: newQuantity },
        });

        const adjustment = await tx.stockAdjustment.create({
          data: {
            variantId,
            adjustmentType,
            quantity,
            previousQuantity,
            newQuantity,
            reason,
          },
        });
        
        createdAdjustments.push(adjustment);
      }
      return createdAdjustments;
    });

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
      variant: {
        include: {
          product: {
            select: { name: true }
          }
        }
      }
    },
    orderBy: { createdAt: "desc" },
    take: 20,
  });
}

export async function processSalesReturn(data: {
  orderId: string;
  orderItemId: string;
  returnReason: string;
  deliveryLossAmount?: number;
  returnActionType: ReturnStatus;
}) {
  try {
    const { orderId, orderItemId, returnReason, deliveryLossAmount, returnActionType } = data;

    const result = await prisma.$transaction(async (tx) => {
      // 1. Fetch OrderItem and include Product
      const orderItem = await tx.orderItem.findUnique({
        where: { id: orderItemId },
        include: { product: true },
      });

      if (!orderItem) throw new Error("Order item not found");

      // Verify the orderId matches the item's orderId
      if (orderItem.orderId !== orderId) {
        throw new Error("Order ID mismatch for the specified order item");
      }

      // 2. Fetch ProductVariant using productId, size, and color
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

      // 3. Determine Return Status strictly from manual input override
      const status: ReturnStatus = returnActionType;

      // 4. Financial Calculations (default deliveryLossAmount to 0 if null/undefined)
      const deliveryLoss = deliveryLossAmount ?? 0;
      let productLoss = 0;
      let printingLoss = 0;

      if (status === "WASTAGE") {
        const purchasePrice = orderItem.product.purchasePrice ?? orderItem.product.price;
        productLoss = purchasePrice * orderItem.quantity;
        printingLoss = orderItem.printCost * orderItem.quantity;
      }

      const totalLoss = deliveryLoss + productLoss + printingLoss;

      // 5. Inventory Update
      if (status === "RESTOCKED") {
        const previousQuantity = variant.stock;
        const newQuantity = previousQuantity + orderItem.quantity;

        // Update Product Variant Stock
        await tx.productVariant.update({
          where: { id: variant.id },
          data: { stock: newQuantity },
        });

        // Create StockAdjustment entry
        await tx.stockAdjustment.create({
          data: {
            variantId: variant.id,
            adjustmentType: "ADDITION",
            quantity: orderItem.quantity,
            previousQuantity,
            newQuantity,
            reason: `Sales Return Restock (Order: ${orderId})`,
          },
        });
      }

      // 6. Accounting Entry
      if (totalLoss > 0) {
        const account = await getOrCreateSystemAccount(tx, "Returns & Wastage Loss", "EXPENSE");
        await tx.transaction.create({
          data: {
            accountId: account.id,
            amount: totalLoss,
            date: new Date(),
            type: "DEBIT",
            description: `Loss on return for Order Item ${orderItemId} (Order: ${orderId}). Status: ${status}.`,
            referenceId: orderId,
            referenceType: "ORDER",
          },
        });
      }

      // 7. Update Order Status to RETURNED
      await tx.order.update({
        where: { id: orderId },
        data: { status: "RETURNED" },
      });

      // 8. Create SalesReturn Record
      const salesReturn = await tx.salesReturn.create({
        data: {
          orderId,
          orderItemId,
          variantId: variant.id,
          quantity: orderItem.quantity,
          returnReason,
          status,
          deliveryLoss,
          productLoss,
          printingLoss,
        },
        include: {
          order: true,
          orderItem: {
            include: { product: true }
          },
          variant: true
        }
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

export async function getRecentSalesReturns() {
  try {
    return await prisma.salesReturn.findMany({
      include: {
        order: {
          select: { id: true, customerName: true }
        },
        orderItem: {
          include: {
            product: {
              select: { name: true }
            }
          }
        },
        variant: {
          select: { size: true }
        }
      },
      orderBy: { createdAt: "desc" },
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
              select: { name: true, price: true, purchasePrice: true }
            }
          }
        }
      }
    });
    return { success: true, data: order };
  } catch (error: any) {
    console.error("Get order by ID error:", error);
    return { success: false, error: error.message || "Failed to fetch order." };
  }
}
