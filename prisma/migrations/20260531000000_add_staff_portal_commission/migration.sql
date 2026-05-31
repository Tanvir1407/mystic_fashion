-- AlterTable
ALTER TABLE "Staff" ADD COLUMN "commissionRate" DOUBLE PRECISION,
ADD COLUMN "hasPortalAccess" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "CommissionSetting" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "commissionRate" DOUBLE PRECISION NOT NULL DEFAULT 10,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CommissionSetting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommissionPayment" (
    "id" TEXT NOT NULL,
    "staffId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "note" TEXT,
    "paidAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "paidById" TEXT,

    CONSTRAINT "CommissionPayment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CommissionPayment_staffId_idx" ON "CommissionPayment"("staffId");

-- CreateIndex
CREATE INDEX "CommissionPayment_year_month_idx" ON "CommissionPayment"("year", "month");

-- AddForeignKey
ALTER TABLE "CommissionPayment" ADD CONSTRAINT "CommissionPayment_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "Staff"("id") ON DELETE CASCADE ON UPDATE CASCADE;
