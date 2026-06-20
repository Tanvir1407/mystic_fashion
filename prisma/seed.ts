import "dotenv/config";
import prisma from "../src/lib/prisma";
import bcrypt from "bcryptjs";

async function main() {
  console.log("Starting database clean and seed...");

  await prisma.$transaction(
    async (tx) => {
      // ── Clean ──────────────────────────────────────────────────────────────
      console.log("Cleaning tables...");
      await tx.transaction.deleteMany();
      await tx.salesReturn.deleteMany();
      await tx.stockAdjustment.deleteMany();
      await tx.purchaseItem.deleteMany();
      await tx.purchase.deleteMany();
      await tx.orderItem.deleteMany();
      await tx.order.deleteMany();
      await tx.variantPricingMatrix.deleteMany();
      await tx.stock.deleteMany();
      await tx.productVariant.deleteMany();
      await tx.mediaAsset.deleteMany();
      await tx.product.deleteMany();
      await tx.subcategory.deleteMany();
      await tx.category.deleteMany();
      await tx.brand.deleteMany();
      await tx.chartOfAccount.deleteMany();
      await tx.discount.deleteMany();
      await tx.coupon.deleteMany();
      await tx.heroSlide.deleteMany();
      await tx.admin.deleteMany();
      console.log("Clean complete.");

      // ── Warehouse ─────────────────────────────────────────────────────────
      const warehouse = await tx.warehouse.upsert({
        where: { code: "MAIN" },
        update: {},
        create: {
          code: "MAIN",
          name: "Main Warehouse",
          address: "H# 68, R# 12, Sector 10, Uttara, Dhaka",
          isActive: true,
        },
      });
      console.log(`Warehouse: ${warehouse.name} (${warehouse.code})`);

      // ── Admin ─────────────────────────────────────────────────────────────
      const passwordHash = await bcrypt.hash("admin123", 10);
      const admin = await tx.admin.create({
        data: {
          email: "admin@mystic.com",
          password: passwordHash,
          role: "SUPERADMIN",
        },
      });
      console.log(`Admin: ${admin.email} / admin123`);

      // ── Categories ────────────────────────────────────────────────────────
      const catJersey = await tx.category.create({
        data: { name: "Jersey", sortOrder: 1 },
      });
      const catTshirt = await tx.category.create({
        data: { name: "T-Shirt", sortOrder: 2 },
      });
      const catHoodie = await tx.category.create({
        data: { name: "Hoodie", sortOrder: 3 },
      });

      const subHome = await tx.subcategory.create({
        data: { name: "Home Kit", categoryId: catJersey.id },
      });
      const subAway = await tx.subcategory.create({
        data: { name: "Away Kit", categoryId: catJersey.id },
      });
      const subGraphic = await tx.subcategory.create({
        data: { name: "Graphic Tee", categoryId: catTshirt.id },
      });

      console.log("Categories & subcategories created.");

      // ── Brands ────────────────────────────────────────────────────────────
      const brandAdidas = await tx.brand.create({ data: { name: "Adidas" } });
      const brandNike = await tx.brand.create({ data: { name: "Nike" } });
      const brandMystic = await tx.brand.create({ data: { name: "Mystic" } });

      console.log("Brands created.");

      // ── Helper: create variant with pricing + stock ───────────────────────
      const addVariant = async (
        productId: string,
        opts: {
          size: string;
          color?: string;
          colorCode?: string;
          sku: string;
          basePrice: number;
          costPrice: number;
          stock: number;
          order?: number;
        }
      ) => {
        return tx.productVariant.create({
          data: {
            productId,
            size: opts.size,
            color: opts.color ?? "Default",
            colorCode: opts.colorCode,
            sku: opts.sku,
            order: opts.order ?? 0,
            pricingMatrix: {
              create: {
                basePrice: opts.basePrice,
                costPrice: opts.costPrice,
              },
            },
            stocks: {
              create: {
                warehouseId: warehouse.id,
                physicalQuantity: opts.stock,
                availableQuantity: opts.stock,
                reservedQuantity: 0,
                version: 0,
              },
            },
          },
        });
      };

      // ── Product 1: Argentina 2024 Home Jersey ─────────────────────────────
      // Size prices differ (XL/XXL cost more)
      const p1 = await tx.product.create({
        data: {
          name: "Argentina 2024 Home Jersey",
          slug: "argentina-2024-home-jersey",
          category: "Jersey",
          description:
            "Official-style Argentina 2024 Home Kit. Light blue and white stripes, breathable dry-fit fabric.",
          team: "Argentina",
          brandId: brandAdidas.id,
          categoryId: catJersey.id,
          subcategoryId: subHome.id,
          isFeatured: true,
          featuredOrder: 1,
          isPublished: true,
          trackStock: true,
        },
      });

      await addVariant(p1.id, { size: "S",   sku: "ARG-24-HOME-S",   basePrice: 1100, costPrice: 650,  stock: 15, order: 0 });
      await addVariant(p1.id, { size: "M",   sku: "ARG-24-HOME-M",   basePrice: 1100, costPrice: 650,  stock: 20, order: 1 });
      await addVariant(p1.id, { size: "L",   sku: "ARG-24-HOME-L",   basePrice: 1100, costPrice: 650,  stock: 18, order: 2 });
      await addVariant(p1.id, { size: "XL",  sku: "ARG-24-HOME-XL",  basePrice: 1200, costPrice: 700,  stock: 12, order: 3 });
      await addVariant(p1.id, { size: "XXL", sku: "ARG-24-HOME-XXL", basePrice: 1350, costPrice: 780,  stock: 8,  order: 4 });
      console.log(`Product 1 created: ${p1.name} (5 variants, prices 1100–1350)`);

      // ── Product 2: Brazil 2024 Away Jersey ────────────────────────────────
      const p2 = await tx.product.create({
        data: {
          name: "Brazil 2024 Away Jersey",
          slug: "brazil-2024-away-jersey",
          category: "Jersey",
          description:
            "Brazil 2024 Away Kit in all-white with green accents. Lightweight performance fabric.",
          team: "Brazil",
          brandId: brandNike.id,
          categoryId: catJersey.id,
          subcategoryId: subAway.id,
          isFeatured: true,
          featuredOrder: 2,
          isPublished: true,
          trackStock: true,
        },
      });

      await addVariant(p2.id, { size: "S",   sku: "BRZ-24-AWAY-S",   basePrice: 1050, costPrice: 620, stock: 10, order: 0 });
      await addVariant(p2.id, { size: "M",   sku: "BRZ-24-AWAY-M",   basePrice: 1050, costPrice: 620, stock: 22, order: 1 });
      await addVariant(p2.id, { size: "L",   sku: "BRZ-24-AWAY-L",   basePrice: 1050, costPrice: 620, stock: 16, order: 2 });
      await addVariant(p2.id, { size: "XL",  sku: "BRZ-24-AWAY-XL",  basePrice: 1150, costPrice: 680, stock: 9,  order: 3 });
      await addVariant(p2.id, { size: "XXL", sku: "BRZ-24-AWAY-XXL", basePrice: 1300, costPrice: 750, stock: 5,  order: 4 });
      console.log(`Product 2 created: ${p2.name} (5 variants, prices 1050–1300)`);

      // ── Product 3: Real Madrid 2024 Home Jersey ───────────────────────────
      const p3 = await tx.product.create({
        data: {
          name: "Real Madrid 2024 Home Jersey",
          slug: "real-madrid-2024-home-jersey",
          category: "Jersey",
          description:
            "Classic white Real Madrid home jersey for the 2024 season. Slim-fit tailored design.",
          team: "Real Madrid",
          brandId: brandAdidas.id,
          categoryId: catJersey.id,
          subcategoryId: subHome.id,
          isFeatured: true,
          featuredOrder: 3,
          isPublished: true,
          trackStock: true,
        },
      });

      await addVariant(p3.id, { size: "S",   sku: "RMA-24-HOME-S",   basePrice: 1200, costPrice: 700, stock: 8,  order: 0 });
      await addVariant(p3.id, { size: "M",   sku: "RMA-24-HOME-M",   basePrice: 1200, costPrice: 700, stock: 14, order: 1 });
      await addVariant(p3.id, { size: "L",   sku: "RMA-24-HOME-L",   basePrice: 1200, costPrice: 700, stock: 12, order: 2 });
      await addVariant(p3.id, { size: "XL",  sku: "RMA-24-HOME-XL",  basePrice: 1320, costPrice: 760, stock: 7,  order: 3 });
      await addVariant(p3.id, { size: "XXL", sku: "RMA-24-HOME-XXL", basePrice: 1450, costPrice: 830, stock: 4,  order: 4 });
      console.log(`Product 3 created: ${p3.name} (5 variants, prices 1200–1450)`);

      // ── Product 4: Mystic Essential Tee (multi-color, size-based price) ───
      const p4 = await tx.product.create({
        data: {
          name: "Mystic Essential Tee",
          slug: "mystic-essential-tee",
          category: "T-Shirt",
          description:
            "Everyday premium cotton tee. Available in black and white. Oversized fit.",
          brandId: brandMystic.id,
          categoryId: catTshirt.id,
          subcategoryId: subGraphic.id,
          isFeatured: false,
          isPublished: true,
          trackStock: true,
        },
      });

      // Black variants
      await addVariant(p4.id, { size: "S",   color: "Black", colorCode: "#000000", sku: "MYS-TEE-BLK-S",   basePrice: 550,  costPrice: 280, stock: 20, order: 0 });
      await addVariant(p4.id, { size: "M",   color: "Black", colorCode: "#000000", sku: "MYS-TEE-BLK-M",   basePrice: 550,  costPrice: 280, stock: 25, order: 1 });
      await addVariant(p4.id, { size: "L",   color: "Black", colorCode: "#000000", sku: "MYS-TEE-BLK-L",   basePrice: 550,  costPrice: 280, stock: 18, order: 2 });
      await addVariant(p4.id, { size: "XL",  color: "Black", colorCode: "#000000", sku: "MYS-TEE-BLK-XL",  basePrice: 620,  costPrice: 320, stock: 12, order: 3 });
      await addVariant(p4.id, { size: "XXL", color: "Black", colorCode: "#000000", sku: "MYS-TEE-BLK-XXL", basePrice: 700,  costPrice: 360, stock: 6,  order: 4 });
      // White variants
      await addVariant(p4.id, { size: "S",   color: "White", colorCode: "#FFFFFF", sku: "MYS-TEE-WHT-S",   basePrice: 550,  costPrice: 280, stock: 18, order: 5 });
      await addVariant(p4.id, { size: "M",   color: "White", colorCode: "#FFFFFF", sku: "MYS-TEE-WHT-M",   basePrice: 550,  costPrice: 280, stock: 22, order: 6 });
      await addVariant(p4.id, { size: "L",   color: "White", colorCode: "#FFFFFF", sku: "MYS-TEE-WHT-L",   basePrice: 550,  costPrice: 280, stock: 15, order: 7 });
      await addVariant(p4.id, { size: "XL",  color: "White", colorCode: "#FFFFFF", sku: "MYS-TEE-WHT-XL",  basePrice: 620,  costPrice: 320, stock: 10, order: 8 });
      await addVariant(p4.id, { size: "XXL", color: "White", colorCode: "#FFFFFF", sku: "MYS-TEE-WHT-XXL", basePrice: 700,  costPrice: 360, stock: 4,  order: 9 });
      console.log(`Product 4 created: ${p4.name} (10 variants, Black & White, prices 550–700)`);

      // ── Product 5: Mystic Oversized Hoodie ────────────────────────────────
      const p5 = await tx.product.create({
        data: {
          name: "Mystic Oversized Hoodie",
          slug: "mystic-oversized-hoodie",
          category: "Hoodie",
          description:
            "Heavy GSM fleece hoodie with kangaroo pocket. Boxy oversized silhouette.",
          brandId: brandMystic.id,
          categoryId: catHoodie.id,
          isFeatured: false,
          isPublished: true,
          trackStock: true,
        },
      });

      await addVariant(p5.id, { size: "S",   color: "Olive",  colorCode: "#6B7645", sku: "MYS-HOOD-OLV-S",   basePrice: 1400, costPrice: 800, stock: 8,  order: 0 });
      await addVariant(p5.id, { size: "M",   color: "Olive",  colorCode: "#6B7645", sku: "MYS-HOOD-OLV-M",   basePrice: 1400, costPrice: 800, stock: 12, order: 1 });
      await addVariant(p5.id, { size: "L",   color: "Olive",  colorCode: "#6B7645", sku: "MYS-HOOD-OLV-L",   basePrice: 1400, costPrice: 800, stock: 10, order: 2 });
      await addVariant(p5.id, { size: "XL",  color: "Olive",  colorCode: "#6B7645", sku: "MYS-HOOD-OLV-XL",  basePrice: 1550, costPrice: 880, stock: 6,  order: 3 });
      await addVariant(p5.id, { size: "XXL", color: "Olive",  colorCode: "#6B7645", sku: "MYS-HOOD-OLV-XXL", basePrice: 1700, costPrice: 950, stock: 3,  order: 4 });
      await addVariant(p5.id, { size: "S",   color: "Charcoal", colorCode: "#36454F", sku: "MYS-HOOD-CHR-S",   basePrice: 1400, costPrice: 800, stock: 7,  order: 5 });
      await addVariant(p5.id, { size: "M",   color: "Charcoal", colorCode: "#36454F", sku: "MYS-HOOD-CHR-M",   basePrice: 1400, costPrice: 800, stock: 10, order: 6 });
      await addVariant(p5.id, { size: "L",   color: "Charcoal", colorCode: "#36454F", sku: "MYS-HOOD-CHR-L",   basePrice: 1400, costPrice: 800, stock: 8,  order: 7 });
      await addVariant(p5.id, { size: "XL",  color: "Charcoal", colorCode: "#36454F", sku: "MYS-HOOD-CHR-XL",  basePrice: 1550, costPrice: 880, stock: 5,  order: 8 });
      await addVariant(p5.id, { size: "XXL", color: "Charcoal", colorCode: "#36454F", sku: "MYS-HOOD-CHR-XXL", basePrice: 1700, costPrice: 950, stock: 2,  order: 9 });
      console.log(`Product 5 created: ${p5.name} (10 variants, Olive & Charcoal, prices 1400–1700)`);

      // ── Purchases ─────────────────────────────────────────────────────────
      // Fetch variant IDs for purchase records
      const p1Variants = await tx.productVariant.findMany({ where: { productId: p1.id } });
      const p2Variants = await tx.productVariant.findMany({ where: { productId: p2.id } });
      const p4Variants = await tx.productVariant.findMany({ where: { productId: p4.id } });

      await tx.purchase.create({
        data: {
          supplierName: "Sports Gear BD",
          totalAmount: p1Variants.reduce((s) => s + 700 * 10, 0),
          status: "COMPLETED",
          items: {
            create: p1Variants.map((v) => ({
              productId: p1.id,
              variantId: v.id,
              quantity: 10,
              unitPrice: 700,
            })),
          },
        },
      });

      await tx.purchase.create({
        data: {
          supplierName: "Football Hub Dhaka",
          totalAmount: p2Variants.reduce((s) => s + 650 * 8, 0),
          status: "COMPLETED",
          items: {
            create: p2Variants.map((v) => ({
              productId: p2.id,
              variantId: v.id,
              quantity: 8,
              unitPrice: 650,
            })),
          },
        },
      });

      await tx.purchase.create({
        data: {
          supplierName: "Mystic In-House",
          totalAmount: p4Variants.reduce((s) => s + 300 * 15, 0),
          status: "COMPLETED",
          items: {
            create: p4Variants.map((v) => ({
              productId: p4.id,
              variantId: v.id,
              quantity: 15,
              unitPrice: 300,
            })),
          },
        },
      });

      console.log("Purchases created.");
    },
    { timeout: 30000 }
  );

  console.log("\nSeed complete!");
  console.log("  Admin login: admin@mystic.com / admin123");
  console.log("  Products: 5 (Argentina Jersey, Brazil Jersey, Real Madrid Jersey, Essential Tee, Oversized Hoodie)");
  console.log("  Each product has 5–10 variants with size-based pricing differences");
}

main()
  .catch((e) => {
    console.error("Seed error:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
