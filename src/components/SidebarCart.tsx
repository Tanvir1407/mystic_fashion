"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X, ShoppingBag, Plus, Minus } from "lucide-react";
import { useCartStore } from "../store/cartStore";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { syncCartPrices } from "@/app/checkout/actions";
import { formatBDT } from "@/utils/formatPrice";

export default function SidebarCart() {
  const { items, isOpen, toggleCart, updateQuantity, removeItem, getTotalPrice, updateItem } = useCartStore();
  const router = useRouter();

  const handleCheckout = () => {
    toggleCart();
    router.push('/checkout');
  };

  useEffect(() => {
    if (isOpen && items.length > 0) {
      const cartItemsPayload = items.map((i: any) => ({ id: i.id, size: i.size, color: i.color }));
      syncCartPrices(cartItemsPayload).then((updatedPrices) => {
        updatedPrices.forEach((updated: any) => {
          items.forEach((item: any) => {
            if (
              item.id === updated.id &&
              item.size === updated.size &&
              item.color === updated.color &&
              item.price !== updated.price
            ) {
              updateItem(item.id, item.size, item.color, { price: updated.price }, item.comboSelections);
            }
          });
        });
      });
    }
  }, [isOpen, items.length]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={toggleCart}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100]"
          />

          {/* Sidebar */}
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed right-0 top-0 h-full w-full max-w-sm bg-white dark:bg-zinc-950 shadow-xl z-[101] flex flex-col"
          >
            {/* Header */}
            <div className="px-5 py-4 border-b border-slate-100 dark:border-zinc-900 flex justify-between items-center">
              <h2 className="text-sm font-medium uppercase tracking-widest text-zinc-700 dark:text-zinc-300">Cart</h2>
              <button
                onClick={toggleCart}
                className="p-1.5 text-slate-400 hover:text-zinc-800 dark:hover:text-zinc-200 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Cart Items */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
              {items.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center gap-5 pb-10">
                  <ShoppingBag className="w-8 h-8 text-slate-200 dark:text-zinc-700" strokeWidth={1} />
                  <div className="space-y-1.5">
                    <h3 className="text-sm font-medium text-zinc-600 dark:text-zinc-400">Your bag is empty</h3>
                    <p className="text-slate-400 text-xs leading-relaxed max-w-[180px] mx-auto">
                      Add items to your cart and they'll appear here.
                    </p>
                  </div>
                  <button
                    onClick={toggleCart}
                    className="text-xs text-slate-400 border border-slate-200 dark:border-zinc-700 px-4 py-1.5 hover:border-primary hover:text-primary transition-colors"
                  >
                    Start Browsing
                  </button>
                </div>
              ) : (
                items.map((item) => (
                  <div
                    key={`${item.id}-${item.size || ""}-${item.color || "Default"}-${JSON.stringify(item.comboSelections || [])}`}
                    className="flex gap-3 pb-5 border-b border-slate-100 dark:border-zinc-900 last:border-0 last:pb-0"
                  >
                    {/* Image */}
                    <div className="relative w-16 h-20 bg-slate-50 dark:bg-zinc-900 overflow-hidden flex-shrink-0">
                      {item.image ? (
                        <Image src={item.image} alt={item.name} fill className="object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <ShoppingBag className="w-5 h-5 text-slate-300" />
                        </div>
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 flex flex-col gap-1.5 min-w-0">
                      {/* Name + Delete */}
                      <div className="flex justify-between items-start gap-2">
                        <h3 className="font-medium text-xs leading-snug text-zinc-700 dark:text-zinc-200 line-clamp-2">
                          {item.name}
                        </h3>
                        <button
                          onClick={() => removeItem(item.id, item.size, item.color, item.comboSelections)}
                          className="flex-shrink-0 p-0.5 text-slate-300 hover:text-red-400 transition-colors"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>

                      {/* Variant badges */}
                      <div className="flex flex-wrap gap-1">
                        {item.size && item.size !== "Default" && (
                          <span className="text-[10px] text-slate-400 dark:text-slate-500">
                            {item.sizeAttributeName || "Size"}: {item.size}
                          </span>
                        )}
                        {item.color && item.color !== "Default" && (
                          <span className="text-[10px] text-slate-400 dark:text-slate-500">
                            · {item.colorAttributeName || "Color"}: {item.color}
                          </span>
                        )}
                      </div>

                      {/* Combo Selections list */}
                      {item.comboSelections && item.comboSelections.length > 0 && (
                        <div className="mt-1 bg-slate-50 dark:bg-zinc-900/50 p-1.5 border border-slate-100 dark:border-zinc-900/50 rounded-sm">
                          <p className="text-[9px] font-bold text-zinc-500 uppercase tracking-wide mb-1">Selections:</p>
                          <ul className="space-y-0.5 list-none pl-0">
                            {item.comboSelections.map((sel: any, sIdx: number) => (
                              <li key={sIdx} className="text-[9px] text-zinc-600 dark:text-zinc-400 font-medium truncate">
                                • {sel.name} (x{sel.quantity})
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Price + Quantity */}
                      <div className="flex items-center justify-between mt-auto pt-1">
                        <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-100">
                          {formatBDT(item.price)}
                        </p>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => updateQuantity(item.id, item.quantity - 1, item.size, item.color, item.comboSelections)}
                            className="w-5 h-5 flex items-center justify-center text-white bg-primary hover:bg-[#600018] transition-colors"
                          >
                            <Minus className="w-2.5 h-2.5" />
                          </button>
                          <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300 w-4 text-center">{item.quantity}</span>
                          <button
                            onClick={() => updateQuantity(item.id, item.quantity + 1, item.size, item.color, item.comboSelections)}
                            className="w-5 h-5 flex items-center justify-center text-white bg-primary hover:bg-[#600018] transition-colors"
                          >
                            <Plus className="w-2.5 h-2.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Footer */}
            {items.length > 0 && (
              <div className="px-5 py-4 border-t border-slate-100 dark:border-zinc-900">
                <div className="flex justify-between items-center mb-4">
                  <span className="text-xs text-slate-400 uppercase tracking-widest">Subtotal</span>
                  <span className="text-base font-semibold text-zinc-800 dark:text-zinc-100">{formatBDT(getTotalPrice())}</span>
                </div>
                <button
                  onClick={handleCheckout}
                  className="w-full bg-primary text-white text-xs font-medium uppercase tracking-widest py-3 hover:bg-[#600018] transition-colors active:scale-[0.98]"
                >
                  Checkout
                </button>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
