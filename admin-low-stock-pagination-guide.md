# Adding Pagination to Low-Stock Page — Step-by-Step Guide

**Goal:** Convert the low-stock page from fetching all 100 products at once to server-side pagination like the brands page.

---

## Current State vs Target

| Aspect | Current (`low-stock`) | Target (like `brands`) |
|--------|----------------------|------------------------|
| Query params | None | `?page=1&limit=10` |
| Data fetch | `getLowStockProducts()` (hardcoded limit 100) | Page-aware with `skip`/`take` + `totalCount` |
| Pagination UI | None | `AdminPagination` component |
| Search | Client-side filter | Server-side (optional) |

---

## Step 1 — Add a `getLowStockProductsCount` function

**File:** `src/app/admin/actions.ts`

Add a count function next to the existing `getLowStockProducts`:

```ts
// After line 227
export async function getLowStockProductsCount() {
  const setting = await getInventorySettings();
  const threshold = setting.lowStockThreshold;

  return await prisma.product.count({
    where: { variants: { some: { stock: { lte: threshold } } } },
  });
}
```

---

## Step 2 — Update `page.tsx` to read query params and pass pagination props

**File:** `src/app/admin/inventory/low-stock/page.tsx`

```tsx
import { getInventorySettings, getLowStockProducts, getLowStockProductsCount } from "../../actions";
import InventoryClient from "./InventoryClient";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const revalidate = 0;

export default async function InventoryPage({
  searchParams,
}: {
  searchParams: { page?: string; limit?: string };
}) {
  const page = Number(searchParams?.page) || 1;
  const limit = Number(searchParams?.limit) || 10;
  const PER_PAGE = [10, 20, 50, 100].includes(limit) ? limit : 10;

  const [settings, lowStockProducts, totalCount] = await Promise.all([
    getInventorySettings(),
    getLowStockProducts({ page, limit: PER_PAGE }),
    getLowStockProductsCount(),
  ]);

  const totalPages = Math.ceil(totalCount / PER_PAGE);

  return (
    <div className="space-y-8">
      <InventoryClient
        initialSettings={settings}
        products={lowStockProducts}
        currentPage={page}
        totalPages={totalPages}
      />
    </div>
  );
}
```

**Changes from original:**
- Added `searchParams` to the function signature
- Parse `page` and `limit` from query params with defaults (1 and 10)
- Validate `limit` against `[10, 20, 50, 100]` 
- Fetch `totalCount` in parallel
- Calculate `totalPages`
- Pass `currentPage` and `totalPages` to `InventoryClient`

---

## Step 3 — Update `InventoryClient.tsx` props and add pagination

**File:** `src/app/admin/inventory/low-stock/InventoryClient.tsx`

### 3a — Update the component props

```tsx
import { AdminPagination } from "@/components/AdminPagination";

export default function InventoryClient({
  initialSettings,
  products,
  currentPage,
  totalPages,
}: {
  initialSettings: any;
  products: any[];
  currentPage: number;
  totalPages: number;
}) {
```

### 3b — Remove client-side search filtering (optional but recommended)

With server-side pagination, client-side filtering becomes misleading (it only filters the current page). Either:
- Remove the search input, or
- Convert search to a URL param (server-side filter)

If you keep it, the `filteredProducts` should remain, but note that pagination is based on the _unfiltered_ server data — which will confuse users. **Recommended**: make search server-side by passing a `search` query param.

### 3c — Add `AdminPagination` at the bottom of the table

Find the closing `</div>` of the table wrapper (around line 236) and add `<AdminPagination>` right before or after it:

```tsx
              </div>

              {/* Add pagination here */}
              <AdminPagination currentPage={currentPage} totalPages={totalPages} />
```

### 3d — Update the "Items At Risk" badge

Change the badge to show total count from server (since `filteredProducts` is now just the current page):

```tsx
<div className="px-3 py-2 bg-slate-100 rounded-md text-[10px] font-bold text-slate-500 uppercase tracking-widest whitespace-nowrap">
  {totalCount} Items At Risk
</div>
```

You'll need to pass `totalCount` as a prop, or use `products.length` with a note "Showing X of Y".

---

## Step 4 — (Optional) Update CSV Export

The CSV export currently iterates `products` (which would now only be the current page's data). Update it to use a separate function that fetches all low-stock products:

```tsx
const handleExportExcel = async () => {
  // Fetch ALL low-stock products for the full report
  const allProducts = await fetchLowStockProducts({ limit: 10000 }).then(r => r.json());
  // ... rest of export logic
};
```

---

## Summary of Changes

| File | Change |
|------|--------|
| `src/app/admin/actions.ts` | Add `getLowStockProductsCount()` function |
| `low-stock/page.tsx` | Read `searchParams`, compute pagination, pass `currentPage`+`totalPages` |
| `low-stock/InventoryClient.tsx` | Accept new props, import `AdminPagination`, render it |

No new files needed — `AdminPagination` already exists and is reusable.

---

## How It Will Work

```
User visits /admin/inventory/low-stock?page=2&limit=20
                                        │
                                        ▼
                    page.tsx reads: page=2, limit=20
                                        │
                    ┌────────────────────┼────────────────────┐
                    ▼                    ▼                    ▼
          getLowStockProducts    getLowStockProductsCount  getInventorySettings
          ({ page: 2,                                     (for threshold value)
            limit: 20 })                                   │
          skip=20, take=20                                  │
                    │                    │                    │
                    └────────────────────┼────────────────────┘
                                        ▼
                    InventoryClient receives:
                    products (page 2), currentPage=2, totalPages=...
                                        │
                                        ▼
                    AdminPagination renders page 2 highlighted
                    Links point to ?page=1&limit=20, ?page=3&limit=20, etc.
```
