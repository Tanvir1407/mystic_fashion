"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X, ShoppingBag, Trash2, Plus, Minus } from "lucide-react";
import { useCartStore } from "../store/cartStore";
import Image from "next/image";
import { useRouter } from "next/navigation";

export default function SidebarCart() {
  const { items, isOpen, toggleCart, updateQuantity, removeItem, getTotalPrice } = useCartStore();
  const router = useRouter();

  const handleCheckout = () => {
    toggleCart(); 
    router.push('/checkout');
  };

  const formatBDT = (price: number) => {
    return `৳${price.toLocaleString("en-IN")}`;
  };

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
                <h2 className="text-xl font-black uppercase tracking-tight">Shopping Cart</h2>
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
                <div className="h-full flex flex-col items-center justify-center text-center space-y-4">
                  <div className="w-20 h-20 bg-slate-100 dark:bg-zinc-900 rounded-full flex items-center justify-center">
                    <ShoppingBag className="w-10 h-10 text-slate-300" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold">Your cart is empty</h3>
                    <p className="text-slate-500 text-sm">Add some items to get started!</p>
                  </div>
                </div>
              ) : (
                items.map((item) => (
                  <div key={`${item.id}-${item.size}`} className="flex gap-4 group">
                    <div className="relative w-24 h-32 bg-slate-100 dark:bg-zinc-900 rounded-lg overflow-hidden flex-shrink-0">
                      {item.image ? (
                        <Image
                          src={item.image}
                          alt={item.name}
                          fill
                          className="object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <ShoppingBag className="w-8 h-8 text-slate-300" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 flex flex-col justify-between py-1">
                      <div>
                        <div className="flex justify-between items-start">
                          <h3 className="font-bold text-sm uppercase leading-tight group-hover:text-primary transition-colors line-clamp-2">
                            {item.name}
                          </h3>
                          <button
                            onClick={() => removeItem(item.id, item.size)}
                            className="p-1 text-slate-400 hover:text-red-500 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                        {item.size && (
                          <span className="text-[10px] font-black uppercase bg-slate-100 dark:bg-zinc-900 px-2 py-0.5 rounded text-slate-600 dark:text-slate-400">
                            Size: {item.size}
                          </span>
                        )}
                        <p className="text-primary font-black mt-1">
                          {formatBDT(item.price)}
                        </p>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="flex items-center border border-slate-200 dark:border-zinc-800 rounded-lg">
                          <button
                            onClick={() => updateQuantity(item.id, item.quantity - 1, item.size)}
                            className="p-1 px-2 hover:bg-slate-50 dark:hover:bg-zinc-900 transition-colors"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="w-8 text-center text-xs font-bold">{item.quantity}</span>
                          <button
                            onClick={() => updateQuantity(item.id, item.quantity + 1, item.size)}
                            className="p-1 px-2 hover:bg-slate-50 dark:hover:bg-zinc-900 transition-colors"
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
