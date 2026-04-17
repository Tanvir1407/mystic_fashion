"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function placeOrderAction(payload: {
  fullName: string;
  phone: string;
  district: string;
  address: string;
  items: any[];
  totalAmount: number;
  remarks?: string;
}) {
  try {
    return await prisma.$transaction(async (tx) => {
      // Generate Custom Order ID
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
      const customId = `${datePrefix}${nextNum.toString().padStart(2, '0')}`;

      // 1. Create the order & items
      const order = await tx.order.create({
        data: {
          id: customId,
          customerName: payload.fullName,
          phone: payload.phone,
          district: payload.district,
          address: payload.address,
          totalAmount: payload.totalAmount,
          remarks: payload.remarks,
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
