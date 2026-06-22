-- AlterTable
ALTER TABLE "Product"
ADD COLUMN "isCombo" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "comboRequiredQty" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "ComboConfiguration" (
    "id" TEXT NOT NULL,
    "parentProductId" TEXT NOT NULL,
    "childProductId" TEXT NOT NULL,
    "maxQuantity" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ComboConfiguration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderItemComboSelection" (
    "id" TEXT NOT NULL,
    "orderItemId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "OrderItemComboSelection_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ComboConfiguration_parentProductId_idx" ON "ComboConfiguration"("parentProductId");

-- CreateIndex
CREATE UNIQUE INDEX "ComboConfiguration_parentProductId_childProductId_key" ON "ComboConfiguration"("parentProductId", "childProductId");

-- CreateIndex
CREATE INDEX "OrderItemComboSelection_orderItemId_idx" ON "OrderItemComboSelection"("orderItemId");

-- AddForeignKey
ALTER TABLE "ComboConfiguration" ADD CONSTRAINT "ComboConfiguration_parentProductId_fkey" FOREIGN KEY ("parentProductId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComboConfiguration" ADD CONSTRAINT "ComboConfiguration_childProductId_fkey" FOREIGN KEY ("childProductId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItemComboSelection" ADD CONSTRAINT "OrderItemComboSelection_orderItemId_fkey" FOREIGN KEY ("orderItemId") REFERENCES "OrderItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItemComboSelection" ADD CONSTRAINT "OrderItemComboSelection_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
