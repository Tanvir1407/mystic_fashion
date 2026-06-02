import prisma from "../src/lib/prisma";
import bcrypt from "bcryptjs";

async function main() {
  console.log("Starting database clean and seed...");

  await prisma.$transaction(async (tx) => {
    // Step 1: Deep Clean (Deletion order matters to prevent FK constraint violations)
    console.log("Cleaning database tables...");

    await tx.transaction.deleteMany();
    console.log("- Deleted Transactions");

    await tx.salesReturn.deleteMany();
    console.log("- Deleted SalesReturns");

    await tx.stockAdjustment.deleteMany();
    console.log("- Deleted StockAdjustments");

    await tx.purchaseItem.deleteMany();
    console.log("- Deleted PurchaseItems");

    await tx.purchase.deleteMany();
    console.log("- Deleted Purchases");

    await tx.orderItem.deleteMany();
    console.log("- Deleted OrderItems");

    await tx.order.deleteMany();
    console.log("- Deleted Orders");

    await tx.productVariant.deleteMany();
    console.log("- Deleted ProductVariants");

    await tx.product.deleteMany();
    console.log("- Deleted Products");

    await tx.chartOfAccount.deleteMany();
    console.log("- Deleted ChartOfAccounts");

    await tx.discount.deleteMany();
    console.log("- Deleted Discounts");

    await tx.coupon.deleteMany();
    console.log("- Deleted Coupons");

    await tx.heroSlide.deleteMany();
    console.log("- Deleted HeroSlides");

    console.log("Clean complete! Seeding fresh test data...");

    // Step 2: Seed Fresh Test Data
    // 0. Create Admin user for login
    const adminPassword = await bcrypt.hash("admin123", 10);
    const admin = await tx.admin.upsert({
      where: { email: "admin@example.com" },
      update: {},
      create: {
        email: "admin@example.com",
        password: adminPassword,
        role: "SUPERADMIN",
      },
    });
    console.log(`- Created Admin: ${admin.email} (password: admin123)`);

    // 1. Create a Product
    const product = await tx.product.create({
      data: {
        name: "Argentina 2024 Home Kit",
        category: "Jersey",
        description: "Premium Quality Authentics",
        price: 1200,
        purchasePrice: 800,
        team: "Argentina",
        images: [],
      },
    });
    console.log(`- Created Product: ${product.name}`);

    // 2. Create a ProductVariant
    const variant = await tx.productVariant.create({
      data: {
        productId: product.id,
        size: "XL",
        stock: 10,
      },
    });
    console.log(`- Created Variant: Size ${variant.size}, Stock ${variant.stock}`);

    // 3. Create a Purchase Record
    const purchase = await tx.purchase.create({
      data: {
        supplierName: "Mystic Global Suppliers",
        totalAmount: 8000,
        status: "COMPLETED",
        items: {
          create: {
            productId: product.id,
            variantId: variant.id,
            quantity: 10,
            unitPrice: 800,
          },
        },
      },
    });
    console.log(`- Created Completed Purchase and PurchaseItem from supplier "${purchase.supplierName}"`);

  });

  console.log("Seeding process completed successfully!");
}

main()
  .catch((e) => {
    console.error("Error seeding database:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
