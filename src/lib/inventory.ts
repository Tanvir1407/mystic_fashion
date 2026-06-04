import { Prisma, StockMovementType } from "@/generated/prisma/client";

interface StockUpdateInput {
  variantId: string;
  quantityChange?: number; // relative change (+/-)
  absoluteQuantity?: number; // set to absolute value
  movementType: StockMovementType;
  referenceId?: string;
  referenceType?: string;
}

export async function updateStockDualWrite(
  tx: Prisma.TransactionClient,
  input: StockUpdateInput
) {
  const { variantId, quantityChange, absoluteQuantity, movementType, referenceId, referenceType } = input;
  const warehouseCode = "WH-MAIN";

  // 1. Resolve Warehouse
  const warehouse = await tx.warehouse.findUnique({
    where: { code: warehouseCode },
  });
  if (!warehouse) {
    throw new Error(`Warehouse with code '${warehouseCode}' not found.`);
  }

  // 2. Fetch Stock with OCC Version
  let stock = await tx.stock.findUnique({
    where: {
      variantId_warehouseId: {
        variantId,
        warehouseId: warehouse.id,
      },
    },
  });

  // If stock doesn't exist for some reason, initialize it
  if (!stock) {
    stock = await tx.stock.create({
      data: {
        variantId,
        warehouseId: warehouse.id,
        physicalQuantity: 0,
        availableQuantity: 0,
        reservedQuantity: 0,
        version: 0,
      },
    });
  }

  const previousPhysical = stock.physicalQuantity;
  const previousAvailable = stock.availableQuantity;

  let newPhysical = previousPhysical;
  let newAvailable = previousAvailable;
  let change = 0;

  if (absoluteQuantity !== undefined) {
    newPhysical = absoluteQuantity;
    newAvailable = absoluteQuantity;
    change = absoluteQuantity - previousPhysical;
  } else if (quantityChange !== undefined) {
    change = quantityChange;
    newPhysical = previousPhysical + change;
    newAvailable = previousAvailable + change;
  } else {
    throw new Error("Either quantityChange or absoluteQuantity must be provided.");
  }

  // Allow negative stock only if tracked stock is disabled, but by default we guard
  // We will let the business logic validate if stock can go below zero.
  // For safety, we raise an error if subtraction exceeds available stock when checking out
  if (movementType === "SALE" && newAvailable < 0) {
    throw new Error(`Insufficient stock. Available: ${previousAvailable}, Requested: ${Math.abs(change)}`);
  }

  // 3. Perform OCC Update
  const updateResult = await tx.stock.updateMany({
    where: {
      id: stock.id,
      version: stock.version,
    },
    data: {
      physicalQuantity: newPhysical,
      availableQuantity: newAvailable,
      version: { increment: 1 },
    },
  });

  if (updateResult.count === 0) {
    throw new Error(`OCC Concurrency Conflict: Stock for variant ${variantId} was updated by another transaction. Please retry.`);
  }

  // 4. Create Immutable Ledger Entry
  await tx.stockLedgerEntry.create({
    data: {
      stockId: stock.id,
      movementType,
      quantity: change,
      previousPhysicalQuantity: previousPhysical,
      previousAvailableQuantity: previousAvailable,
      newPhysicalQuantity: newPhysical,
      newAvailableQuantity: newAvailable,
      referenceId: referenceId || null,
      referenceType: referenceType || null,
    },
  });

  return {
    previousPhysical,
    newPhysical,
    change,
  };
}
