-- CreateEnum
CREATE TYPE "StockMovementType" AS ENUM ('RECEIPT', 'SALE', 'RETURN', 'TRANSFER', 'ADJUSTMENT');

-- AlterEnum
ALTER TYPE "CouponType" ADD VALUE 'FREE_SHIPPING';

-- DropForeignKey
ALTER TABLE "Subcategory" DROP CONSTRAINT "Subcategory_categoryId_fkey";

-- AlterTable
ALTER TABLE "Brand" ADD COLUMN     "deletedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Category" ADD COLUMN     "deletedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Coupon" ADD COLUMN     "customerSegment" TEXT,
ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "excludeSaleItems" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "excludedCategoryIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "excludedProductIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "includedCategoryIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "includedProductIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "maxCartValue" DOUBLE PRECISION,
ADD COLUMN     "maxDiscountAmount" DOUBLE PRECISION,
ADD COLUMN     "minCartValue" DOUBLE PRECISION,
ADD COLUMN     "usageLimitPerUser" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "usageLimitTotal" INTEGER;

-- AlterTable
ALTER TABLE "Customer" ADD COLUMN     "email" TEXT,
ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "otpCode" TEXT,
ADD COLUMN     "otpExpiresAt" TIMESTAMP(3),
ADD COLUMN     "passwordHash" TEXT;

-- AlterTable
ALTER TABLE "Discount" ADD COLUMN     "deletedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "HeroSlide" ADD COLUMN     "deletedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "commissionRate" DOUBLE PRECISION,
ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "tags" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- AlterTable
ALTER TABLE "OrderItem" ADD COLUMN     "variantId" TEXT;

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "trackStock" BOOLEAN DEFAULT false;

-- AlterTable
ALTER TABLE "ProductVariant" ADD COLUMN     "attributes" JSONB NOT NULL DEFAULT '{}',
ADD COLUMN     "qrCode" TEXT,
ADD COLUMN     "upc" TEXT;

-- AlterTable
ALTER TABLE "Purchase" ADD COLUMN     "deletedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Subcategory" ADD COLUMN     "deletedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Supplier" ADD COLUMN     "deletedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "CouponUsage" (
    "id" TEXT NOT NULL,
    "couponId" TEXT NOT NULL,
    "customerId" TEXT,
    "phone" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "discountAmount" DOUBLE PRECISION NOT NULL,
    "usedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CouponUsage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CouponLock" (
    "id" TEXT NOT NULL,
    "couponId" TEXT NOT NULL,
    "phone" TEXT,
    "sessionId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CouponLock_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomerAddress" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "district" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "pathaoCityId" INTEGER,
    "pathaoZoneId" INTEGER,
    "pathaoAreaId" INTEGER,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CustomerAddress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Warehouse" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Warehouse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Stock" (
    "id" TEXT NOT NULL,
    "variantId" TEXT NOT NULL,
    "warehouseId" TEXT NOT NULL,
    "physicalQuantity" INTEGER NOT NULL DEFAULT 0,
    "reservedQuantity" INTEGER NOT NULL DEFAULT 0,
    "availableQuantity" INTEGER NOT NULL DEFAULT 0,
    "version" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Stock_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockLedgerEntry" (
    "id" TEXT NOT NULL,
    "stockId" TEXT NOT NULL,
    "movementType" "StockMovementType" NOT NULL,
    "quantity" INTEGER NOT NULL,
    "previousPhysicalQuantity" INTEGER NOT NULL,
    "previousAvailableQuantity" INTEGER NOT NULL,
    "newPhysicalQuantity" INTEGER NOT NULL,
    "newAvailableQuantity" INTEGER NOT NULL,
    "referenceId" TEXT,
    "referenceType" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StockLedgerEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VariantPricingMatrix" (
    "id" TEXT NOT NULL,
    "variantId" TEXT NOT NULL,
    "costPrice" DECIMAL(12,2),
    "basePrice" DECIMAL(12,2) NOT NULL,
    "msrp" DECIMAL(12,2),
    "b2bPrice" DECIMAL(12,2),
    "tierPrices" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VariantPricingMatrix_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AttributeRegistry" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AttributeRegistry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CategoryAttributeMapping" (
    "id" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "attributeId" TEXT NOT NULL,
    "isRequired" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CategoryAttributeMapping_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MediaAsset" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "altText" TEXT,
    "boundAttributes" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MediaAsset_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CouponUsage_orderId_key" ON "CouponUsage"("orderId");

-- CreateIndex
CREATE INDEX "CouponUsage_couponId_idx" ON "CouponUsage"("couponId");

-- CreateIndex
CREATE INDEX "CouponUsage_customerId_idx" ON "CouponUsage"("customerId");

-- CreateIndex
CREATE INDEX "CouponUsage_phone_idx" ON "CouponUsage"("phone");

-- CreateIndex
CREATE INDEX "CouponLock_couponId_idx" ON "CouponLock"("couponId");

-- CreateIndex
CREATE INDEX "CouponLock_expiresAt_idx" ON "CouponLock"("expiresAt");

-- CreateIndex
CREATE INDEX "CouponLock_sessionId_idx" ON "CouponLock"("sessionId");

-- CreateIndex
CREATE INDEX "CouponLock_phone_idx" ON "CouponLock"("phone");

-- CreateIndex
CREATE INDEX "CustomerAddress_customerId_idx" ON "CustomerAddress"("customerId");

-- CreateIndex
CREATE UNIQUE INDEX "Warehouse_code_key" ON "Warehouse"("code");

-- CreateIndex
CREATE INDEX "Stock_variantId_idx" ON "Stock"("variantId");

-- CreateIndex
CREATE INDEX "Stock_warehouseId_idx" ON "Stock"("warehouseId");

-- CreateIndex
CREATE UNIQUE INDEX "Stock_variantId_warehouseId_key" ON "Stock"("variantId", "warehouseId");

-- CreateIndex
CREATE INDEX "StockLedgerEntry_stockId_idx" ON "StockLedgerEntry"("stockId");

-- CreateIndex
CREATE INDEX "StockLedgerEntry_createdAt_idx" ON "StockLedgerEntry"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "VariantPricingMatrix_variantId_key" ON "VariantPricingMatrix"("variantId");

-- CreateIndex
CREATE UNIQUE INDEX "AttributeRegistry_code_key" ON "AttributeRegistry"("code");

-- CreateIndex
CREATE INDEX "CategoryAttributeMapping_categoryId_idx" ON "CategoryAttributeMapping"("categoryId");

-- CreateIndex
CREATE INDEX "CategoryAttributeMapping_attributeId_idx" ON "CategoryAttributeMapping"("attributeId");

-- CreateIndex
CREATE UNIQUE INDEX "CategoryAttributeMapping_categoryId_attributeId_key" ON "CategoryAttributeMapping"("categoryId", "attributeId");

-- CreateIndex
CREATE INDEX "MediaAsset_productId_idx" ON "MediaAsset"("productId");

-- CreateIndex
CREATE INDEX "Brand_deletedAt_idx" ON "Brand"("deletedAt");

-- CreateIndex
CREATE INDEX "Category_deletedAt_idx" ON "Category"("deletedAt");

-- CreateIndex
CREATE INDEX "ChartOfAccount_name_idx" ON "ChartOfAccount"("name");

-- CreateIndex
CREATE INDEX "Coupon_deletedAt_idx" ON "Coupon"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Customer_email_key" ON "Customer"("email");

-- CreateIndex
CREATE INDEX "Discount_deletedAt_idx" ON "Discount"("deletedAt");

-- CreateIndex
CREATE INDEX "HeroSlide_deletedAt_idx" ON "HeroSlide"("deletedAt");

-- CreateIndex
CREATE INDEX "JournalLine_accountId_idx" ON "JournalLine"("accountId");

-- CreateIndex
CREATE INDEX "JournalLine_journalEntryId_idx" ON "JournalLine"("journalEntryId");

-- CreateIndex
CREATE INDEX "Order_status_idx" ON "Order"("status");

-- CreateIndex
CREATE INDEX "Order_createdAt_idx" ON "Order"("createdAt");

-- CreateIndex
CREATE INDEX "Order_deletedAt_idx" ON "Order"("deletedAt");

-- CreateIndex
CREATE INDEX "Order_customerId_idx" ON "Order"("customerId");

-- CreateIndex
CREATE INDEX "Order_phone_idx" ON "Order"("phone");

-- CreateIndex
CREATE INDEX "OrderItem_orderId_idx" ON "OrderItem"("orderId");

-- CreateIndex
CREATE INDEX "OrderItem_productId_idx" ON "OrderItem"("productId");

-- CreateIndex
CREATE INDEX "OrderItem_variantId_idx" ON "OrderItem"("variantId");

-- CreateIndex
CREATE INDEX "Product_deletedAt_idx" ON "Product"("deletedAt");

-- CreateIndex
CREATE INDEX "Product_brandId_idx" ON "Product"("brandId");

-- CreateIndex
CREATE INDEX "Product_categoryId_idx" ON "Product"("categoryId");

-- CreateIndex
CREATE INDEX "Product_subcategoryId_idx" ON "Product"("subcategoryId");

-- CreateIndex
CREATE UNIQUE INDEX "ProductVariant_upc_key" ON "ProductVariant"("upc");

-- CreateIndex
CREATE UNIQUE INDEX "ProductVariant_qrCode_key" ON "ProductVariant"("qrCode");

-- CreateIndex
CREATE INDEX "ProductVariant_productId_idx" ON "ProductVariant"("productId");

-- CreateIndex
CREATE INDEX "Purchase_deletedAt_idx" ON "Purchase"("deletedAt");

-- CreateIndex
CREATE INDEX "Purchase_supplierId_idx" ON "Purchase"("supplierId");

-- CreateIndex
CREATE INDEX "PurchaseItem_purchaseId_idx" ON "PurchaseItem"("purchaseId");

-- CreateIndex
CREATE INDEX "PurchaseItem_productId_idx" ON "PurchaseItem"("productId");

-- CreateIndex
CREATE INDEX "SalesReturn_orderId_idx" ON "SalesReturn"("orderId");

-- CreateIndex
CREATE INDEX "SalesReturn_orderItemId_idx" ON "SalesReturn"("orderItemId");

-- CreateIndex
CREATE INDEX "Subcategory_categoryId_idx" ON "Subcategory"("categoryId");

-- CreateIndex
CREATE INDEX "Subcategory_deletedAt_idx" ON "Subcategory"("deletedAt");

-- CreateIndex
CREATE INDEX "Supplier_deletedAt_idx" ON "Supplier"("deletedAt");

-- CreateIndex
CREATE INDEX "Transaction_accountId_idx" ON "Transaction"("accountId");

-- CreateIndex
CREATE INDEX "Transaction_referenceId_idx" ON "Transaction"("referenceId");

-- AddForeignKey
ALTER TABLE "Subcategory" ADD CONSTRAINT "Subcategory_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CouponUsage" ADD CONSTRAINT "CouponUsage_couponId_fkey" FOREIGN KEY ("couponId") REFERENCES "Coupon"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CouponUsage" ADD CONSTRAINT "CouponUsage_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CouponUsage" ADD CONSTRAINT "CouponUsage_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CouponLock" ADD CONSTRAINT "CouponLock_couponId_fkey" FOREIGN KEY ("couponId") REFERENCES "Coupon"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "ProductVariant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerAddress" ADD CONSTRAINT "CustomerAddress_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Stock" ADD CONSTRAINT "Stock_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "ProductVariant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Stock" ADD CONSTRAINT "Stock_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "Warehouse"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockLedgerEntry" ADD CONSTRAINT "StockLedgerEntry_stockId_fkey" FOREIGN KEY ("stockId") REFERENCES "Stock"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VariantPricingMatrix" ADD CONSTRAINT "VariantPricingMatrix_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "ProductVariant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CategoryAttributeMapping" ADD CONSTRAINT "CategoryAttributeMapping_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CategoryAttributeMapping" ADD CONSTRAINT "CategoryAttributeMapping_attributeId_fkey" FOREIGN KEY ("attributeId") REFERENCES "AttributeRegistry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MediaAsset" ADD CONSTRAINT "MediaAsset_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
