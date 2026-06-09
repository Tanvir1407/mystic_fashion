import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { roundPrice } from "@/utils/formatPrice";
import { normalizePhone } from "@/lib/utils";
import { validateCouponRules } from "@/lib/coupon/couponValidator";
import { generateOrderId } from "@/lib/order-utils";

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
      const customId = await generateOrderId(tx);

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

      // Recalculate subtotal securely from DB
      const productIds = items.map((item: any) => item.id);
      const dbProducts = await tx.product.findMany({
        where: { id: { in: productIds } },
        include: { discount: true }
      });
      const dbProductMap = new Map(dbProducts.map(p => [p.id, p]));

      let calculatedSubtotal = 0;
      for (const item of items) {
        const dbProd = dbProductMap.get(item.id);
        if (!dbProd) throw new Error(`Product not found: ${item.name || item.id}`);
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

      const secureTotalAmount = roundPrice(
        calculatedSubtotal - validatedDiscountAmount + calculatedAdvance + finalDeliveryCharge
      );

      // Validate variants exist and check stock
      for (const item of items) {
        if (!item.size) throw new Error(`Size not selected for ${item.name || item.id}`);
        const variant = await tx.productVariant.findUnique({
          where: {
            productId_size_color: {
              productId: item.id,
              size: item.size,
              color: item.color || "Default",
            },
          },
          include: {
            product: {
              select: {
                trackStock: true
              }
            }
          }
        });
        if (!variant) throw new Error(`Variant not found for product ${item.name || item.id} (${item.size})`);

        if (variant.product.trackStock && variant.stock < item.quantity) {
          throw new Error(`Variant for product "${item.name || item.id}" (${item.size}) does not have enough stock (Available: ${variant.stock}).`);
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
              if (item.requiresPrint && item.printDetails?.length > 0) {
                const printed = item.printDetails.map((pd: any) => ({
                  productId: item.id,
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
