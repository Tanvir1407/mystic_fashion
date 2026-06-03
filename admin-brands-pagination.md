# Brands Page — Pagination Flow

**URL:** `/admin/inventory/brands?page=1&limit=10&tab=active`

**Files involved:**

| File | Role |
|------|------|
| `src/app/admin/inventory/brands/page.tsx` | Server component — reads query params, fetches data |
| `src/app/admin/inventory/brands/BrandsClient.tsx` | Client component — renders table + pagination |
| `src/components/AdminPagination.tsx` | Reusable pagination UI component |

---

## 1. Server Page (`page.tsx`)

### Query Params Read

```ts
searchParams: { page?: string; limit?: string; tab?: string }
```

| Param | Default | Purpose |
|-------|---------|---------|
| `page` | `1` | Current page number |
| `limit` | `10` | Items per page (validated: 10, 20, 50, 100) |
| `tab` | `"active"` | Filter: `"active"` or `"trash"` |

### Where Clause

```ts
const whereClause = tab === "trash"
  ? { deletedAt: { not: null } }
  : {};  // active brands (deletedAt is null)
```

### Prisma Query (Offset-based)

```ts
prisma.brand.findMany({
  where: whereClause,
  orderBy: { name: "asc" },
  skip: (page - 1) * PER_PAGE,  // offset
  take: PER_PAGE,                // limit
});
```

Also fetches `totalCount` in parallel:

```ts
prisma.brand.count({ where: whereClause });
```

Calculates `totalPages = Math.ceil(totalCount / PER_PAGE)`.

### Props Passed to Client

```tsx
<BrandsClient
  brands={brands}
  currentPage={page}
  totalPages={totalPages}
  currentTab={tab}
  canCreate={canCreate}
  canEdit={canEdit}
  canDelete={canDelete}
/>
```

---

## 2. Client Component (`BrandsClient.tsx`)

### Rendering the Paginator

At the bottom of the table:

```tsx
<AdminPagination currentPage={currentPage} totalPages={totalPages} />
```

### Tab Switching Resets Page

Both tab buttons set `page=1` when switching:

```tsx
params.set("tab", "active");
params.set("page", "1");
router.push(`/admin/inventory/brands?${params.toString()}`);
```

---

## 3. AdminPagination Component (`AdminPagination.tsx`)

### Props

```ts
{ totalPages: number, currentPage: number }
```

### Reads current `limit` from URL

```ts
const limitVal = searchParams.get("limit");
const limit = limitVal && ["10", "20", "50", "100"].includes(limitVal) ? limitVal : "10";
```

### Page Navigation

Creates page URLs by cloning current `searchParams` and setting `page`:

```ts
const createPageURL = (pageNumber: number | string) => {
  const params = new URLSearchParams(searchParams);
  params.set("page", pageNumber.toString());
  return `${pathname}?${params.toString()}`;
};
```

Uses **`<Link>`** components (not programmatic navigation), so pages are pre-fetched by Next.js.

### Limit Changer

Dropdown with options `[10, 20, 50, 100]`. Changing it:

1. Resets `page` to `1`
2. Pushes new URL via `router.push()` (full navigation)

### Page Number Display

Shows **up to 5 page buttons** with ellipsis:

- Always shows first and last page
- Shows current page ± 1
- Shows `...` for gaps

```
Example (30 pages, current=15):
1 ... 14 15 16 ... 30
```

### Previous/Next

| State | Behavior |
|-------|----------|
| First page | Prev button disabled (grey, `cursor-not-allowed`) |
| Last page | Next button disabled |
| Middle | Prev/Next are `<Link>` tags navigating to `page-1` / `page+1` |

### States Covered

| State | Handling |
|-------|----------|
| **0 items / 0 pages** | `if (totalPages === 0) return null` — paginator not rendered |
| **1 page** | Page buttons hidden; Previous/Next disabled; only "Page 1 of 1" + limit selector shown |
| **Multiple pages** | Full pagination UI rendered |
| **Mobile** | Separate simplified layout: just Previous/Next buttons (no page numbers), page info, limit selector |
| **First page** | Prev is a disabled `<span>`, not a link |
| **Last page** | Next is a disabled `<span>`, not a link |
| **Limit change** | `page` reset to 1, `router.push()` navigation |

---

## Data Flow Diagram

```
User clicks page 3
        │
        ▼
<Link href="/admin/inventory/brands?page=3&limit=10&tab=active">
        │
        ▼ (Next.js server re-renders)
page.tsx reads searchParams
        │
        ├─ page = 3, limit = 10, tab = "active"
        ├─ skip = (3-1)*10 = 20, take = 10
        ├─ prisma.brand.findMany({ skip: 20, take: 10 })
        └─ totalPages = ceil(totalCount / 10)
        │
        ▼
BrandsClient receives currentPage={3}, totalPages={...}
        │
        ▼
AdminPagination renders page 3 highlighted
```
