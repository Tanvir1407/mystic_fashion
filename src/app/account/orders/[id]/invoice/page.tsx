import { getCustomerSession } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { redirect, notFound } from "next/navigation";
import InvoiceClient from "./InvoiceClient";
import { getFooterData } from "@/lib/footer";

export const dynamic = "force-dynamic";

export default async function CustomerInvoicePage({
  params
}: {
  params: { id: string };
}) {
  const session = await getCustomerSession();
  if (!session) {
    redirect("/auth/login?callbackUrl=/account");
  }

  // Fetch the order and verify that it belongs to the logged-in customer
  const order = await prisma.order.findUnique({
    where: { id: params.id },
    include: {
      items: {
        include: {
          product: {
            select: {
              name: true
            }
          },
          variant: {
            select: {
              size: true
            }
          }
        }
      }
    }
  });

  if (!order) {
    notFound();
  }

  // Secure authorization check
  if (order.customerId !== session.customerId) {
    redirect("/unauthorized");
  }

  // Calculations
  const baseSubtotal = order.items.reduce((acc, item) => acc + item.price * item.quantity, 0);
  const dtfTotal = order.items.reduce((acc, item) => acc + (item.requiresPrint ? (item.printCost || 0) * item.quantity : 0), 0);
  const discount = order.discountAmount || 0;
  const deliveryCharge = order.deliveryCharge || 0;

  // Serialize safely
  const serializedOrder = {
    id: order.id,
    customerName: order.customerName,
    phone: order.phone,
    address: order.address,
    district: order.district,
    totalAmount: order.totalAmount,
    advancePaid: order.advancePaid,
    deliveryCharge,
    discountAmount: discount,
    couponCode: order.couponCode,
    remarks: order.remarks,
    createdAt: order.createdAt.toISOString(),
    items: order.items.map((item) => ({
      id: item.id,
      quantity: item.quantity,
      price: item.price,
      size: item.variant?.size || "Default",
      product: {
        name: item.product?.name || "Product"
      },
      requiresPrint: item.requiresPrint,
      printName: item.printName || undefined,
      printNumber: item.printNumber || undefined,
      printCost: item.printCost || undefined
    }))
  };

  const footerData = await getFooterData();

  return (
    <InvoiceClient
      order={serializedOrder}
      baseSubtotal={baseSubtotal}
      dtfTotal={dtfTotal}
      discount={discount}
      deliveryCharge={deliveryCharge}
      footerData={footerData}
    />
  );
}
