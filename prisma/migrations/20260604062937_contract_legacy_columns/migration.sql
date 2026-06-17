/*
  Warnings:

  - You are about to drop the column `size` on the `OrderItem` table. All the data in the column will be lost.
  - You are about to drop the column `images` on the `Product` table. All the data in the column will be lost.
  - You are about to drop the column `price` on the `Product` table. All the data in the column will be lost.
  - You are about to drop the column `purchasePrice` on the `Product` table. All the data in the column will be lost.
  - You are about to drop the column `stock` on the `ProductVariant` table. All the data in the column will be lost.
  - Made the column `variantId` on table `OrderItem` required. This step will fail if there are existing NULL values in that column.
  - Made the column `sku` on table `ProductVariant` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "OrderItem" DROP COLUMN "size",
ALTER COLUMN "variantId" SET NOT NULL;

-- AlterTable
ALTER TABLE "Product" DROP COLUMN "images",
DROP COLUMN "price",
DROP COLUMN "purchasePrice";

-- AlterTable
ALTER TABLE "ProductVariant" DROP COLUMN "stock",
ALTER COLUMN "sku" SET NOT NULL;
