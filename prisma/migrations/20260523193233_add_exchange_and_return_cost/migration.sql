-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "exchangeItemNote" TEXT,
ADD COLUMN     "exchangeRefOrderId" TEXT,
ADD COLUMN     "isExchange" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "SalesReturn" ADD COLUMN     "returnCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "returnCostPaid" BOOLEAN NOT NULL DEFAULT false;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_exchangeRefOrderId_fkey" FOREIGN KEY ("exchangeRefOrderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;
