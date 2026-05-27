"use client";

import { DeleteWarningModal } from "@/components/DeleteWarningModal";
import { deleteProduct } from "@/app/admin/products/actions";

export function ProductDeleteButton({ productId, productName }: { productId: string; productName: string }) {
  return (
    <DeleteWarningModal
      title={`Move "${productName}" to Trash?`}
      description="This will move the product to the Trash Bin. It will no longer be visible in your active catalogue, but you can restore it at any time."
      impacts={[
        { label: "All product variants and size stock levels will be hidden from the storefront.", severity: "high" },
        { label: "Associated order items and purchase history referencing this product are preserved.", severity: "low" },
      ]}
      onConfirm={async () => {
        await deleteProduct(productId);
      }}
    />
  );
}
