"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import { OrderStatus } from "@/generated/prisma/client";
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

export async function adminLogin(email: string, password: string) {
  const staff = await prisma.staff.findUnique({
    where: { email },
  });

  if (staff && staff.password === password) {
    cookies().set("admin-auth", "true", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 7, // 1 week
      path: "/",
    });

    // Store staff info if needed, but for now simple true/false auth is used across app
    return { success: true };
  } else {
    return { success: false, error: "Invalid email or password" };
  }
}

export async function adminLogout() {
  cookies().delete("admin-auth");
  redirect("/admin/login");
}

export async function createProduct(data: {
  name: string;
  description: string;
  price: number;
  images: string[];
  team: string;
  category: string;
  sizeChartId?: string;
  discountId?: string | null;
  isFeatured: boolean;
  isPublished: boolean;
  variants: { size: string; stock: number }[];
}) {
  await prisma.product.create({
    data: {
      name: data.name,
      description: data.description,
      price: data.price,
      images: data.images,
      team: data.team,
      category: data.category,
      isFeatured: data.isFeatured,
      isPublished: data.isPublished,
      sizeChartId: data.sizeChartId,
      discountId: data.discountId,
      variants: {
        create: data.variants,
      },
    },
  });

  revalidatePath("/admin/products");
  redirect("/admin/products");
}

export async function updateProduct(id: string, data: {
  name: string;
  description: string;
  price: number;
  images: string[];
  team: string;
  category: string;
  sizeChartId?: string;
  discountId?: string | null;
  isFeatured: boolean;
  isPublished: boolean;
  variants: { size: string; stock: number }[];
}) {
  await prisma.product.update({
    where: { id },
    data: {
      name: data.name,
      description: data.description,
      price: data.price,
      images: data.images,
      team: data.team,
      category: data.category,
      isFeatured: data.isFeatured,
      isPublished: data.isPublished,
      sizeChartId: data.sizeChartId,
      discountId: data.discountId,
    },
  });

  await prisma.$transaction(
    data.variants.map((v) =>
      prisma.productVariant.upsert({
        where: { productId_size: { productId: id, size: v.size } },
        update: { stock: v.stock },
        create: { productId: id, size: v.size, stock: v.stock },
      })
    )
  );

  await prisma.productVariant.deleteMany({
    where: {
      productId: id,
      size: { notIn: data.variants.map((v) => v.size) },
    },
  });

  revalidatePath("/admin/products");
  revalidatePath(`/product/${id}`);
  redirect("/admin/products");
}

export async function deleteProduct(id: string) {
  await prisma.product.delete({
    where: { id },
  });
  revalidatePath("/admin/products");
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

      // Determine Stock Action
      let stockAction: "REDUCE" | "RESTORE" | "NONE" = "NONE";

      if ((oldStatus === "PENDING" || oldStatus === "CANCELLED") && isActive(newStatus)) {
        // Pending/Canceled -> Active: Reduction
        stockAction = "REDUCE";
      } else if (isActive(oldStatus) && newStatus === "CANCELLED") {
        // Active -> Canceled: Restoration
        stockAction = "RESTORE";
      }

      // Execute Stock Action
      if (stockAction === "REDUCE") {
        for (const item of order.items) {
          const variant = await tx.productVariant.findUnique({
            where: {
              productId_size: {
                productId: item.productId,
                size: item.size
              }
            },
            include: { product: true }
          });

          if (!variant || variant.stock < item.quantity) {
            throw new Error(`Insufficient stock for product: ${variant?.product.name || 'Unknown'} | size: ${item.size}`);
          }

          await tx.productVariant.update({
            where: { id: variant.id },
            data: { stock: { decrement: item.quantity } }
          });
        }
      } else if (stockAction === "RESTORE") {
        for (const item of order.items) {
          await tx.productVariant.update({
            where: {
              productId_size: {
                productId: item.productId,
                size: item.size
              }
            },
            data: { stock: { increment: item.quantity } }
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
                where: { productId_size: { productId: newItem.productId, size: newItem.size } },
                data: { stock: { decrement: diff } } // If increased (diff > 0), decrement stock
              });
            }
            oldItemsMap.delete(newItem.id);
          } else {
            // New Item added
            await tx.productVariant.update({
              where: { productId_size: { productId: newItem.productId, size: newItem.size } },
              data: { stock: { decrement: newItem.quantity } }
            });
          }
        }

        // Remaining items in oldItemsMap are deleted items
        for (const remainingOld of oldItemsMap.values()) {
          await tx.productVariant.update({
            where: { productId_size: { productId: remainingOld.productId, size: remainingOld.size } },
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
  await prisma.sizeChart.upsert({
    where: { category },
    update: { data },
    create: { category, data },
  });
  revalidatePath("/admin/size-charts");
  redirect("/admin/size-charts");
}

export async function deleteSizeChart(id: string) {
  await prisma.sizeChart.delete({
    where: { id },
  });
  revalidatePath("/admin/size-charts");
}

export async function createPurchase(
  supplierName: string,
  invoiceNumber: string,
  totalAmount: number,
  discountAmount: number,
  items: { productId: string; variantId: string; quantity: number; unitPrice: number }[]
) {
  await prisma.$transaction(async (tx) => {
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
      await tx.productVariant.update({
        where: { id: item.variantId },
        data: { stock: { increment: item.quantity } },
      });
      await tx.product.update({
        where: { id: item.productId },
        data: { purchasePrice: item.unitPrice },
      });
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
  });

  revalidatePath("/admin/purchases");
  revalidatePath("/admin/products");
  redirect("/admin/purchases");
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
        await tx.productVariant.update({
          where: { id: item.variantId },
          data: { stock: { increment: item.quantity } },
        });
        await tx.product.update({
          where: { id: item.productId },
          data: { purchasePrice: item.unitPrice },
        });
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
  await prisma.purchase.delete({ where: { id } });
  revalidatePath("/admin/purchases");
}

export async function updatePurchaseStatus(id: string, status: string) {
  await prisma.purchase.update({
    where: { id },
    data: { status },
  });
  revalidatePath("/admin/purchases");
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
  await prisma.deliverySetting.upsert({
    where: { id: "default" },
    update: { insideDhaka, outsideDhaka },
    create: { id: "default", insideDhaka, outsideDhaka },
  });
  revalidatePath("/admin/settings");
  revalidatePath("/");
  revalidatePath("/checkout");
  revalidatePath("/product/[id]", "page");
}

export async function getInventorySettings() {
  return await prisma.inventorySetting.upsert({
    where: { id: "default" },
    update: {},
    create: { id: "default", lowStockThreshold: 5 },
  });
}

export async function updateInventorySettings(lowStockThreshold: number) {
  await prisma.inventorySetting.upsert({
    where: { id: "default" },
    update: { lowStockThreshold },
    create: { id: "default", lowStockThreshold },
  });
  revalidatePath("/admin/inventory");
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
  items: { productId: string; size: string; quantity: number; price: number }[];
  totalAmount: number;
  advancePaid: number;
  discountAmount: number;
  remarks?: string;
  pathaoCityId?: number;
  pathaoZoneId?: number;
  pathaoAreaId?: number;
}) {
  try {
    const order = await prisma.$transaction(async (tx) => {
      const customId = await generateOrderIdInternal(tx);

      // 1. Create the order
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
          status: "CONFIRMED", // Admin orders are usually confirmed immediately
          items: {
            create: data.items.map((item) => ({
              productId: item.productId,
              size: item.size,
              quantity: item.quantity,
              price: item.price,
            })),
          },
        },
      });

      // 2. Update stock for each item
      for (const item of data.items) {
        await tx.productVariant.update({
          where: {
            productId_size: {
              productId: item.productId,
              size: item.size,
            },
          },
          data: {
            stock: {
              decrement: item.quantity,
            },
          },
        });
      }

      // 3. Accounting Automation
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
  return await prisma.page.findUnique({
    where: { slug },
  });
}

export async function updatePage(slug: string, data: { title: string; content: string }) {
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

  return { success: true, page };
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

      if (!order.pathaoCityId || !order.pathaoZoneId) {
        errors.push(`${order.id}: Missing Pathao City or Zone ID.`);
        continue;
      }

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
          recipient_city: order.pathaoCityId,
          recipient_zone: order.pathaoZoneId,
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
