import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { roundPrice } from "@/utils/formatPrice";
import { normalizePhone } from "@/lib/utils";
import { validateCouponRules } from "@/lib/coupon/couponValidator";

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

    const result = await prisma.$transaction(async (tx) => {
      // Generate custom order ID (same pattern as web)
      const now = new Date();
      const year = now.getFullYear().toString().slice(-2);
      const month = (now.getMonth() + 1).toString().padStart(2, "0");
      const date = now.getDate().toString().padStart(2, "0");
      const datePrefix = `MJEPE-${year}${month}${date}`;

      const lastOrder = await tx.order.findFirst({
        where: { id: { startsWith: datePrefix } },
        orderBy: { id: "desc" },
        select: { id: true },
      });

      const nextNum = lastOrder
        ? parseInt(lastOrder.id.replace(datePrefix, "")) + 1
        : 1;
      const customId = `${datePrefix}${nextNum.toString().padStart(2, "0")}`;

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

      // 1. Resolve variant IDs, validate stock availability, and recalculate subtotal securely from DB
      let calculatedSubtotal = 0;
      const variantMap = new Map<string, string>();

      for (const item of items) {
        if (!item.size) {
          throw new Error(`Size not selected for ${item.name || item.id}`);
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
            pricingMatrix: true,
            product: {
              include: {
                discount: true
              }
            },
            stocks: {
              where: {
                warehouse: {
                  code: "WH-MAIN"
                }
              }
            }
          }
        });

        if (!variant) {
          throw new Error(`Variant not found for product ${item.name || item.id} (${item.size})`);
        }

        const availableStock = variant.stocks[0]?.availableQuantity ?? 0;
        if (variant.product.trackStock && availableStock < item.quantity) {
          throw new Error(`Variant for product "${item.name || item.id}" (${item.size}) does not have enough stock (Available: ${availableStock}).`);
        }

        // Determine the base price of this variant (fallback to product level price if matrix basePrice is not set)
        const basePriceVal = variant.pricingMatrix?.basePrice 
          ? Number(variant.pricingMatrix.basePrice) 
          : (variant.product as any).price; // fallback if any database constraint is missing

        let finalPrice = basePriceVal;
        const discount = variant.product.discount;
        if (discount && discount.active) {
          if (discount.discountType === "PERCENTAGE") {
            finalPrice = finalPrice - (finalPrice * (discount.value / 100));
          } else {
            finalPrice = finalPrice - discount.value;
          }
        }

        calculatedSubtotal += roundPrice(finalPrice) * item.quantity;

        variantMap.set(`${item.id}_${item.size}_${item.color || "Default"}`, variant.id);
      }

      const secureTotalAmount = roundPrice(
        calculatedSubtotal - validatedDiscountAmount + calculatedAdvance + finalDeliveryCharge
      );

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
              const key = `${item.id}_${item.size}_${item.color || "Default"}`;
              const variantId = variantMap.get(key) || null;
              if (item.requiresPrint && item.printDetails?.length > 0) {
                const printed = item.printDetails.map((pd: any) => ({
                  productId: item.id,
                  variantId,
                  size: item.size || "M",
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
                    variantId,
                    size: item.size || "M",
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
                  variantId,
                  size: item.size || "M",
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
