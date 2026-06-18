"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X, ShoppingBag, Trash2, Plus, Minus } from "lucide-react";
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
            if (item.id === updated.id && item.size === updated.size && item.color === updated.color && item.price !== updated.price) {
              updateItem(item.id, item.size, item.color, { price: updated.price });
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
            className="fixed right-0 top-0 h-full w-full max-w-md bg-white dark:bg-zinc-950 shadow-2xl z-[101] flex flex-col"
          >
            {/* Header */}
            <div className="p-6 border-b border-slate-100 dark:border-zinc-900 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <ShoppingBag className="w-6 h-6 text-primary" />
                <h2 className="text-xl font-semibold uppercase tracking-tight">Shopping Cart</h2>
              </div>
              <button
                onClick={toggleCart}
                className="p-2 hover:bg-slate-100 dark:hover:bg-zinc-900 rounded-full transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Cart Items */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {items.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center gap-6 px-6 pb-10">
                  <ShoppingBag className="w-10 h-10 text-slate-200 dark:text-zinc-700" strokeWidth={1.2} />

                  <div className="space-y-2">
                    <h3 className="text-base font-medium text-zinc-700 dark:text-zinc-300">
                      Your bag is empty
                    </h3>
                    <p className="text-slate-400 text-xs leading-relaxed max-w-[200px] mx-auto">
                      Add items to your cart and they'll appear here.
                    </p>
                  </div>

                  <button
                    onClick={toggleCart}
                    className="text-xs font-medium text-slate-500 border border-slate-200 dark:border-zinc-700 px-5 py-2 hover:border-primary hover:text-primary transition-colors"
                  >
                    Start Browsing
                  </button>
                </div>
              ) : (
                items.map((item) => (
                  <div key={`${item.id}-${item.size}-${item.color || "Default"}`} className="flex gap-3 group pb-5 border-b border-slate-100 dark:border-zinc-900 last:border-0 last:pb-0">
                    {/* Image */}
                    <div className="relative w-20 h-24 bg-slate-100 dark:bg-zinc-900 overflow-hidden flex-shrink-0">
                      {item.image ? (
                        <Image src={item.image} alt={item.name} fill className="object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <ShoppingBag className="w-7 h-7 text-slate-300" />
                        </div>
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 flex flex-col gap-2 min-w-0">
                      {/* Name + Delete */}
                      <div className="flex justify-between items-start gap-2">
                        <h3 className="font-semibold text-sm leading-snug text-zinc-800 dark:text-zinc-100 group-hover:text-primary transition-colors line-clamp-2">
                          {item.name}
                        </h3>
                        <button
                          onClick={() => removeItem(item.id, item.size, item.color)}
                          className="flex-shrink-0 p-1 text-slate-300 hover:text-red-500 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Variant badges */}
                      <div className="flex flex-wrap gap-1.5">
                        {item.size && item.size !== "Default" && (
                          <span className="text-[10px] font-bold uppercase tracking-wide bg-slate-100 dark:bg-zinc-800 text-slate-500 dark:text-slate-400 px-2 py-0.5">
                            {item.sizeAttributeName || "Size"}: {item.size}
                          </span>
                        )}
                        {item.color && item.color !== "Default" && (
                          <span className="text-[10px] font-bold uppercase tracking-wide bg-slate-100 dark:bg-zinc-800 text-slate-500 dark:text-slate-400 px-2 py-0.5">
                            {item.colorAttributeName || "Color"}: {item.color}
                          </span>
                        )}
                      </div>

                      {/* Price + Quantity */}
                      <div className="flex items-center justify-between mt-auto">
                        <p className="text-base font-bold text-primary">
                          {formatBDT(item.price)}
                        </p>
                        <div className="flex items-center border border-slate-200 dark:border-zinc-700">
                          <button
                            onClick={() => updateQuantity(item.id, item.quantity - 1, item.size, item.color)}
                            className="p-1.5 px-2.5 hover:bg-slate-50 dark:hover:bg-zinc-900 border-r border-slate-200 dark:border-zinc-700 transition-colors"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="w-8 text-center text-xs font-bold">{item.quantity}</span>
                          <button
                            onClick={() => updateQuantity(item.id, item.quantity + 1, item.size, item.color)}
                            className="p-1.5 px-2.5 hover:bg-slate-50 dark:hover:bg-zinc-900 border-l border-slate-200 dark:border-zinc-700 transition-colors"
                          >
                            <Plus className="w-3 h-3" />
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
              <div className="p-6 border-t border-slate-100 dark:border-zinc-900 bg-slate-50/50 dark:bg-zinc-900/30">
                <div className="flex justify-between items-center mb-6">
                  <span className="text-slate-500 font-bold uppercase tracking-widest text-xs">Subtotal</span>
                  <span className="text-2xl font-black text-primary">{formatBDT(getTotalPrice())}</span>
                </div>
                <button
                  onClick={handleCheckout}
                  className="w-full text-white bg-primary py-3 rounded-xl font-black uppercase tracking-widest hover:bg-[#600018] transition-all transform active:scale-[0.98] shadow-lg shadow-black/10"
                >
                  Checkout Now
                </button>

              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
