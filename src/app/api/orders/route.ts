import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { roundPrice } from "@/utils/formatPrice";
import { normalizePhone } from "@/lib/utils";
import { validateCouponRules } from "@/lib/coupon/couponValidator";
import { executeOrderTransaction } from "@/lib/order-utils";

export async function POST(req: NextRequest) {
  try {
    const payload = await req.json();

    const {
      fullName,
      phone: rawPhone,
      district,
      address,
      items,
      totalAmount,
      remarks,
      couponCode,
      discountAmount,
      bkashNumber,
      bkashTrxId,
      pathaoCityId,
      pathaoZoneId,
      pathaoAreaId,
      deliveryCharge,
    } = payload;

    // Basic validation
    if (!fullName || !rawPhone || !district || !address || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { success: false, error: "fullName, phone, district, address and items are required." },
        { status: 400 }
      );
    }

    const result = await executeOrderTransaction(async (tx, customId) => {


      // Advance paid = sum of print costs
      const calculatedAdvance = items.reduce((sum: number, item: any) => {
        const printCount = item.printDetails?.length || (item.requiresPrint ? 1 : 0);
        return sum + printCount * (item.printCost || 0);
      }, 0);

      // Customer upsert by phone
      const phone = normalizePhone(rawPhone);
      const customer = await tx.customer.findUnique({ where: { phone } });
      let customerId: string | null = null;

      if (customer) {
        customerId = customer.id;
        const nameToUse = fullName?.trim();
        const addressToUse = address?.trim();
        if (
          (nameToUse && nameToUse !== customer.name) ||
          (addressToUse && addressToUse !== customer.address)
        ) {
          await tx.customer.update({
            where: { phone },
            data: {
              name: nameToUse || customer.name,
              address: addressToUse || customer.address,
            },
          });
        }
      } else {
        const newCustomer = await tx.customer.create({
          data: {
            phone,
            name: fullName?.trim() || `Customer ${phone}`,
            address: address?.trim() || null,
          },
        });
        customerId = newCustomer.id;
      }

      // Validate coupon if provided
      let validatedDiscountAmount = 0;
      let couponIdToLog: string | null = null;
      let finalDeliveryCharge = deliveryCharge || 0;
      const sanitizedCoupon = couponCode?.trim().toUpperCase() || null;

      if (sanitizedCoupon) {
        const validationResult = await validateCouponRules(
          sanitizedCoupon,
          items,
          deliveryCharge || 0,
          rawPhone,
          undefined, // No sessionId for API orders
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

      // Recalculate subtotal securely from DB & check stock
      let calculatedSubtotal = 0;
      const variantMap = new Map<string, { id: string; availableStock: number; trackStock: boolean }>();

      for (const item of items) {
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
          throw new Error(`Variant not found for Product "${item.name || item.id}" (Size: ${item.size || "M"}, Color: ${targetColor})`);
        }

        const basePrice = variant.pricingMatrix?.basePrice
          ? Number(variant.pricingMatrix.basePrice)
          : variant.product.price;

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

      const secureTotalAmount = roundPrice(
        calculatedSubtotal - validatedDiscountAmount + calculatedAdvance + finalDeliveryCharge
      );

      // Validate variants exist and check stock
      for (const item of items) {
        const key = `${item.id}_${item.size || "M"}_${item.color || "Default"}`;
        const vInfo = variantMap.get(key);
        if (!vInfo) {
          throw new Error(`Variant not resolved for product ${item.name || item.id}`);
        }
        if (vInfo.trackStock && vInfo.availableStock < item.quantity) {
          throw new Error(`Variant for product "${item.name || item.id}" (${item.size || "M"}) does not have enough stock (Available: ${vInfo.availableStock}).`);
        }
      }

      // Create order
      const order = await tx.order.create({
        data: {
          id: customId,
          customerName: fullName,
          phone: rawPhone,
          district,
          address,
          totalAmount: secureTotalAmount,
          advancePaid: calculatedAdvance,
          deliveryCharge: finalDeliveryCharge,
          bkashNumber: bkashNumber || null,
          bkashTrxId: bkashTrxId || null,
          remarks: remarks || null,
          couponCode: sanitizedCoupon,
          discountAmount: validatedDiscountAmount,
          pathaoCityId: pathaoCityId || null,
          pathaoZoneId: pathaoZoneId || null,
          pathaoAreaId: pathaoAreaId || null,
          orderSource: "eCommerce",
          customerId,
          items: {
            create: items.flatMap((item: any) => {
              const key = `${item.id}_${item.size || "M"}_${item.color || "Default"}`;
              const variantId = variantMap.get(key)?.id || null;

              if (item.requiresPrint && item.printDetails?.length > 0) {
                const printed = item.printDetails.map((pd: any) => ({
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
                const remaining = item.quantity - item.printDetails.length;
                if (remaining > 0) {
                  printed.push({
                    productId: item.id,
                    size: item.size || "M",
                    variantId,
                    quantity: remaining,
                    price: item.price,
                    requiresPrint: false,
                    printName: null,
                    printNumber: null,
                    printCost: 0,
                  });
                }
                return printed;
              }
              return [
                {
                  productId: item.id,
                  size: item.size || "M",
                  variantId,
                  quantity: item.quantity,
                  price: item.price,
                  requiresPrint: item.requiresPrint || false,
                  printName: item.printName || null,
                  printNumber: item.printNumber || null,
                  printCost: item.printCost || 0,
                },
              ];
            }),
          },
        },
      });

      // Log Coupon Usage and clean lock
      if (sanitizedCoupon && couponIdToLog) {
        await tx.couponUsage.create({
          data: {
            couponId: couponIdToLog,
            customerId,
            phone: normalizePhone(rawPhone),
            orderId: order.id,
            discountAmount: validatedDiscountAmount
          }
        });

        await tx.couponLock.deleteMany({
          where: {
            couponId: couponIdToLog,
            phone: normalizePhone(rawPhone)
          }
        });
      }

      return order.id;
    });

    return NextResponse.json({ success: true, data: { orderId: result } }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 400 });
  }
}
