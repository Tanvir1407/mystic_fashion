"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { OrderStatus } from "@/generated/prisma/client";
import { revalidatePath } from "next/cache";

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

export async function createProduct(formData: FormData) {
  const name = formData.get("name") as string;
  const description = formData.get("description") as string;
  const price = parseFloat(formData.get("price") as string);
  const images = (formData.get("images") as string).split(",").map((i) => i.trim());
  const sizes = (formData.get("sizes") as string).split(",").map((i) => i.trim());
  const team = formData.get("team") as string;
  const stock = parseInt(formData.get("stock") as string, 10);
  const category = formData.get("category") as string;

  await prisma.product.create({
    data: {
      name,
      description,
      price,
      images,
      sizes,
      team,
      stock,
      category,
    },
  });

  revalidatePath("/admin/products");
  revalidatePath("/shop");
  redirect("/admin/products");
}

export async function updateProduct(id: string, formData: FormData) {
  const name = formData.get("name") as string;
  const description = formData.get("description") as string;
  const price = parseFloat(formData.get("price") as string);
  const images = (formData.get("images") as string).split(",").map((i) => i.trim());
  const sizes = (formData.get("sizes") as string).split(",").map((i) => i.trim());
  const team = formData.get("team") as string;
  const stock = parseInt(formData.get("stock") as string, 10);
  const category = formData.get("category") as string;

  await prisma.product.update({
    where: { id },
    data: {
      name,
      description,
      price,
      images,
      sizes,
      team,
      stock,
      category,
    },
  });

  revalidatePath("/admin/products");
  revalidatePath(`/product/${id}`);
  revalidatePath("/shop");
  redirect("/admin/products");
}

export async function deleteProduct(id: string) {
  await prisma.product.delete({
    where: { id },
  });
  revalidatePath("/admin/products");
  revalidatePath("/shop");
}

export async function updateOrderStatus(orderId: string, status: OrderStatus) {
  await prisma.order.update({
    where: { id: orderId },
    data: { status },
  });
  revalidatePath("/admin/orders");
}

export async function saveSizeChart(category: string, data: any) {
  await prisma.SizeChart.upsert({
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

export async function createPurchase(supplierName: string, invoiceNumber: string, totalAmount: number, items: any) {
  await prisma.purchase.create({
    data: {
      supplierName,
      invoiceNumber,
      totalAmount,
      itemsJSON: items,
      status: "PENDING"
    }
  });
  revalidatePath("/admin/purchases");
  redirect("/admin/purchases");
}

export async function deletePurchase(id: string) {
  await prisma.purchase.delete({ where: { id } });
  revalidatePath("/admin/purchases");
}

export async function updatePurchaseStatus(id: string, status: string) {
  await prisma.purchase.update({
    where: { id },
    data: { status }
  });
  revalidatePath("/admin/purchases");
}
