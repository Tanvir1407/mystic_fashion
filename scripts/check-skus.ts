import "./load-env";
import prisma from "../src/lib/prisma";

async function main() {
  const nullSkuCount = await prisma.productVariant.count({
    where: { sku: null }
  });
  console.log(`Variants with null SKUs: ${nullSkuCount}`);

  const nullVariantIdCount = await prisma.orderItem.count({
    where: { variantId: null }
  });
  console.log(`OrderItem records with null variantId: ${nullVariantIdCount}`);
}

main().finally(() => prisma.$disconnect());
