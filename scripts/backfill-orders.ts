import "./load-env";
import prisma from "../src/lib/prisma";

// ─── Usage ────────────────────────────────────────────────────────────────────
//   npx tsx scripts/backfill-orders.ts            # execute
//   npx tsx scripts/backfill-orders.ts --dry-run  # preview only
// ─────────────────────────────────────────────────────────────────────────────
//
// Old OrderItem had: productId + size (no color column, no variantId).
//
// Strategy (cascade fallback):
//   1. Size match    — productId + size, prefer color="Default", else first
//   2. Product match — any variant for the product (ordered by `order` ASC)
//   3. Unresolved    — logged; run heal-constraints.ts afterwards to assign
//                      a placeholder fallback variant for these items.
// ─────────────────────────────────────────────────────────────────────────────

const DRY_RUN = process.argv.includes("--dry-run");

// OrderItem.size is a legacy column removed from the Prisma schema.
// OrderItem had NO color column in the old schema.
// We must read size via $queryRaw.
type LegacyOrderItem = {
  id: string;
  orderId: string;
  productId: string;
  size: string | null;
  variantId: string | null;
};

type UnresolvedItem = {
  id: string;
  productId: string;
  size: string | null;
};

async function main() {
  console.log("=== ORDER ITEM VARIANT BACKFILL ===");
  console.log(`Mode     : ${DRY_RUN ? "DRY RUN (no writes)" : "EXECUTE"}`);
  console.log(`Goal     : Link legacy OrderItem rows to the correct ProductVariant\n`);

  // ─── Fetch unlinked order items ─────────────────────────────────────────────
  // variantId was added via db push as nullable TEXT. Old rows have NULL.
  // color column never existed in old OrderItem — do NOT select it.
  const rawItems = await prisma.$queryRaw<LegacyOrderItem[]>`
    SELECT id, "orderId", "productId", size, "variantId"
    FROM "OrderItem"
    WHERE "variantId" IS NULL
       OR "variantId" = ''
    ORDER BY "orderId" ASC
  `;

  console.log(`OrderItems needing variant link : ${rawItems.length}`);

  if (rawItems.length === 0) {
    console.log("✅ All OrderItems already have variantId set. Nothing to do.");
    return;
  }

  let linked = 0;
  let unresolved = 0;
  const unresolvedItems: UnresolvedItem[] = [];

  for (const item of rawItems) {
    const size = item.size && item.size.trim() !== "" ? item.size.trim() : null;

    let variant: { id: string } | null = null;

    // ── Strategy 1: size match, prefer "Default" color ─────────────────────
    // Old OrderItem had no color column. Match on productId + size, and among
    // those candidates prefer the "Default" color (the most common setup).
    if (size) {
      const candidates = await prisma.productVariant.findMany({
        where: { productId: item.productId, size },
        select: { id: true, color: true },
        orderBy: { order: "asc" },
      });

      if (candidates.length > 0) {
        variant =
          candidates.find((v) => v.color.toLowerCase() === "default") ??
          candidates[0];
      }
    }

    // ── Strategy 2: any variant for this product (size not found) ──────────
    if (!variant) {
      const candidates = await prisma.productVariant.findMany({
        where: { productId: item.productId },
        select: { id: true, color: true, size: true },
        orderBy: { order: "asc" },
        take: 1,
      });
      variant = candidates[0] ?? null;
    }

    // ── Unresolved ─────────────────────────────────────────────────────────
    if (!variant) {
      console.warn(
        `[WARN] No variant found — OrderItem ${item.id} | Product ${item.productId} | Size: ${size ?? "null"}`
      );
      unresolvedItems.push({ id: item.id, productId: item.productId, size });
      unresolved++;
      continue;
    }

    // ── Write ──────────────────────────────────────────────────────────────
    // Use $executeRaw to bypass the Prisma client's NOT NULL type guard.
    // The DB column may still be nullable from the original db push migration.
    if (!DRY_RUN) {
      await prisma.$executeRaw`
        UPDATE "OrderItem"
        SET "variantId" = ${variant.id}
        WHERE id = ${item.id}
      `;
    }

    linked++;

    if (linked % 100 === 0) {
      console.log(`  ...linked ${linked} items`);
    }
  }

  console.log("\n─── Backfill Summary ───────────────────────────────────────");
  console.log(`Linked       : ${linked} OrderItems updated`);
  console.log(`Unresolved   : ${unresolved} (no matching variant found)`);

  if (unresolvedItems.length > 0) {
    console.log(
      "\n[ACTION REQUIRED] The following OrderItems could not be matched."
    );
    console.log(
      "Run `npx tsx scripts/heal-constraints.ts` to assign them a placeholder variant:\n"
    );
    unresolvedItems.forEach((i) =>
      console.log(`  OrderItem ${i.id} | Product ${i.productId} | Size: ${i.size ?? "null"}`)
    );
  }

  console.log(
    DRY_RUN
      ? "\n[DRY RUN] No data was written to the database."
      : "\n✅ Completed successfully."
  );
}

main()
  .catch((e) => {
    console.error("\n[FATAL]", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
