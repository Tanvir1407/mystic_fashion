import { OrderStatus } from "@/generated/prisma/client";

export function normalizePhone(raw: string): string {
  let p = raw.replace(/[\s\-\(\)\.]/g, "");
  if (p.startsWith("+880")) p = p.slice(4);
  else if (p.startsWith("880") && p.length === 13) p = p.slice(3);
  if (p.length === 10 && !p.startsWith("0")) p = "0" + p;
  return p;
}

export function validateStatusTransition(
  oldStatus: OrderStatus,
  newStatus: OrderStatus
): { isValid: boolean; error?: string } {
  if (oldStatus === newStatus) {
    return { isValid: true };
  }

  // 1. Locked states: Cancelled or Returned orders cannot be changed
  if (oldStatus === "CANCELLED" || oldStatus === "RETURNED") {
    return {
      isValid: false,
      error: `Order is ${oldStatus} and cannot be modified.`,
    };
  }

  // 2. Shipped orders can only go to Delivered or Returned
  if (oldStatus === "SHIPPED") {
    if (newStatus !== "DELIVERED" && newStatus !== "RETURNED") {
      return {
        isValid: false,
        error: "Shipped orders can only be updated to Delivered or Returned.",
      };
    }
  }

  // 3. Delivered orders can only go to Returned
  if (oldStatus === "DELIVERED") {
    if (newStatus !== "RETURNED") {
      return {
        isValid: false,
        error: "Delivered orders can only be updated to Returned.",
      };
    }
  }

  // 4. Can only revert to Pending from Confirmed, Printing, or Packaging status
  if (newStatus === "PENDING") {
    const allowedSourceStatuses: OrderStatus[] = ["CONFIRMED", "PRINTING", "PACKAGING"];
    if (!allowedSourceStatuses.includes(oldStatus)) {
      return {
        isValid: false,
        error: "Can only revert to Pending from Confirmed, Printing, or Packaging status.",
      };
    }
  }

  // 5. Delivered is only allowed from Shipped
  if (newStatus === "DELIVERED" && oldStatus !== "SHIPPED") {
    return {
      isValid: false,
      error: "Orders must be Shipped before they can be marked as Delivered.",
    };
  }

  // 6. Returned is only allowed from Shipped or Delivered
  if (newStatus === "RETURNED" && oldStatus !== "SHIPPED" && oldStatus !== "DELIVERED") {
    return {
      isValid: false,
      error: "Only Shipped or Delivered orders can be returned.",
    };
  }

  // 7. Cannot cancel Shipped or Delivered orders
  if (newStatus === "CANCELLED" && (oldStatus === "SHIPPED" || oldStatus === "DELIVERED")) {
    return {
      isValid: false,
      error: "Cannot cancel Shipped or Delivered orders.",
    };
  }

  return { isValid: true };
}


