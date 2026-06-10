import prisma from "@/lib/prisma";

/**
 * Generates a unique, stateless Order ID for the current date.
 * Format: M-YYMMDDXXXX (where XXXX is a 4-character random uppercase alphanumeric suffix)
 */
export async function generateOrderId(tx?: any): Promise<string> {
  // 1. Get current date in Asia/Dhaka timezone parts using Intl.DateTimeFormat
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Dhaka",
    year: "2-digit",
    month: "2-digit",
    day: "2-digit",
  });
  const parts = formatter.formatToParts(new Date());
  const year = parts.find(p => p.type === "year")!.value;
  const month = parts.find(p => p.type === "month")!.value;
  const date = parts.find(p => p.type === "day")!.value;
  const datePrefix = `M-${year}${month}${date}`;

  // 2. Generate 4 random uppercase alphanumeric characters (A-Z, 0-9)
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let randomSuffix = "";
  for (let i = 0; i < 4; i++) {
    randomSuffix += chars.charAt(Math.floor(Math.random() * chars.length));
  }

  return `${datePrefix}${randomSuffix}`;
}

/**
 * Executes a database transaction block inside a retry loop for Order ID unique key violations.
 * If a unique constraint failure on Order ID occurs, it retries with a new generated ID up to 5 times.
 * 
 * @param fn Callback containing the queries to execute in transaction
 * @param maxAttempts Max attempts to retry transaction on ID collision
 */
export async function executeOrderTransaction<T>(
  fn: (tx: any, orderId: string) => Promise<T>,
  maxAttempts = 5
): Promise<T> {
  let attempts = 0;
  while (attempts < maxAttempts) {
    attempts++;
    const orderId = await generateOrderId();
    try {
      return await prisma.$transaction(async (tx) => {
        return await fn(tx, orderId);
      });
    } catch (error: any) {
      const isUniqueConstraint =
        error.code === "P2002" &&
        (
          (Array.isArray(error.meta?.target) &&
            (error.meta.target.includes("id") ||
             error.meta.target.includes("Order_pkey") ||
             error.meta.target.some((t: string) => t.toLowerCase().includes("id") || t.toLowerCase().includes("pkey")))) ||
          error.message?.includes("Order_pkey") ||
          error.message?.includes("id")
        );

      if (isUniqueConstraint && attempts < maxAttempts) {
        console.warn(
          `Order ID collision detected on ID: ${orderId}. Retrying... (Attempt ${attempts} of ${maxAttempts})`
        );
        continue;
      }
      throw error;
    }
  }
  throw new Error(`Failed to create order after ${maxAttempts} attempts due to ID collisions.`);
}

