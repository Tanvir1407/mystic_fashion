-- AlterTable
ALTER TABLE "OrderItem" ADD COLUMN     "size" TEXT NOT NULL DEFAULT 'M',
ALTER COLUMN "variantId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "images" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "price" DOUBLE PRECISION,
ADD COLUMN     "purchasePrice" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "ProductVariant" ALTER COLUMN "sku" DROP NOT NULL;
