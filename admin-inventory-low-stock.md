# Low Stock Inventory Page — Documentation

**URL:** `/admin/inventory/low-stock`

**Files involved:**

| File | Role |
|------|------|
| `src/app/admin/inventory/low-stock/page.tsx` | Server component — fetches settings & products |
| `src/app/admin/inventory/low-stock/InventoryClient.tsx` | Client component — UI + interactions (280 lines) |
| `src/app/admin/actions.ts` | Server actions — `getInventorySettings`, `getLowStockProducts`, `updateInventorySettings` |

---

## Server Page (`page.tsx`)

```tsx
export default async function InventoryPage() {
  const [settings, lowStockProducts] = await Promise.all([
    getInventorySettings(),
    getLowStockProducts(),
  ]);
  return <InventoryClient initialSettings={settings} products={lowStockProducts} />;
}
```

- Forces **dynamic rendering** (`force-dynamic`, `force-no-store`, `revalidate = 0`)
- Fetches two things in parallel:
  1. **Inventory settings** (the low-stock threshold)
  2. **Low stock products** (products with at least one variant at or below threshold)

---

## Data Flow

### `getInventorySettings()` (`actions.ts:139`)

```ts
prisma.inventorySetting.upsert({
  where: { id: "default" },
  update: {},
  create: { id: "default", lowStockThreshold: 5 },
});
```

- Uses the `InventorySetting` model (singleton, id = `"default"`)
- Returns `{ id, lowStockThreshold, updatedAt }`
- Default threshold is **5** if none exists

### `getLowStockProducts()` (`actions.ts:214`)

```ts
prisma.product.findMany({
  where: {
    variants: { some: { stock: { lte: threshold } } }
  },
  include: { variants: true },
  orderBy: { updatedAt: "desc" },
  take: 100,
});
```

- Finds any **product** that has **at least one variant** with `stock <= threshold`
- Includes **all variants** (not just the low-stock ones)
- Returns max **100** products, sorted by most recently updated

### `updateInventorySettings(threshold)` (`actions.ts:147`)

- Upserts the threshold value
- Audit-logged via `withAuditLog`
- Revalidates `/admin/inventory`

---

## UI Breakdown (`InventoryClient.tsx`)

### Layout: 2 Columns
- **Left (1/4)**: Threshold settings card + info box
- **Right (3/4)**: Search bar + product table

### Left Column

**Threshold Setting Card**
- Number input bound to `threshold` state
- "Update Rule" button — calls `updateInventorySettings(threshold)`
- Button disabled when value hasn't changed or while pending
- Shows spinner during save

**Info Box** (amber)
- Displays current threshold value
- Explains what the threshold means

### Right Column

**Search Bar**
- Filters products by `name` or `team` (client-side)
- Shows item count badge (e.g. "2 Items At Risk")

**Product Table** (screen view)

| Column | Content |
|--------|---------|
| **Product** | Thumbnail (or "No Img" fallback) + name + team + category |
| **Inventory Status** | Variant pills: `S: 2 🔻` (red if low, grey if ok) |
| **Actions** | "Manage" link → `/admin/products/edit/[id]` |

**Variant pills** — Each variant shows `Size: Stock`. If `stock <= threshold`, pill is:
- Red background (`bg-red-50`) + trending-down icon
- Otherwise grey and muted

**Print View** (hidden on screen, shown when printing)

- Matrix table: rows = products, columns = sizes (S, M, L, XL, 2XL, 3XL)
- Low-stock cells highlighted red
- Includes report header with date and threshold info

### Export CSV

- Generates a CSV with columns: `Product, S, M, L, XL, 2XL, 3XL, ...`
- Each row shows stock per size (blank if no variant for that size)
- Downloads as `Low_Stock_Report_YYYY-MM-DD.csv`

---

## DB Schema — `InventorySetting`

```
model InventorySetting {
  id                String   @id @default("default")
  lowStockThreshold Int      @default(5)
  updatedAt         DateTime @updatedAt
}
```

Singleton record — only one row with `id = "default"`.

---

## Key Observations

1. **No pagination in UI** — `getLowStockProducts` returns max 100, but the table shows all at once
2. **Client-side filtering only** — search filters by name/team on the client, no server-side search
3. **Stock threshold is global** — one threshold for all products, can't set per-product
4. **Print view uses a matrix layout** — rows = products, columns = sizes, good for physical inventory checks
5. **Screen view is per-variant pills** — better for quick scanning of individual variant stock levels
