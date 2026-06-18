import "./load-env";
import prisma from "../src/lib/prisma";

// ─── Usage ────────────────────────────────────────────────────────────────────
//   npx tsx scripts/backfill-orders.ts            # execute
//   npx tsx scripts/backfill-orders.ts --dry-run  # preview only
// ─────────────────────────────────────────────────────────────────────────────
//
// Strategy (cascade fallback):
//   1. Exact match   — productId + size + color
//   2. Size match    — productId + size, prefer color="Default", else first
//   3. Product match — any variant for the product (ordered by `order` ASC)
//   4. Unresolved    — logged; run heal-constraints.ts afterwards to assign
//                      a placeholder fallback variant for these items.
// ─────────────────────────────────────────────────────────────────────────────

const DRY_RUN = process.argv.includes("--dry-run");

// OrderItem.size and OrderItem.color are legacy columns removed from the
// Prisma schema. We must read them via $queryRaw.
type LegacyOrderItem = {
  id: string;
  orderId: string;
  productId: string;
  size: string | null;
  color: string | null;
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
  // variantId may be NULL (column was nullable when added via db push) or empty
  // string (inserted with a blank default). Both cases need backfilling.
  const rawItems = await prisma.$queryRaw<LegacyOrderItem[]>`
    SELECT id, "orderId", "productId", size, color, "variantId"
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
    const color = item.color && item.color.trim() !== "" ? item.color.trim() : null;

    let variant: { id: string } | null = null;

    // ── Strategy 1: exact match ────────────────────────────────────────────
    if (size && color) {
      variant = await prisma.productVariant.findUnique({
        where: {
          productId_size_color: {
            productId: item.productId,
            size,
            color,
          },
        },
        select: { id: true },
      });
    }

    // ── Strategy 2: size match, prefer "Default" color ─────────────────────
    if (!variant && size) {
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

    // ── Strategy 3: any variant for this product ────────────────────────────
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
        `[WARN] No variant found — OrderItem ${item.id} | Product ${item.productId} | Size: ${size ?? "null"} | Color: ${color ?? "null"}`
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
      console.log(
        `  OrderItem ${i.id} | Product ${i.productId} | Size: ${i.size ?? "null"}`
      )
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
