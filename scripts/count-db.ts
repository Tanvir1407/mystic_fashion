import "./load-env";
import prisma from "../src/lib/prisma";

async function main() {
  console.log("Checking DB counts...");
  const tables = [
    "product",
    "productVariant",
    "order",
    "orderItem",
    "purchase",
    "purchaseItem",
    "customer",
    "customerAddress",
    "staff",
    "discount",
    "coupon",
    "transaction",
  ];

  for (const table of tables) {
    try {
      const count = await (prisma as any)[table].count();
      console.log(`${table}: ${count}`);
    } catch (e: any) {
      console.error(`Error counting ${table}:`, e.message);
    }
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
