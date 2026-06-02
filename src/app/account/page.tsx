import { getCustomerSession } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { redirect } from "next/navigation";
import AccountClient from "./AccountClient";
import { getFooterData } from "@/lib/footer";

export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const session = await getCustomerSession();
  if (!session) {
    redirect("/auth/login?callbackUrl=/account");
  }

  // Fetch customer profile with order history and saved addresses
  const customer = await prisma.customer.findUnique({
    where: { id: session.customerId },
    include: {
      orders: {
        orderBy: { createdAt: "desc" },
        include: {
          items: {
            include: {
              product: {
                select: {
                  name: true,
                  images: true
                }
              }
            }
          }
        }
      },
      addresses: {
        orderBy: { isDefault: "desc" }
      }
    }
  });

  if (!customer) {
    // Session is invalid if user has been deleted
    redirect("/auth/login?callbackUrl=/account");
  }

  const footerData = await getFooterData();

  // Serialize models safely for client component hydration
  const serializedCustomer = {
    id: customer.id,
    name: customer.name,
    phone: customer.phone,
    email: customer.email,
    createdAt: customer.createdAt.toISOString()
  };

  const serializedAddresses = customer.addresses.map((addr) => ({
    id: addr.id,
    label: addr.label,
    fullName: addr.fullName,
    phone: addr.phone,
    district: addr.district,
    address: addr.address,
    pathaoCityId: addr.pathaoCityId,
    pathaoZoneId: addr.pathaoZoneId,
    pathaoAreaId: addr.pathaoAreaId,
    isDefault: addr.isDefault
  }));

  const serializedOrders = customer.orders.map((order) => ({
    id: order.id,
    status: order.status,
    totalAmount: order.totalAmount,
    advancePaid: order.advancePaid,
    deliveryCharge: order.deliveryCharge,
    discountAmount: order.discountAmount,
    couponCode: order.couponCode,
    remarks: order.remarks,
    address: order.address,
    customerName: order.customerName,
    phone: order.phone,
    pathaoConsignmentId: order.pathaoConsignmentId,
    createdAt: order.createdAt.toISOString(),
    items: order.items.map((item) => ({
      id: item.id,
      size: item.size,
      quantity: item.quantity,
      price: item.price,
      requiresPrint: item.requiresPrint,
      printName: item.printName,
      printNumber: item.printNumber,
      product: {
        name: item.product?.name || "Product",
        image: item.product?.images?.[0] || null
      }
    }))
  }));

  return (
    <AccountClient
      customer={serializedCustomer}
      initialAddresses={serializedAddresses}
      orders={serializedOrders}
      footerData={footerData}
    />
  );
}
