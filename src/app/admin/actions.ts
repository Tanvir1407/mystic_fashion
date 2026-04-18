"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import { OrderStatus } from "@/generated/prisma/client";
import { revalidatePath } from "next/cache";
import { writeFile, mkdir } from "fs/promises";
import { join, dirname } from "path";

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
}) {
  try {
    await prisma.$transaction(async (tx) => {
      // 1. Fetch current order items and delivery settings
      const order = await tx.order.findUnique({
        where: { id },
        include: { items: true },
      });

      if (!order) throw new Error("Order not found");

      const deliverySettings = await tx.deliverySetting.upsert({
        where: { id: "default" },
        update: {},
        create: { id: "default", insideDhaka: 70, outsideDhaka: 120 },
      });

      // 2. Calculate Subtotal (Base + Print Costs)
      const subtotal = order.items.reduce((acc, item) => {
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
        },
      });
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
  items: { productId: string; variantId: string; quantity: number; unitPrice: number }[]
) {
  const purchase = await prisma.purchase.create({
    data: {
      supplierName,
      invoiceNumber,
      totalAmount,
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
    await prisma.productVariant.update({
      where: { id: item.variantId },
      data: { stock: { increment: item.quantity } },
    });
    await prisma.product.update({
      where: { id: item.productId },
      data: { purchasePrice: item.unitPrice },
    });
  }

  revalidatePath("/admin/purchases");
  revalidatePath("/admin/products");
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
