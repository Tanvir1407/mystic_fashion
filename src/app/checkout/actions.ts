"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function placeOrderAction(payload: {
  fullName: string;
  phone: string;
  district: string;
  address: string;
  items: any[];
  totalAmount: number;
}) {
  try {
    return await prisma.$transaction(async (tx) => {
      // 1. Create the order & items
      const order = await tx.order.create({
        data: {
          customerName: payload.fullName,
          phone: payload.phone,
          district: payload.district,
          address: payload.address,
          totalAmount: payload.totalAmount,
          items: {
            create: payload.items.map((item) => ({
              productId: item.id,
              size: item.size || "M",
              quantity: item.quantity,
              price: item.price,
            })),
          },
        },
      });

      // 2. Decrement physical stock dynamically in the ProductVariant table
      for (const item of payload.items) {
        if (!item.size) continue;
        
        const variant = await tx.productVariant.findFirst({
          where: {
            productId: item.id,
            size: item.size
          }
        });

        if (variant) {
           if (variant.stock < item.quantity) {
             throw new Error(`Insufficient stock for ${item.name} (${item.size}). Available: ${variant.stock}`);
           }
           await tx.productVariant.update({
             where: { id: variant.id },
             data: { stock: { decrement: item.quantity } }
           });
        }
      }

      revalidatePath("/admin/products");
      revalidatePath("/admin/orders");
      revalidatePath("/");
      
      return { success: true, orderId: order.id };
    });
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to place order." };
  }
}
