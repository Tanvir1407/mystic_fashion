import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { roundPrice } from "@/utils/formatPrice";
import { normalizePhone } from "@/lib/utils";

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
      const sanitizedCoupon = couponCode?.trim().toUpperCase() || null;
      if (sanitizedCoupon) {
        const coupon = await tx.coupon.findUnique({ where: { code: sanitizedCoupon } });
        if (!coupon || !coupon.isActive || coupon.deletedAt) {
          throw new Error("Invalid or inactive coupon code.");
        }
        const now2 = new Date();
        if (coupon.startDate && now2 < coupon.startDate) throw new Error("Coupon is not yet active.");
        if (coupon.endDate && now2 > coupon.endDate) throw new Error("Coupon has expired.");
      }

      // Validate variants exist
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
        });
        if (!variant) throw new Error(`Variant not found for product ${item.name || item.id} (${item.size})`);
      }

      // Create order
      const order = await tx.order.create({
        data: {
          id: customId,
          customerName: fullName,
          phone: rawPhone,
          district,
          address,
          totalAmount: roundPrice(totalAmount),
          advancePaid: calculatedAdvance,
          deliveryCharge: deliveryCharge || 0,
          bkashNumber: bkashNumber || null,
          bkashTrxId: bkashTrxId || null,
          remarks: remarks || null,
          couponCode: sanitizedCoupon,
          discountAmount: discountAmount || 0,
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

      return order.id;
    });

    return NextResponse.json({ success: true, data: { orderId: result } }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 400 });
  }
}
