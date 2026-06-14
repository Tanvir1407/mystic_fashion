import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { pathaoClient } from "@/lib/pathao/PathaoClient";

const STATUS_LABELS: Record<string, string> = {
  PENDING: "Order Placed",
  CONFIRMED: "Confirmed",
  PRINTING: "Custom Printing",
  PACKAGING: "Packaged",
  SHIPPED: "Shipped",
  DELIVERED: "Delivered",
  RETURNED: "Returned",
  CANCELLED: "Cancelled",
  HOLD: "On Hold",
};

const STATUS_TIMELINE = ["PENDING", "CONFIRMED", "PRINTING", "PACKAGING", "SHIPPED", "DELIVERED"];

const orderSelect = {
  id: true,
  status: true,
  customerName: true,
  phone: true,
  district: true,
  address: true,
  totalAmount: true,
  advancePaid: true,
  deliveryCharge: true,
  discountAmount: true,
  createdAt: true,
  pathaoConsignmentId: true,
  items: {
    select: {
      id: true,
      size: true,
      quantity: true,
      price: true,
      requiresPrint: true,
      printName: true,
      printNumber: true,
      printCost: true,
      product: { select: { name: true, images: true, slug: true } },
    },
  },
} as const;

function formatOrder(order: any) {
  const currentIndex = STATUS_TIMELINE.indexOf(order.status);
  const timeline = STATUS_TIMELINE.map((s, i) => ({
    status: s,
    label: STATUS_LABELS[s] || s,
    completed: i <= currentIndex,
    active: i === currentIndex,
  }));

  return {
    id: order.id,
    status: order.status,
    statusLabel: STATUS_LABELS[order.status] || order.status,
    customerName: order.customerName,
    phone: order.phone,
    district: order.district,
    address: order.address,
    createdAt: order.createdAt,
    amounts: {
      total: order.totalAmount,
      advance: order.advancePaid,
      due: order.totalAmount - order.advancePaid,
      delivery: order.deliveryCharge,
      discount: order.discountAmount,
    },
    items: order.items.map((item: any) => ({
      id: item.id,
      productName: item.product.name,
      productImage: item.product.images?.[0] || null,
      productSlug: item.product.slug,
      size: item.size,
      quantity: item.quantity,
      price: item.price,
      requiresPrint: item.requiresPrint,
      printName: item.printName,
      printNumber: item.printNumber,
      printCost: item.printCost,
    })),
    timeline,
  };
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const id = searchParams.get("id")?.trim();
    const phone = searchParams.get("phone")?.trim();

    if (!id && !phone) {
      return NextResponse.json({ success: false, error: "Provide id or phone query parameter." }, { status: 400 });
    }

    // Track by order ID — returns single order
    if (id) {
      const order = await prisma.order.findFirst({
        where: { id, deletedAt: null },
        select: orderSelect,
      });

      if (!order) {
        return NextResponse.json({ success: false, error: "Order not found." }, { status: 404 });
      }

      let pathaoInfo = null;
      if (order.status === "SHIPPED" && order.pathaoConsignmentId) {
        try {
          pathaoInfo = await pathaoClient.getOrderInfo(order.pathaoConsignmentId);
        } catch {}
      }

      return NextResponse.json({ success: true, data: { order: formatOrder(order), pathaoInfo } });
    }

    // Track by phone — returns all orders (newest first)
    const clean = phone!.replace(/[^0-9]/g, "");
    const orders = await prisma.order.findMany({
      where: {
        deletedAt: null,
        OR: [
          { phone: { contains: phone! } },
          { phone: { contains: clean } },
          { phone: { endsWith: clean.slice(-9) } },
        ],
      },
      orderBy: { createdAt: "desc" },
      select: orderSelect,
    });

    if (orders.length === 0) {
      return NextResponse.json({ success: false, error: "No orders found for this phone number." }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: { orders: orders.map(formatOrder) } });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
