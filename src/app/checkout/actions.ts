"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { roundPrice } from "@/utils/formatPrice";
import { normalizePhone } from "@/lib/utils";
import { validateCouponRules } from "@/lib/coupon/couponValidator";
import { getCustomerSession } from "@/lib/auth";
import { executeOrderTransaction } from "@/lib/order-utils";

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
  isFullPayment?: boolean;
}) {
  try {
    return await executeOrderTransaction(async (tx, customId) => {
      // 0. Check active session or check/create customer profile by phone
      const phone = payload.phone ? normalizePhone(payload.phone) : undefined;
      const session = await getCustomerSession();
      const sessionCustomerId = session?.customerId || null;
      let customerId: string | null = null;

      if (sessionCustomerId) {
        const existingCustomer = await tx.customer.findUnique({
          where: { id: sessionCustomerId }
        });

        if (existingCustomer) {
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
        }
      }

      if (!customerId) {
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

      // Recalculate subtotal securely from DB & check stock
      let calculatedSubtotal = 0;
      const variantMap = new Map<string, { id: string; availableStock: number; trackStock: boolean }>();

      for (const item of payload.items) {
        const targetColor = item.color || "Default";
        const variant = await tx.productVariant.findUnique({
          where: {
            productId_size_color: {
              productId: item.id,
              size: item.size || "M",
              color: targetColor,
            },
          },
          include: {
            product: {
              include: { discount: true },
            },
            pricingMatrix: true,
            stocks: {
              where: { warehouse: { code: "WH-MAIN" } },
            },
          },
        });

        if (!variant) {
          throw new Error(`Variant not found for Product "${item.name}" (Size: ${item.size || "M"}, Color: ${targetColor})`);
        }

        const basePrice = variant.pricingMatrix?.basePrice
          ? Number(variant.pricingMatrix.basePrice)
          : 0;

        let finalPrice = basePrice;
        const discount = variant.product.discount;
        if (discount && discount.active) {
          if (discount.discountType === "PERCENTAGE") {
            finalPrice = finalPrice - (finalPrice * (discount.value / 100));
          } else {
            finalPrice = finalPrice - discount.value;
          }
        }

        calculatedSubtotal += roundPrice(finalPrice) * item.quantity;

        const availableStock = variant.stocks?.[0]?.availableQuantity ?? variant.stock ?? 0;
        variantMap.set(`${item.id}_${item.size || "M"}_${targetColor}`, {
          id: variant.id,
          availableStock,
          trackStock: variant.product.trackStock ?? false,
        });
      }

      // Check stock limits
      for (const item of payload.items) {
        const key = `${item.id}_${item.size || "M"}_${item.color || "Default"}`;
        const vInfo = variantMap.get(key);
        if (vInfo && vInfo.trackStock && vInfo.availableStock < item.quantity) {
          throw new Error(`Variant "${item.name} (${item.size || "M"})" does not have enough stock (Available: ${vInfo.availableStock}).`);
        }
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



      // 1. Create the order & items
      const tags = [];
      if (payload.isFullPayment) {
        tags.push("Full Payment");
      } else if (calculatedAdvance > 0) {
        tags.push("DTF Advance");
      }

      const order = await tx.order.create({
        data: {
          id: customId,
          customerName: payload.fullName,
          phone: payload.phone,
          district: payload.district,
          address: payload.address,
          totalAmount: secureTotalAmount,
          advancePaid: payload.isFullPayment ? secureTotalAmount : calculatedAdvance,
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
          tags: tags,
          items: {
            create: payload.items.flatMap((item) => {
              const key = `${item.id}_${item.size || "M"}_${item.color || "Default"}`;
              const variantId = variantMap.get(key)?.id || null;

              if (item.requiresPrint && item.printDetails && item.printDetails.length > 0) {
                const printedItems = item.printDetails.map((pd: any) => ({
                  productId: item.id,
                  size: item.size || "M",
                  variantId,
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
                    variantId,
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
                  variantId,
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

export async function syncCartPrices(cartItems: { id: string; size?: string; color?: string }[]) {
  try {
    if (!cartItems || !Array.isArray(cartItems) || cartItems.length === 0) {
      return [];
    }
    const productIds = Array.from(new Set(cartItems.map(item => item.id)));
    const products = await prisma.product.findMany({
      where: {
        id: { in: productIds },
        isPublished: true
      },
      include: {
        discount: true,
        variants: {
          include: { pricingMatrix: true }
        }
      }
    });

    return cartItems.map(item => {
      const product = products.find(p => p.id === item.id);
      if (!product) return null;

      const targetColor = item.color || "Default";
      const variant = product.variants.find(
        v => v.size === item.size && v.color === targetColor
      ) || product.variants[0];

      const basePrice = variant?.pricingMatrix?.basePrice
        ? Number(variant.pricingMatrix.basePrice)
        : 0;

      let finalPrice = basePrice;
      if (product.discount && product.discount.active) {
        if (product.discount.discountType === "PERCENTAGE") {
          finalPrice = basePrice - (basePrice * (product.discount.value / 100));
        } else {
          finalPrice = basePrice - product.discount.value;
        }
      }

      return {
        id: item.id,
        size: item.size,
        color: item.color,
        price: roundPrice(finalPrice)
      };
    }).filter(Boolean) as { id: string; size?: string; color?: string; price: number }[];
  } catch (error) {
    console.error("Failed to sync cart prices:", error);
    return [];
  }
}
