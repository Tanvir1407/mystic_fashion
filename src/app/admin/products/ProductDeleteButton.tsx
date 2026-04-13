"use client";

import { DeleteWarningModal } from "@/components/DeleteWarningModal";
import { deleteProduct } from "@/app/admin/actions";

export function ProductDeleteButton({ productId, productName }: { productId: string; productName: string }) {
  return (
    <DeleteWarningModal
      title={`Delete "${productName}"?`}
      description="This will permanently remove the product from your catalogue. This action cannot be undone."
      impacts={[
        { label: "All product variants and size stock levels will be deleted.", severity: "high" },
        { label: "All associated order items referencing this product will lose product data (orphaned records).", severity: "high" },
        { label: "Purchase history items linked to this product will have missing product references.", severity: "high" },
        { label: "The product's purchase cost tracking history will be permanently lost.", severity: "medium" },
        { label: "Any size chart association will be unlinked (the chart itself remains).", severity: "low" },
      ]}
      onConfirm={async () => {
        await deleteProduct(productId);
      }}
    />
  );
}
