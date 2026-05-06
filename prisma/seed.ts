import prisma from "../src/lib/prisma";

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

    // 4. Create Two Test Orders
    // Order 1: Standard Order (No customization, requiresPrint: false)
    const order1 = await tx.order.create({
      data: {
        customerName: "Tanvir",
        phone: "01712345678",
        address: "Dhaka, Bangladesh",
        totalAmount: 1200,
        status: "SHIPPED",
        items: {
          create: {
            productId: product.id,
            size: "XL",
            quantity: 1,
            price: 1200,
            requiresPrint: false,
          },
        },
      },
    });
    console.log(`- Created Order 1 (Standard) for customer "${order1.customerName}"`);

    // Order 2: Customized Order (requiresPrint: true, printCost: 300)
    const order2 = await tx.order.create({
      data: {
        customerName: "Sabbir",
        phone: "01812345678",
        address: "Chittagong, Bangladesh",
        totalAmount: 1500,
        status: "SHIPPED",
        items: {
          create: {
            productId: product.id,
            size: "XL",
            quantity: 1,
            price: 1200,
            requiresPrint: true,
            printName: "MESSI",
            printNumber: "10",
            printCost: 300,
          },
        },
      },
    });
    console.log(`- Created Order 2 (Customized) for customer "${order2.customerName}"`);
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
