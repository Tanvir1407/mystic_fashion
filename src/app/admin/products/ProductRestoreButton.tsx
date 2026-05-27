"use client";

import { useTransition } from "react";
import { restoreProduct } from "@/app/admin/products/actions";
import { RotateCcw } from "lucide-react";
import { useRouter } from "next/navigation";

export function ProductRestoreButton({ productId }: { productId: string }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const handleRestore = async () => {
    startTransition(async () => {
      const res = await restoreProduct(productId);
      if (res.success) {
        router.refresh();
      } else {
        alert(res.error || "Failed to restore product");
      }
    });
  };

  return (
    <button
      onClick={handleRestore}
      disabled={isPending}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-md hover:bg-indigo-100 hover:border-indigo-300 transition-colors disabled:opacity-50"
    >
      <RotateCcw className="w-3.5 h-3.5" />
      Restore
    </button>
  );
}
