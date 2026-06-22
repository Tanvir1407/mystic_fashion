-- Add `isDefault` column to ComboConfiguration
ALTER TABLE "ComboConfiguration"
ADD COLUMN IF NOT EXISTS "isDefault" BOOLEAN NOT NULL DEFAULT false;
