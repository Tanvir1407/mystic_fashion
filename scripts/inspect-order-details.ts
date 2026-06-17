import "./load-env";
import prisma from "../src/lib/prisma";

async function main() {
  const orders = await prisma.order.findMany({
    where: {
      id: { in: ["MJEPE-26061702", "MJEPE-26061701", "MJEPE-26060601"] }
    },
    include: {
      items: {
        include: {
          product: true,
          variant: true
        }
      }
    }
  });

  console.log("=== Inspecting Specific Orders ===");
  for (const order of orders) {
    console.log(`Order ID: ${order.id}`);
    console.log(`Customer: ${order.customerName}`);
    console.log(`Status: ${order.status}`);
    console.log(`Total: ${order.totalAmount}`);
    console.log(`Items:`);
    for (const item of order.items) {
      console.log(`  - Product: ${item.product.name}`);
      console.log(`    Quantity: ${item.quantity}`);
      console.log(`    Price: ${item.price}`);
      console.log(`    Variant ID: ${item.variantId}`);
      console.log(`    Variant Size: ${item.variant?.size}`);
      console.log(`    Variant Color: ${item.variant?.color}`);
      console.log(`    Variant Attributes:`, item.variant?.attributes);
    }
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
