# MediaAsset — Product Image Management

## Schema

```prisma
model MediaAsset {
  id              String   @id @default(uuid())
  productId       String
  url             String
  altText         String?
  isPrimary       Boolean  @default(false)
  sortOrder       Int      @default(0)
  boundAttributes Json?    // e.g. {"color": "Red"} or {"size": "L", "color": "Blue"}
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  product Product @relation(fields: [productId], references: [id], onDelete: Cascade)

  @@unique([productId, url])
  @@index([productId])
}
```

## Purpose

Replaces the legacy `images String[]` column on `Product`. Each image is a separate row, enabling:

- Per-image alt text, sort order, and primary flag
- Attribute-bound images via `boundAttributes` (show different images per color/size)
- Max 6 images per product (enforced server-side)
- Clean deletion via `onDelete: Cascade`

## Relation

```
Product (1) ──→ MediaAsset (many)
```

| Field | Constraint |
|-------|-----------|
| `productId` → `Product.id` | Foreign key |
| `onDelete: Cascade` | Deleting a product deletes all its MediaAsset rows |
| `@@unique([productId, url])` | No duplicate image URLs for the same product |

## boundAttributes (Attribute-Specific Images)

### What it does

Allows different images to show for different product attributes. Most commonly used with **color**:

| Image | boundAttributes | When it shows |
|-------|----------------|---------------|
| `red-front.jpg` | `{"color": "Red"}` | Only when "Red" is selected |
| `red-back.jpg` | `{"color": "Red"}` | Only when "Red" is selected |
| `blue-front.jpg` | `{"color": "Blue"}` | Only when "Blue" is selected |
| `hero-shot.jpg` | `null` (unbound) | Always (fallback) |

### JSON format

```json
{"color": "Red"}
{"color": "Blue", "size": "L"}
{"size": "XL"}
```

### Fallback logic (storefront)

```
1. Filter mediaAssets by selected attributes
2. If matches found → display those
3. If no matches → show ALL mediaAssets (unbound + all bound)
```

## Admin Flow

### Creating/Editing a Product

**Media Gallery UI (ProductFormClient.tsx):**

```
┌─────────────────────────────────────────────────────┐
│  Media Gallery                                       │
├─────────────────────────────────────────────────────┤
│                                                      │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐    │
│  │            │  │            │  │            │    │
│  │   Img 1    │  │   Img 2    │  │   Img 3    │    │
│  │            │  │            │  │            │    │
│  └────────────┘  └────────────┘  └────────────┘    │
│  [  All Colors ▼]  [    Red    ▼]  [   Blue    ▼]  │
│                                                      │
│  [            Upload Area (max 6)                   ]│
└─────────────────────────────────────────────────────┘
```

- Each uploaded image gets a dropdown populated from the product's variant colors
- **All Colors** → `boundAttributes: null` (shows for every color)
- **Red / Blue / Gold** → `boundAttributes: { "color": "Red" }`

### Server Action Payload

```ts
// Current
images: string[]

// New
images: {
  url: string;
  boundAttributes?: Record<string, string> | null;
}[]
```

### Create (actions.ts)

```ts
mediaAssets: {
  create: data.images.map((img, index) => ({
    url: img.url,
    isPrimary: index === 0,
    sortOrder: index,
    boundAttributes: img.boundAttributes ?? null,
  })),
},
```

### Update (actions.ts — inside transaction)

```ts
await tx.mediaAsset.deleteMany({ where: { productId: id } });

if (data.images.length > 0) {
  await tx.mediaAsset.createMany({
    data: data.images.map((img, index) => ({
      productId: id,
      url: img.url,
      isPrimary: index === 0,
      sortOrder: index,
      boundAttributes: img.boundAttributes ?? null,
    })),
  });
}
```

## Storefront Flow

### Product Detail Page (ProductClient.tsx)

```
┌─────────────────────────┬───────────────────────────────┐
│  ┌───────────────────┐  │  Product Name                  │
│  │                   │  │  Category • Team               │
│  │    Main Image      │  │  ৳1,200                       │
│  │    changes when    │  │                                │
│  │    color clicked   │  │  Select Color:                 │
│  │                   │  │  ┌─────┐ ┌─────┐ ┌─────┐     │
│  └───────────────────┘  │  │ Red │ │ BLUE│ │GOLD │     │
│  ┌──┐ ┌──┐ ┌──┐ ┌──┐   │  │ ■■■ │ │ ■■■■│ │ ■■■■│     │
│  │T1│ │T2│ │T3│ │T4│   │  └─────┘ └─────┘ └─────┘     │
│  └──┘ └──┘ └──┘ └──┘   │  (●)     (○)      (○)        │
│                         │                                │
│                         │  Select Size:                  │
│                         │  [S] [M] [L]  ← filtered      │
│                         │    by selected color           │
│                         │                                │
│                         │  Quantity: [-] 1 [+]           │
│                         │  [   Add To Cart   ]           │
│                         │  [    Buy Now      ]           │
└─────────────────────────┴───────────────────────────────┘
```

### Image Filtering Logic

```ts
// Extract unique colors from variants
const uniqueColors = Array.from(
  new Set(product.variants.map(v => v.color))
).filter(Boolean);

// State
const [selectedColor, setSelectedColor] = useState<string | null>(null);

// Filter images by selected color
const displayAssets = useMemo(() => {
  if (!selectedColor) return product.mediaAssets;

  const bound = product.mediaAssets.filter(asset => {
    if (!asset.boundAttributes) return false;
    const attrs = typeof asset.boundAttributes === 'string'
      ? JSON.parse(asset.boundAttributes)
      : asset.boundAttributes;
    return attrs.color === selectedColor;
  });

  return bound.length > 0 ? bound : product.mediaAssets; // fallback
}, [selectedColor, product.mediaAssets]);

// Filter variants by selected color
const availableVariants = useMemo(() => {
  if (!selectedColor) return product.variants;
  return product.variants.filter(v => v.color === selectedColor);
}, [selectedColor, product.variants]);
```

### Product Interface

```ts
interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  mediaAssets: {
    url: string;
    boundAttributes?: Record<string, string> | null;
  }[];
  variants: {
    size: string;
    color: string;
    colorCode?: string;
    stock: number;
    pricingMatrix?: { basePrice?: number | string } | null;
  }[];
  // ...
}
```

### Key Behaviors

| Scenario | Result |
|----------|--------|
| No color selected | Shows ALL mediaAssets |
| Color selected + bound images exist | Shows ONLY color-bound images |
| Color selected + no bound images | Falls back to ALL mediaAssets |
| Color selected + some unbound + some bound | Shows ONLY bound images (unbound are hidden for that color) |
| Color changed | Main image resets to index 0, thumbnails update |
| Color with no matching variants | Size selector shows empty state |

## Files That Use MediaAsset

| File | What it does |
|------|-------------|
| `prisma/schema.prisma` | Model definition |
| `src/app/admin/products/actions.ts` | Create/update/delete MediaAsset rows |
| `src/app/admin/products/new/ProductFormClient.tsx` | Admin form — upload + color binding UI |
| `src/app/admin/products/edit/[id]/page.tsx` | Edit page — loads product with mediaAssets |
| `src/app/api/products/route.ts` | API — includes mediaAssets in response |
| `src/app/api/products/[slug]/route.ts` | API — includes mediaAssets in response |
| `src/app/api/search/route.ts` | API — includes mediaAssets in search results |
| `src/app/api/orders/track/route.ts` | API — order tracking images |
| `src/app/product/[slug]/page.tsx` | Server — loads mediaAssets for detail page |
| `src/app/product/[slug]/ProductClient.tsx` | Storefront — displays images + color selector + filtering |
| `src/app/products/ProductsClient.tsx` | Storefront — listing page thumbnails |
| `src/app/products/page.tsx` | Server — loads mediaAssets for listing |
| `src/components/ProductCard.tsx` | Storefront — product card thumbnail |
| `src/app/admin/products/[id]/page.tsx` | Admin — product detail view gallery |
| `src/app/admin/orders/actions.ts` | Order product images |
| `src/app/admin/orders/[id]/OrderDetailsClient.tsx` | Order detail images |
| `src/app/admin/inventory/low-stock/InventoryClient.tsx` | Inventory thumbnails |
| `src/app/admin/orders/returns/page.tsx` | Return product images |
| `src/app/admin/orders/ai-create/AICreateOrderClient.tsx` | Search thumbnails |
| `src/app/account/page.tsx` | Order history images |
| `src/app/admin/page.tsx` | Dashboard product images |
| `pim.md` | Product information architecture reference |
