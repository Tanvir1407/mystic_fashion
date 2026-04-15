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

      // 2. Validate stock availability but don't decrement yet
      for (const item of payload.items) {
        if (!item.size) {
           throw new Error(`Size not selected for ${item.name}`);
        }

        const variant = await tx.productVariant.findUnique({
          where: {
            productId_size: {
              productId: item.id,
              size: item.size
            }
          }
        });

        if (!variant) {
          throw new Error(`Variant not found for ${item.name} (${item.size})`);
        }
        
        // Stock will only be validated and decremented when admin moves status to CONFIRMED
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
