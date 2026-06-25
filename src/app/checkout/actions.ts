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
          where: { id: sessionCustomerId },
          select: { id: true },
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
            select: { id: true, name: true, address: true },
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

      // ── Batch pre-fetch: collect all unique variant keys ──────────────────
      const variantKeys = payload.items.map(item => ({
        productId: item.id,
        size: item.size || "M",
        color: String(item.color || "Default"),
      }));
      const uniqueVariantKeys = Array.from(
        new Map(variantKeys.map(k => [`${k.productId}_${k.size}_${k.color}`, k])).values()
      );

      // ── Batch pre-fetch: collect all combo configuration + child variant keys ──
      const comboPairs: { parentProductId: string; childProductId: string }[] = [];
      const childProductIds = new Set<string>();
      for (const item of payload.items) {
        if (item.comboSelections && Array.isArray(item.comboSelections)) {
          for (const sel of item.comboSelections) {
            comboPairs.push({ parentProductId: item.id, childProductId: sel.productId });
            childProductIds.add(sel.productId);
          }
        }
      }
      const uniqueComboPairs = Array.from(
        new Map(comboPairs.map(p => [`${p.parentProductId}_${p.childProductId}`, p])).values()
      );

      // ── Execute all batch queries ────────────────────────────────────────
      const [variants, comboConfigs, childVariants] = await Promise.all([
        tx.productVariant.findMany({
          where: {
            OR: uniqueVariantKeys.map(k => ({
              productId: k.productId,
              size: k.size,
              color: k.color,
            })),
          },
          include: {
            product: { include: { discount: true } },
            pricingMatrix: true,
            stocks: { where: { warehouse: { code: "MAIN" } } },
          },
        }),
        uniqueComboPairs.length > 0
          ? tx.comboConfiguration.findMany({
              where: {
                OR: uniqueComboPairs.map(p => ({
                  parentProductId: p.parentProductId,
                  childProductId: p.childProductId,
                })),
              },
            })
          : Promise.resolve([] as Awaited<ReturnType<typeof tx.comboConfiguration.findMany>>),
        childProductIds.size > 0
          ? tx.productVariant.findMany({
              where: { productId: { in: [...childProductIds] } },
              include: {
                product: true,
                stocks: { where: { warehouse: { code: "MAIN" } } },
              },
            })
          : Promise.resolve([] as Awaited<ReturnType<typeof tx.productVariant.findMany>>),
      ]);

      // ── Build lookup maps ─────────────────────────────────────────────────
      const variantLookup = new Map<string, (typeof variants)[number]>();
      for (const v of variants) {
        variantLookup.set(`${v.productId}_${v.size}_${v.color}`, v);
      }
      const comboConfigLookup = new Map<string, (typeof comboConfigs)[number]>();
      for (const c of comboConfigs) {
        comboConfigLookup.set(`${c.parentProductId}_${c.childProductId}`, c);
      }
      const childVariantLookup = new Map<string, (typeof childVariants)[number]>();
      for (const cv of childVariants) {
        if (!childVariantLookup.has(cv.productId)) {
          childVariantLookup.set(cv.productId, cv);
        }
      }

      // ── Process items using in-memory lookups ─────────────────────────────
      for (const item of payload.items) {
        const targetColor = item.color || "Default";
        const key = `${item.id}_${item.size || "M"}_${targetColor}`;
        const variant = variantLookup.get(key);

        if (!variant) {
          throw new Error(`Variant not found for Product "${item.name}" (Size: ${item.size || "M"}, Color: ${targetColor})`);
        }

        // Validate combo configurations and selections if this is a combo product
        if (variant.product.isCombo) {
          if (!item.comboSelections || !Array.isArray(item.comboSelections) || item.comboSelections.length === 0) {
            throw new Error(`Combo selections are required for product "${item.name}".`);
          }
          const totalQty = item.comboSelections.reduce((sum: number, s: any) => sum + s.quantity, 0);
          if (totalQty !== variant.product.comboRequiredQty) {
            throw new Error(`Invalid combo selections quantity for "${item.name}". Expected: ${variant.product.comboRequiredQty}, Selected: ${totalQty}.`);
          }

          for (const selection of item.comboSelections) {
            const configKey = `${item.id}_${selection.productId}`;
            const config = comboConfigLookup.get(configKey);
            if (!config) {
              throw new Error(`Product "${selection.name}" is not a valid child selection for combo "${item.name}".`);
            }

            if (selection.quantity > config.maxQuantity) {
              throw new Error(`Quantity of "${selection.name}" selected (${selection.quantity}) exceeds maximum allowed (${config.maxQuantity}) in combo "${item.name}".`);
            }

            const childVariant = childVariantLookup.get(selection.productId);
            if (!childVariant) {
              throw new Error(`Child product variant not found for option "${selection.name}".`);
            }

            const childStock = childVariant.stocks?.[0]?.availableQuantity ?? 0;
            if (childVariant.product.trackStock && childStock < (selection.quantity * item.quantity)) {
              throw new Error(`Selected item "${selection.name}" does not have enough stock (Available: ${childStock}, Required: ${selection.quantity * item.quantity}).`);
            }
          }
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

        const availableStock = variant.stocks?.[0]?.availableQuantity ?? 0;
        variantMap.set(key, {
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
              const variantId = variantMap.get(key)?.id;
              if (!variantId) {
                throw new Error(`Variant could not be resolved for "${item.name}" (Size: ${item.size || "M"}). Please refresh and try again.`);
              }

              const comboSelectionsData = item.comboSelections && item.comboSelections.length > 0 ? {
                create: item.comboSelections.map((sel: any) => ({
                  productId: sel.productId,
                  quantity: sel.quantity
                }))
              } : undefined;

              if (item.requiresPrint && item.printDetails && item.printDetails.length > 0) {
                const printedItems = item.printDetails.map((pd: any) => ({
                  productId: item.id,
                  variantId,
                  quantity: 1,
                  price: item.price,
                  requiresPrint: true,
                  printName: pd.name || null,
                  printNumber: pd.number || null,
                  printCost: item.printCost || 0,
                  comboSelections: comboSelectionsData,
                }));
                const remainingQty = item.quantity - item.printDetails.length;
                if (remainingQty > 0) {
                  printedItems.push({
                    productId: item.id,
                    variantId,
                    quantity: remainingQty,
                    price: item.price,
                    requiresPrint: false,
                    printName: null,
                    printNumber: null,
                    printCost: 0,
                    comboSelections: comboSelectionsData,
                  });
                }
                return printedItems;
              } else {
                return [{
                  productId: item.id,
                  variantId,
                  quantity: item.quantity,
                  price: item.price,
                  requiresPrint: item.requiresPrint || false,
                  printName: item.printName || null,
                  printNumber: item.printNumber || null,
                  printCost: item.printCost || 0,
                  comboSelections: comboSelectionsData,
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
        where: { code: code.toUpperCase() },
        select: { id: true },
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
        where: { code: code.toUpperCase() },
        select: { id: true },
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
