"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { OrderStatus } from "@/generated/prisma/client";
import { revalidatePath } from "next/cache";
import { writeFile, mkdir } from "fs/promises";
import { join, dirname } from "path";

export async function adminLogin(password: string) {
  const correctPassword = process.env.ADMIN_PASSWORD;

  if (password === correctPassword) {
    cookies().set("admin-auth", "true", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 7, // 1 week
      path: "/",
    });
    return { success: true };
  } else {
    return { success: false, error: "Invalid password" };
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
  await prisma.order.update({
    where: { id: orderId },
    data: { status },
  });
  revalidatePath("/admin/orders");
}

export async function bulkUpdateOrderStatus(orderIds: string[], status: OrderStatus) {
  await prisma.order.updateMany({
    where: { id: { in: orderIds } },
    data: { status },
  });
  revalidatePath("/admin/orders");
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
  try { await mkdir(publicUploadsDir, { recursive: true }); } catch (e) {}
  
  const filePath = join(publicUploadsDir, uniqueName);
  await writeFile(filePath, buffer);
  
  return `/uploads/${uniqueName}`;
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
