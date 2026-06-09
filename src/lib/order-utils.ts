/**
 * Generates a unique, concurrency-safe Order ID for the current date.
 * Format: MJEPE-YYMMDDXX
 * If the daily order count exceeds 99, it scales naturally (e.g., 100, 101, 10000...)
 * 
 * Uses PostgreSQL transaction-level advisory locks to guarantee that concurrent transactions
 * do not generate the same ID.
 * 
 * @param tx Prisma transaction client
 */
export async function generateOrderId(tx: any): Promise<string> {
  // 1. Get current date in Asia/Dhaka timezone
  const nowInDhaka = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Dhaka" }));
  const year = nowInDhaka.getFullYear().toString().slice(-2);
  const month = (nowInDhaka.getMonth() + 1).toString().padStart(2, "0");
  const date = nowInDhaka.getDate().toString().padStart(2, "0");
  const datePrefix = `MJEPE-${year}${month}${date}`;

  // 2. Acquire a transaction-level advisory lock on the date prefix.
  // Lock category: 1001 (arbitrary unique namespace for Order ID generation)
  // Lock key: Date as an integer (YYMMDD), which fits safely inside 32-bit int.
  const lockCategory = 1001;
  const lockKey = parseInt(`${year}${month}${date}`, 10);
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(${lockCategory}, ${lockKey})`;

  // 3. Find the last order of the day (including soft-deleted ones to avoid ID collisions).
  const lastOrderRows = await tx.$queryRaw`
    SELECT id FROM "Order"
    WHERE id LIKE ${datePrefix + '%'}
    ORDER BY "createdAt" DESC
    LIMIT 1
  `;
  const lastOrder = lastOrderRows[0] || null;

  // 4. Calculate the next sequence number
  let nextNum = 1;
  if (lastOrder) {
    const maxNum = parseInt(lastOrder.id.replace(datePrefix, ""), 10) || 0;
    nextNum = maxNum + 1;
  }

  // 5. Pad with at least 2 digits (e.g. 01, 02... 99, 100, 101)
  const numStr = nextNum < 10 ? `0${nextNum}` : nextNum.toString();
  return `${datePrefix}${numStr}`;
}
