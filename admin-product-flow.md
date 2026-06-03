# Admin Panel — Product Management Flow

## File Structure

```
src/app/admin/products/
├── actions.ts                        # Server actions (create, update, delete, restore, upload)
├── page.tsx                          # Product listing (server component)
├── ProductFilterClient.tsx           # Search/filter bar
├── ProductDeleteButton.tsx           # Delete (soft-delete) button
├── ProductRestoreButton.tsx          # Restore from trash button
├── new/
│   ├── page.tsx                      # New product page (server, fetches dropdowns)
│   └── ProductFormClient.tsx         # Main product form (client, 1042 lines)
├── edit/[id]/
│   └── page.tsx                      # Edit product page (server, loads product data)
└── [id]/
    ├── page.tsx                      # Product detail view (server, analytics + inventory)
    └── loading.tsx                   # Skeleton loader
```

---

## 1. Creating a Product

### Flow

1. **Navigate** to `/admin/products/new`
2. **Server page** (`new/page.tsx`) fetches:
   - All size charts
   - Active discounts
   - Brands (sorted A-Z)
   - Categories with subcategories (sorted A-Z)
3. **Renders** `ProductFormClient` with those dropdowns
4. User fills in the form and submits

### Form Fields

| Field | Type | Notes |
|-------|------|-------|
| **Product Name** | Text | Required |
| **Description** | Rich Text Editor | Bold, Italic, Underline, Lists, Undo/Redo |
| **Price** | Number | Required |
| **Images** | URL input | Enter URLs, up to 6 images |
| **Slug** | Auto-generated | Can be manually edited |
| **Brand** | Select | Dropdown with inline "Add New" option |
| **Category** | Select | Dropdown with inline "Add New" option |
| **Subcategory** | Select | Only shows subcategories of selected category, inline "Add New" |
| **Size Chart** | Select | Dropdown |
| **Discount** | Select | Only shows active discounts |
| **isFeatured** | Toggle | Boolean |
| **isPublished** | Toggle | Boolean (default true) |
| **isCustomize** | Toggle | DTF Print customization option |

### Variants Table

Each variant has (in the form state):

| Field | UI Input | Notes |
|-------|----------|-------|
| **Size** | Text input | Auto-uppercased. Required. |
| **SKU** | Text input | Optional, auto-uppercased |
| **Stock** | Number input | Only editable during **create**; **read-only on edit** |
| **Color** | No UI | Form state tracks it, but no input rendered. Hardcoded to `"Default"` on submit. |
| **ColorCode** | No UI | Form state tracks it, but no input rendered. Hardcoded to `undefined` on submit. |

- **Drag-and-drop** reordering via HTML5 Drag API
- **"Add Variant"** button appends a blank row
- **"Remove"** button (trash icon) deletes a variant row
- **Duplicate size check**: On submit, all variant sizes must be unique (case-insensitive)

---

## 2. Editing a Product

### Flow

1. **Navigate** to `/admin/products/edit/[id]`
2. **Server page** (`edit/[id]/page.tsx`):
   - Fetches product by ID with variants (sorted by `order` field)
   - If not found → `notFound()`
   - Fetches same dropdown data as new-product page
3. **Renders** `ProductFormClient` with `initialData` prop
4. Form is pre-populated with existing values
5. Changes are saved via `updateProduct` action

### Update Logic (in `actions.ts`)

- Uses `prisma.$transaction`
- **Upserts** each variant by compound unique key `(productId, size, color)`
- Since color is always `"Default"`, the key is effectively `(productId, size)`
- Then **deletes** any existing variants not in the upserted set
- Stock field is **read-only** in edit mode (message: "Stock managed by Purchases & Orders")

---

## 3. Viewing Products (List)

### URL: `/admin/products?page=1&limit=10&search=&category=&tab=active`

| Feature | Details |
|---------|---------|
| **Tabs** | "Active Products" / "Trash Bin" |
| **Search** | Filters by name, team, or category |
| **Category filter** | Dropdown to filter by category |
| **Pagination** | Configurable limit: 10, 20, 50, 100 |
| **Columns** | Product (name, badges), Price (selling + cost), Stock (color coded), Brand, Date |
| **Actions** | View, Edit, Delete (active) / Restore (trash) |

### Stock Color Coding
- **Green** (≥10): Adequate stock
- **Yellow** (1–9): Low stock
- **Red** (0): Out of stock

---

## 4. Product Detail View (`/admin/products/[id]`)

### Sections

1. **Header** — Product name, badges (Featured, Published/Draft, Deleted), Edit button
2. **Analytics Dashboard** — Cards showing:
   - Total Units Sold
   - Total Revenue
   - Current Stock (sum of all variants)
   - Total Purchases
   - Estimated Margin/Unit
3. **Product Details** — Two columns:
   - Left: Image gallery
   - Right: Description (HTML rendered), Brand, Category, Subcategory, Price, Purchase Price, Dates
4. **Recent Movement History** — Last 10 transactions (orders, adjustments, returns)
5. **Inventory Status** — Table of variants with Size + Stock, low-stock highlighting

---

## 5. Server Actions (`actions.ts`)

| Action | Method | Notes |
|--------|--------|-------|
| `createProduct` | `POST` | Logged via `withAuditLog`. Generates slug, creates variants. |
| `updateProduct` | `PATCH` | Transactional. Upserts variants by `(productId, size, color)` unique key. |
| `deleteProduct` | `DELETE` | Soft delete (sets `deletedAt`). |
| `restoreProduct` | `PATCH` | Sets `deletedAt: null`. |
| `uploadImage` | `POST` | Saves to `public/uploads/`. |
| `saveSizeChart` | `POST` | Create/update size chart. |
| `deleteSizeChart` | `DELETE` | Deletes a size chart. |

---

## 6. DB Schema — Product & Variant

### Product

| Field | Type | Notes |
|-------|------|-------|
| `id` | String (UUID) | PK |
| `name` | String | |
| `slug` | String? | Unique |
| `description` | String | HTML |
| `price` | Float | Selling price |
| `purchasePrice` | Float? | Cost |
| `images` | String[] | URLs |
| `team` | String? | Team name |
| `category` | String | Denormalized category name |
| `brandId` | String? | FK → Brand |
| `categoryId` | String? | FK → Category |
| `subcategoryId` | String? | FK → Subcategory |
| `sizeChartId` | String? | FK → SizeChart |
| `discountId` | String? | FK → Discount |
| `isFeatured` | Boolean | Default false |
| `isPublished` | Boolean | Default true |
| `isCustomize` | Boolean? | DTF Print |
| `deletedAt` | DateTime? | Soft delete |

### ProductVariant

| Field | Type | Notes |
|-------|------|-------|
| `id` | String (UUID) | PK |
| `productId` | String | FK → Product (Cascade) |
| `size` | String | e.g. "XL" |
| `color` | String | Default `"Default"` |
| `colorCode` | String? | Hex? — not exposed in UI |
| `sku` | String? | Unique |
| `stock` | Int | Default 0 |
| `order` | Int | Display order (drag-and-drop) |
| | | **Unique**: `(productId, size, color)` |

---

## 7. Key Observations

1. **Color & ColorCode** exist in the schema and form state but are **not rendered** in the UI. Every variant is created with `color: "Default"` and `colorCode: undefined`.

2. **Variant uniqueness** is enforced by `(productId, size, color)` — so with color fixed to `"Default"`, you cannot have two variants of the same size per product.

3. **Stock is write-once**: Can only be set during product creation. After that it's read-only in edit mode, managed entirely through purchase orders and sales.

4. **Delete is soft** (`deletedAt` timestamp), but the current `deleteProduct` action appears to use `prisma.product.delete()` (hard delete) — there may be a bug or middleware handling it.

5. **Slug** is auto-generated from product name and checked for uniqueness. If manually edited, auto-generation stops.
