"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { roundPrice } from "@/utils/formatPrice";
import { normalizePhone } from "@/lib/utils";
import { validateCouponRules } from "@/lib/coupon/couponValidator";
import { getCustomerSession } from "@/lib/auth";
import { generateOrderId } from "@/lib/order-utils";

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
  couponSessionId?: string;
}) {
  try {
    return await prisma.$transaction(async (tx) => {
      // 0. Check active session or check/create customer profile by phone
      const phone = payload.phone ? normalizePhone(payload.phone) : undefined;
      const session = await getCustomerSession();
      const sessionCustomerId = session?.customerId || null;
      let customerId: string | null = null;

      if (sessionCustomerId) {
        customerId = sessionCustomerId;
        // Optionally update customer's last used name and address
        const nameToUse = payload.fullName?.trim();
        const addressToUse = payload.address?.trim();
        await tx.customer.update({
          where: { id: sessionCustomerId },
          data: {
            name: nameToUse || undefined,
            address: addressToUse || undefined,
          }
        });
      } else {
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
      }

      // Recalculate subtotal securely from DB
      const productIds = payload.items.map(item => item.id);
      const dbProducts = await tx.product.findMany({
        where: { id: { in: productIds } },
        include: { discount: true }
      });
      const dbProductMap = new Map(dbProducts.map(p => [p.id, p]));

      let calculatedSubtotal = 0;
      for (const item of payload.items) {
        const dbProd = dbProductMap.get(item.id);
        if (!dbProd) throw new Error(`Product not found: ${item.name}`);
        let finalPrice = dbProd.price;
        if (dbProd.discount && dbProd.discount.active) {
          if (dbProd.discount.discountType === "PERCENTAGE") {
            finalPrice = finalPrice - (finalPrice * (dbProd.discount.value / 100));
          } else {
            finalPrice = finalPrice - dbProd.discount.value;
          }
        }
        calculatedSubtotal += roundPrice(finalPrice) * item.quantity;
      }

      // Calculate DTF Cost
      const calculatedAdvance = payload.items.reduce((sum, item) => {
        const printCount = item.printDetails?.length || (item.requiresPrint ? 1 : 0);
        return sum + (printCount * (item.printCost || 0));
      }, 0);

      // Delivery Setting & Charge
      let insideCharge = 80;
      let outsideCharge = 150;
      const delSetting = await tx.deliverySetting.findUnique({ where: { id: "default" } });
      if (delSetting) {
        insideCharge = delSetting.insideDhaka;
        outsideCharge = delSetting.outsideDhaka;
      }
      const isDhaka = payload.district?.toLowerCase() === "dhaka";
      const deliveryCharge = isDhaka ? insideCharge : outsideCharge;

      // Validate Coupon if provided
      let validatedDiscountAmount = 0;
      let couponIdToLog: string | null = null;
      let finalDeliveryCharge = deliveryCharge;
      const sanitizedCoupon = payload.couponCode?.trim().toUpperCase() || null;

      if (sanitizedCoupon) {
        const validationResult = await validateCouponRules(
          sanitizedCoupon,
          payload.items,
          deliveryCharge,
          payload.phone,
          payload.couponSessionId,
          tx
        );

        if (!validationResult.isValid) {
          throw new Error(validationResult.error || "Coupon validation failed.");
        }

        validatedDiscountAmount = validationResult.discountAmount;

        const dbCoupon = await tx.coupon.findUnique({
          where: { code: sanitizedCoupon },
          select: { id: true, type: true }
        });
        if (dbCoupon) {
          couponIdToLog = dbCoupon.id;
          if (dbCoupon.type === "FREE_SHIPPING") {
            finalDeliveryCharge = 0;
          }
        }
      }

      // Calculate Secure Grand Total
      const secureTotalAmount = roundPrice(
        calculatedSubtotal - validatedDiscountAmount + calculatedAdvance + finalDeliveryCharge
      );

      // Generate Custom Order ID
      const customId = await generateOrderId(tx);

      // 1. Create the order & items
      const order = await tx.order.create({
        data: {
          id: customId,
          customerName: payload.fullName,
          phone: payload.phone,
          district: payload.district,
          address: payload.address,
          totalAmount: secureTotalAmount,
          advancePaid: calculatedAdvance,
          bkashNumber: payload.bkashNumber,
          bkashTrxId: payload.bkashTrxId,
          remarks: payload.remarks,
          couponCode: sanitizedCoupon,
          discountAmount: validatedDiscountAmount,
          deliveryCharge: finalDeliveryCharge,
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

      // 2. Log Coupon Usage and delete lock
      if (sanitizedCoupon && couponIdToLog) {
        await tx.couponUsage.create({
          data: {
            couponId: couponIdToLog,
            customerId: customerId,
            phone: phone || normalizePhone(payload.phone),
            orderId: order.id,
            discountAmount: validatedDiscountAmount
          }
        });

        // Cleanup lock for this user
        const phoneMatch = phone || normalizePhone(payload.phone);
        await tx.couponLock.deleteMany({
          where: {
            couponId: couponIdToLog,
            OR: [
              { phone: phoneMatch },
              payload.couponSessionId ? { sessionId: payload.couponSessionId } : {}
            ]
          }
        });
      }

      // 3. Validate stock availability but don't decrement yet
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
          },
          include: {
            product: {
              select: {
                trackStock: true
              }
            }
          }
        });

        if (!variant) {
          throw new Error(`Variant not found for ${item.name} (${item.size})`);
        }

        if (variant.product.trackStock && variant.stock < item.quantity) {
          throw new Error(`Variant "${item.name} (${item.size})" does not have enough stock (Available: ${variant.stock}).`);
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

export async function validateCoupon(
  code: string,
  items: any[],
  deliveryCharge: number,
  phone?: string,
  sessionId?: string
) {
  try {
    const res = await validateCouponRules(code, items, deliveryCharge, phone, sessionId);

    if (res.isValid && sessionId) {
      const coupon = await prisma.coupon.findUnique({
        where: { code: code.toUpperCase() }
      });
      if (coupon) {
        const phoneMatch = phone ? normalizePhone(phone) : null;
        // Clean existing lock for this session
        await prisma.couponLock.deleteMany({
          where: { sessionId, couponId: coupon.id }
        });
        // Create new lock
        await prisma.couponLock.create({
          data: {
            couponId: coupon.id,
            sessionId,
            phone: phoneMatch,
            expiresAt: new Date(Date.now() + 15 * 60 * 1000)
          }
        });
      }
    } else if (!res.isValid && sessionId && code) {
      const coupon = await prisma.coupon.findUnique({
        where: { code: code.toUpperCase() }
      });
      if (coupon) {
        await prisma.couponLock.deleteMany({
          where: { sessionId, couponId: coupon.id }
        });
      }
    }

    return {
      success: res.isValid,
      discountAmount: res.discountAmount,
      couponCode: code.toUpperCase(),
      error: res.error
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
