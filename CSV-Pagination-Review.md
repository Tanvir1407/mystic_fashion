# CSV & Pagination Review — Mystic Fashion Admin

## File Reviewed
- `src/app/admin/products/new/page.tsx` — This file is a **server component** that fetches data and renders `<ProductFormClient>`. It contains **zero CSV or pagination logic**.

---

## 1. CSV Export Implementation

**Location:** `src/app/admin/inventory/low-stock/InventoryClient.tsx:41-90`

### How it works
- Calls `getAllLowStockProducts()` (from `src/app/admin/actions.ts:184`) which fetches **all** low-stock products (no pagination).
- Dynamically collects all unique sizes across products.
- Sorts sizes with a predefined order: `S, M, L, XL, 2XL, 3XL`, then any extras.
- Builds CSV string manually:
  - Header: `Product, <size1>, <size2>, ...`
  - Rows: Product name (quoted) + stock per size.
- Generates a `Blob` and triggers download via a temporary `<a>` element.
- Filename: `Low_Stock_Report_<date>.csv`

### Issues
| # | Issue | Severity | Suggestion |
|---|-------|----------|------------|
| 1 | **No pagination in export** — `getAllLowStockProducts()` fetches every matching product. If the table has 10K+ low-stock products, this could timeout or crash. | Medium | Add paginated export or stream the CSV. |
| 2 | **No BOM for non-ASCII** — CSV is encoded as UTF-8 without a BOM. If product names contain Bengali or other non-Latin characters, Excel may not display them correctly. | Low | Prepend `\uFEFF` to the CSV string for Excel compatibility. |
| 3 | **Size column sorting is weak** — The predefined sort only covers 6 sizes; anything else is appended unsorted. | Low | Use a natural sort for the remaining sizes. |
| 4 | **No sanitization of product names** — If a product name contains a comma or double quote, the CSV breaks. The name is wrapped in `""` but internal `"` chars are not escaped. | Low | Use a helper to escape commas, quotes, and newlines. |

---

## 2. Pagination Implementation

### 2a. Products List Page
**Location:** `src/app/admin/products/page.tsx`

- **Server-side** pagination using Prisma's `skip`/`take`.
- Default: 10 per page.
- Query params: `?page=N&limit=N` (limit must be one of `10, 20, 50, 100`).
- Page number is derived from `searchParams.page || 1`.
- `totalPages = Math.ceil(totalCount / PER_PAGE)`.

### 2b. AdminPagination Component
**Location:** `src/components/AdminPagination.tsx`

- **Client component** using `useSearchParams()` for URL-based navigation.
- Features:
  - Previous / Next links.
  - Page number buttons (max 5 visible with ellipsis).
  - "Show per page" dropdown (10/20/50/100) — resets to page 1 on change.
  - Responsive: separate mobile (prev/next only) and desktop layouts.
  - Returns `null` if `totalPages === 0`.

### 2c. Low-Stock Inventory Page
**Location:** `src/app/admin/inventory/low-stock/InventoryClient.tsx`

- Also uses `<AdminPagination>` at line 271.
- Also uses `searchParams` for `page` and `limit` (server-side).

### Issues
| # | Issue | Severity | Suggestion |
|---|-------|----------|------------|
| 1 | **No loading/skeleton state** — The pagination links do a full navigation. There's no Suspense or loading UI between page transitions. | Medium | Wrap the table in `<Suspense>` and add a skeleton loader. |
| 2 | **Duplicate size sort logic** — `InventoryClient.tsx` repeats the sort logic in two places (export fn + main render). | Low | Extract to a shared utility. |
| 3 | **Filter resets page to 1** (`ProductFilterClient.tsx:28`) — Correct behavior, but the filter does not preserve the `limit` param when resetting the page. | Low | Preserve existing `limit` when resetting page. |

---

## 3. Recommendation Summary

### Quick fixes (5 min each)
1. Prepend `\uFEFF` BOM to CSV for Excel compatibility.
2. Escape commas/quotes in product names for CSV.

### Medium effort
1. Add pagination to `getAllLowStockProducts()` or add a "Export All" confirmation.
2. Add loading skeletons during page transitions.

### Architecture note
The CSV export only lives on the **Low Stock Inventory** page, not on the main Products list. If you want CSV export on the Products listing page, you'd need a similar export function in `src/app/admin/products/actions.ts`.
