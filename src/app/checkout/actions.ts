"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { roundPrice } from "@/utils/formatPrice";
import { normalizePhone } from "@/lib/utils";

export async function placeOrderAction(payload: {
  fullName: string;
  phone: string;
  district: string;
  address: string;
  items: any[];
  totalAmount: number;
  remarks?: string;
  couponCode?: string;
  discountAmount?: number;
  bkashNumber?: string;
  bkashTrxId?: string;
  pathaoCityId?: number;
  pathaoZoneId?: number;
  pathaoAreaId?: number;
}) {
  try {
    return await prisma.$transaction(async (tx) => {
      const calculatedAdvance = payload.items.reduce((sum, item) => {
        const printCount = item.printDetails?.length || (item.requiresPrint ? 1 : 0);
        return sum + (printCount * (item.printCost || 0));
      }, 0);

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

      // 0. Check or create customer profile by phone
      const phone = payload.phone ? normalizePhone(payload.phone) : undefined;
      let customerId: string | null = null;
      if (phone) {
        let customer = await tx.customer.findUnique({
          where: { phone },
        });

        if (!customer) {
          customer = await tx.customer.create({
            data: {
              phone,
              name: payload.fullName?.trim() || `Customer ${phone}`,
              address: payload.address?.trim() || null,
            },
          });
        } else {
          const nameToUse = payload.fullName?.trim();
          const addressToUse = payload.address?.trim();
          if ((nameToUse && nameToUse !== customer.name) || (addressToUse && addressToUse !== customer.address)) {
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

      const sanitizedCoupon = payload.couponCode?.trim().toUpperCase() || null;

      // 1. Create the order & items
      const order = await tx.order.create({
        data: {
          id: customId,
          customerName: payload.fullName,
          phone: payload.phone,
          district: payload.district,
          address: payload.address,
          totalAmount: roundPrice(payload.totalAmount),
          advancePaid: calculatedAdvance,
          bkashNumber: payload.bkashNumber,
          bkashTrxId: payload.bkashTrxId,
          remarks: payload.remarks,
          couponCode: sanitizedCoupon,
          discountAmount: payload.discountAmount || 0,
          pathaoCityId: payload.pathaoCityId,
          pathaoZoneId: payload.pathaoZoneId,
          pathaoAreaId: payload.pathaoAreaId,
          orderSource: "eCommerce",
          customerId: customerId,
          items: {
            create: payload.items.flatMap((item) => {
              if (item.requiresPrint && item.printDetails && item.printDetails.length > 0) {
                const printedItems = item.printDetails.map((pd: any) => ({
                  productId: item.id,
                  size: item.size || "M",
                  quantity: 1,
                  price: item.price,
                  requiresPrint: true,
                  printName: pd.name || null,
                  printNumber: pd.number || null,
                  printCost: item.printCost || 0,
                }));
                const remainingQty = item.quantity - item.printDetails.length;
                if (remainingQty > 0) {
                  printedItems.push({
                    productId: item.id,
                    size: item.size || "M",
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
                  productId: item.id,
                  size: item.size || "M",
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

      // 2. Validate stock availability but don't decrement yet
      for (const item of payload.items) {
        if (!item.size) {
          throw new Error(`Size not selected for ${item.name}`);
        }

        const variant = await tx.productVariant.findUnique({
          where: {
            productId_size_color: {
              productId: item.id,
              size: item.size,
              color: item.color || "Default"
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

export async function validateCoupon(code: string, baseSubtotal: number) {
  try {
    const coupon = await prisma.coupon.findUnique({
      where: { code: code.toUpperCase() },
    });

    if (!coupon || !coupon.isActive) {
      return { success: false, error: "Invalid or inactive coupon code." };
    }

    const now = new Date();
    if (coupon.startDate && now < coupon.startDate) {
      return { success: false, error: "This coupon is not yet active." };
    }
    if (coupon.endDate && now > coupon.endDate) {
      return { success: false, error: "This coupon has expired." };
    }

    let discountAmount = 0;
    if (coupon.type === "PERCENTAGE") {
      discountAmount = (coupon.value / 100) * baseSubtotal;
    } else {
      discountAmount = coupon.value;
    }

    // Ensure discount doesn't exceed Subtotal
    discountAmount = Math.min(discountAmount, baseSubtotal);

    return {
      success: true,
      discountAmount: roundPrice(discountAmount),
      couponCode: coupon.code
    };
  } catch (error: any) {
    return { success: false, error: "Failed to validate coupon." };
  }
}

export async function syncCartPrices(productIds: string[]) {
  try {
    const products = await prisma.product.findMany({
      where: {
        id: { in: productIds },
        isPublished: true
      },
      include: { discount: true }
    });

    return products.map(product => {
      let finalPrice = product.price;
      if (product.discount && product.discount.active) {
        if (product.discount.discountType === "PERCENTAGE") {
          finalPrice = finalPrice - (finalPrice * (product.discount.value / 100));
        } else {
          finalPrice = finalPrice - product.discount.value;
        }
      }
      return { id: product.id, price: roundPrice(finalPrice) };
    });
  } catch (error) {
    console.error("Failed to sync cart prices:", error);
    return [];
  }
}
