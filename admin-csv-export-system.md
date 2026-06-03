# CSV Export System — Documentation

The project has a single CSV export feature: **Low Stock Report** in the inventory admin panel.

---

## Current Implementation

**File:** `src/app/admin/inventory/low-stock/InventoryClient.tsx:38-57`

### Trigger

A button in the header toolbar (line 85-91):
```tsx
<button onClick={handleExportExcel} ...>
  <FileSpreadsheet className="w-4 h-4 text-emerald-500" />
  Export CSV
</button>
```

### How It Works

**Step 1 — Collect all unique sizes across products**

```tsx
const allSizes = Array.from(
  new Set(products.flatMap(p => p.variants.map((v: any) => v.size)))
);
```

- Iterates all products → all variants → extracts unique `size` values
- `products` is the paginated array from props (⚠️ see Issue below)

**Step 2 — Sort sizes in a fixed order**

```tsx
const sortedSizes = [
  "S", "M", "L", "XL", "2XL", "3XL",
  ...allSizes.filter(s => !["S", "M", "L", "XL", "2XL", "3XL"].includes(s))
];
```

- Hardcoded order for standard sizes: S, M, L, XL, 2XL, 3XL
- Any non-standard sizes (e.g. "XS", "4XL", "One Size") are appended at the end

**Step 3 — Build CSV string**

```tsx
let csv = "Product," + sortedSizes.join(",") + "\n";

products.forEach(product => {
  let row = `"${product.name}"`;
  sortedSizes.forEach(size => {
    const variant = product.variants.find((v: any) => v.size === size);
    row += `,${variant ? variant.stock : ""}`;
  });
  csv += row + "\n";
});
```

- Header row: `Product, S, M, L, XL, 2XL, 3XL`
- Data rows: product name (quoted) + stock per size (blank if size doesn't exist)

**Step 4 — Trigger download via Blob + anchor click**

```tsx
const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
const link = document.createElement("a");
const url = URL.createObjectURL(blob);
link.setAttribute("href", url);
link.setAttribute("download", `Low_Stock_Report_${new Date().toISOString().split('T')[0]}.csv`);
link.style.visibility = "hidden";
document.body.appendChild(link);
link.click();
document.body.removeChild(link);
```

- Wraps CSV string in a `Blob` with MIME type `text/csv`
- Creates a temporary `<a>` element pointing to the Blob URL
- Filename: `Low_Stock_Report_YYYY-MM-DD.csv`
- Programmatically clicks the link → browser downloads the file
- Cleans up the link element

---

## Example Output

```
Product,S,M,L,XL,2XL,3XL
"Argentina 2024 Home Kit",,10,,,
"Brazil 2024 Home Kit",5,8,12,6,,
"Germany 2024 Away Kit",3,7,15,9,4,
```

---

## CSV Format Specs

| Detail | Value |
|--------|-------|
| Delimiter | `,` (comma) |
| Text qualifier | `"` (double quotes) |
| Header row | `Product` + sorted sizes |
| Missing data | Empty cell (blank) |
| Encoding | UTF-8 |
| Filename | `Low_Stock_Report_YYYY-MM-DD.csv` |
| MIME type | `text/csv;charset=utf-8;` |

---

## Known Issue — Only Exports Current Page

Since pagination was added, `products` now contains **only the current page** (default 10 items). The CSV export is limited to those items.

**To fix:** Fetch all low-stock products server-side for export. Options:

**Option A — Server action for full export:**
```tsx
// actions.ts
export async function exportLowStockCSV() {
  const setting = await getInventorySettings();
  const threshold = setting.lowStockThreshold;
  const products = await prisma.product.findMany({
    where: { variants: { some: { stock: { lte: threshold } } } },
    include: { variants: true },
    orderBy: { name: "asc" },
  });
  // Build CSV server-side and return as string
}
```

**Option B — Client fetches all data on export:**
```tsx
const handleExportExcel = async () => {
  const res = await fetch("/api/inventory/low-stock/export");
  const csv = await res.text();
  // ... blob download
};
```

---

## Print Report (Related)

The "Print Report" button (`handlePrint`, line 59) simply calls `window.print()`. There is no CSV generation involved — it triggers the browser's native print dialog for the table on screen.
