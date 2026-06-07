import { NextRequest, NextResponse } from "next/server";
import { getCustomerSessionFromRequest } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const session = await getCustomerSessionFromRequest(req);
    if (!session || !session.customerId) {
      return NextResponse.json({ success: false, error: "Unauthorized." }, { status: 401 });
    }

    const { customerId } = session;

    // Fetch customer's orders
    const orders = await prisma.order.findMany({
      where: { customerId, deletedAt: null },
      orderBy: { createdAt: "desc" },
      include: {
        items: {
          include: {
            product: {
              select: {
                name: true,
                mediaAssets: {
                  orderBy: { sortOrder: "asc" }
                }
              }
            },
            variant: {
              select: {
                size: true,
                color: true
              }
            }
          }
        }
      }
    });

    const serializedOrders = orders.map((order) => ({
      id: order.id,
      status: order.status,
      totalAmount: Number(order.totalAmount),
      advancePaid: Number(order.advancePaid),
      deliveryCharge: Number(order.deliveryCharge),
      discountAmount: Number(order.discountAmount),
      couponCode: order.couponCode,
      remarks: order.remarks,
      address: order.address,
      customerName: order.customerName,
      phone: order.phone,
      pathaoConsignmentId: order.pathaoConsignmentId,
      createdAt: order.createdAt.toISOString(),
      items: order.items.map((item) => ({
        id: item.id,
        size: item.variant?.size || "Default",
        quantity: item.quantity,
        price: Number(item.price),
        requiresPrint: item.requiresPrint,
        printName: item.printName,
        printNumber: item.printNumber,
        product: {
          name: item.product?.name || "Product",
          image: item.product?.mediaAssets?.[0]?.url || null
        }
      }))
    }));

    return NextResponse.json({
      success: true,
      orders: serializedOrders
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "An unexpected error occurred." },
      { status: 500 }
    );
  }
}
