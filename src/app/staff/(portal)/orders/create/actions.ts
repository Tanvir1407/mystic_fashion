"use server";

import prisma from "@/lib/prisma";
import { getStaffSession } from "@/lib/staff-auth";
import { normalizePhone } from "@/lib/utils";
import { revalidatePath } from "next/cache";
import { getEffectiveCommissionRate } from "@/lib/commission";
import { executeOrderTransaction } from "@/lib/order-utils";

export async function createStaffOrder(data: {
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
  isStorePickup?: boolean;
  deliveryCharge?: number;
  hasBackorderItems?: boolean;
}): Promise<{ success: boolean; orderId?: string; error?: string }> {
  try {
    const session = await getStaffSession();
    if (!session) return { success: false, error: "Not authenticated." };

    const rate = await getEffectiveCommissionRate(session.staffId);

    const order = await executeOrderTransaction(async (tx, customId) => {
      const phone = data.phone ? normalizePhone(data.phone) : data.phone;

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
        }
        customerId = customer.id;
      }

      return tx.order.create({
        data: {
          id: customId,
          customerName: data.customerName,
          phone,
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
          status: "PENDING",
          orderSource: "Salesman",
          createdById: session.staffId,
          commissionRate: rate,
          customerId,
          items: {
            create: data.items.flatMap((item) => {
              if (item.requiresPrint && item.printDetails?.length) {
                const printed = item.printDetails.map((pd) => ({
                  productId: item.productId,
                  size: item.size,
                  quantity: 1,
                  price: item.price,
                  requiresPrint: true,
                  printName: pd.name,
                  printNumber: pd.number,
                  printCost: item.printCost || 0,
                }));
                const remaining = item.quantity - item.printDetails.length;
                if (remaining > 0) {
                  printed.push({ productId: item.productId, size: item.size, quantity: remaining, price: item.price, requiresPrint: false, printName: null, printNumber: null, printCost: 0 });
                }
                return printed;
              }
              return [{ productId: item.productId, size: item.size, quantity: item.quantity, price: item.price, requiresPrint: item.requiresPrint || false, printName: item.printName || null, printNumber: item.printNumber || null, printCost: item.printCost || 0 }];
            }),
          },
        },
      });
    });

    revalidatePath("/staff/orders");
    revalidatePath("/staff/dashboard");
    revalidatePath("/admin/orders");
    return { success: true, orderId: order.id };
  } catch (error: any) {
    console.error("createStaffOrder error:", error);
    return { success: false, error: error.message || "Failed to create order." };
  }
}
