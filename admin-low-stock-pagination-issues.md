# Low-Stock Pagination — Known Issues & Edge Cases

## Issue 1 — Import Order is Messy

**File:** `src/app/admin/inventory/low-stock/page.tsx`

```tsx
import InventoryClient from "./InventoryClient";   // line 1

import{getInventorySettings, getLowStockProducts, getLowStockProductsCount} from "../../actions";  // line 3
```

- Local import comes before the third-party action import
- Missing space after `import` keyword on line 3
- Extra blank line between them

**Fix:** Reorder and clean up:
```tsx
import { getInventorySettings, getLowStockProducts, getLowStockProductsCount } from "../../actions";
import InventoryClient from "./InventoryClient";
```

---

## Issue 2 — Client-Side Search Only Filters Current Page

**File:** `InventoryClient.tsx:66-69`

```tsx
const filteredProducts = products.filter(p => 
  p.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
  p.team?.toLowerCase().includes(searchQuery.toLowerCase())
);
```

`products` is now the **current page only** (10 items by default). So the search only finds products on that page. Products on other pages are invisible to the search.

**Impact:**
- User searches for "Barcelona" — might show "0 results" even if Barcelona exists on page 5
- The **"X Items At Risk" badge** at line 160 shows `filteredProducts.length` — this is the count of matches on the **current page only**, not the total across all pages

**Fix options:**
- **Option A** — Remove client-side search entirely (simplest)
- **Option B** — Convert search to a URL query param and do server-side filtering (like the brands page)
- **Option C** — Keep it but change the badge to show `products.length` (current page count) instead of `filteredProducts.length`

---

## Issue 3 — CSV Export Only Exports Current Page

**File:** `InventoryClient.tsx:38-58`

```tsx
const handleExportExcel = () => {
  const allSizes = Array.from(new Set(products.flatMap(...)));
  // products is only the current page!
  products.forEach(product => { ... });
};
```

**Impact:** The exported CSV only contains whatever page the user is currently viewing. If there are 50 low-stock products and the user is on page 1 (10 items), only 10 items are exported.

**Fix:** Need to fetch ALL low-stock products separately, or move export to a server action.

---

## Issue 4 — Print View Only Shows Current Page

**File:** `InventoryClient.tsx:243-277`

The print view (`hidden print:block`) iterates over `filteredProducts`, which is the current page's data. Printed reports will be incomplete.

---

## Issue 5 — Current Page May Exceed Total Pages After Threshold Change

**Scenario:**
1. User is on page 5 with threshold = 5 (many low-stock products)
2. Changes threshold to 2 (fewer low-stock products → fewer pages)
3. `updateInventorySettings` calls `router.refresh()`
4. Server re-renders: page 5, but totalPages is now 2
5. `getLowStockProducts({ page: 5, limit: 10 })` returns an **empty array**
6. `AdminPagination` shows page 5 of 2 — and there are no products to show

**Impact:** Empty table with confusing pagination state.

**Fix:** In `page.tsx`, clamp the current page:
```tsx
const page = Math.min(
  Number(searchParams?.page) || 1,
  Math.max(1, totalPages)
);
```
But this needs to be done **after** `totalPages` is calculated — so it requires restructuring: fetch count first, then clamp, then fetch products.

---

## Issue 6 — `getLowStockProductsCount` Has Redundant `getInventorySettings` Call

**File:** `actions.ts:138-145`

```tsx
export async function getLowStockProductsCount() {
  const setting = await getInventorySettings();  // DB read
  const threshold = setting.lowStockThreshold;
  return await prisma.product.count({
    where: { variants: { some: { stock: { lte: threshold } } } },
  });
}
```

In `page.tsx`, `getInventorySettings()` is already called in the same `Promise.all`. So the settings are fetched **twice** — once explicitly, once inside `getLowStockProductsCount`.

**Impact:** One extra DB query per page load. Minor but unnecessary.

**Fix:** Pass the threshold as a parameter instead:
```tsx
export async function getLowStockProductsCount(threshold: number) {
  return await prisma.product.count({
    where: { variants: { some: { stock: { lte: threshold } } } },
  });
}
```

Then in page.tsx:
```tsx
const settings = await getInventorySettings();
const [lowStockProducts, totalCount] = await Promise.all([
  getLowStockProducts({ page, limit: PER_PAGE }),
  getLowStockProductsCount(settings.lowStockThreshold),
]);
```

---

## Summary of Severity

| # | Issue | Severity |
|---|-------|----------|
| 1 | Import order/style | Cosmetic |
| 2 | Search only filters current page | **Medium** |
| 3 | CSV exports only current page | **High** |
| 4 | Print view only current page | **Medium** |
| 5 | Page exceeds total after threshold change | **Low** |
| 6 | Redundant DB query | **Low** |
