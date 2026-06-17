import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  image: string;
  category?: string;
  size?: string;
  color?: string;
  originalPrice?: number;
  isCustomize?: boolean;
  sizeAttributeName?: string;
  colorAttributeName?: string;
  // DTF Printing Fields
  requiresPrint?: boolean;
  printName?: string;
  printNumber?: string;
  printCost?: number;
  printDetails?: { name: string; number: string }[];
}

interface CartStore {
  items: CartItem[];
  isOpen: boolean;
  addItem: (product: any, size?: string, quantity?: number, color?: string) => void;
  removeItem: (id: string, size?: string, color?: string) => void;
  updateQuantity: (id: string, quantity: number, size?: string, color?: string) => void;
  updateItem: (id: string, size: string | undefined, color: string | undefined, updates: Partial<CartItem>) => void;
  clearCart: () => void;
  toggleCart: () => void;
  getTotalItems: () => number;
  getTotalPrice: () => number;
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      isOpen: false,
      addItem: (product, size, qty = 1, color) => {
        const currentItems = get().items;
        const existingItem = currentItems.find(
          (item) => item.id === product.id && item.size === size && item.color === color
        );

        if (existingItem) {
          set({
            items: currentItems.map((item) =>
              item.id === product.id && item.size === size && item.color === color
                ? { ...item, quantity: item.quantity + qty }
                : item
            ),
          });
        } else {
          set({
            items: [...currentItems, { ...product, quantity: qty, size, color }],
          });
        }
      },
      removeItem: (id, size, color) => {
        set({
          items: get().items.filter((item) => !(item.id === id && item.size === size && (color !== undefined ? item.color === color : true))),
        });
      },
      updateQuantity: (id, quantity, size, color) => {
        set({
          items: get().items.map((item) =>
            item.id === id && item.size === size && (color !== undefined ? item.color === color : true) ? { ...item, quantity: Math.max(0, quantity) } : item
          ).filter(item => item.quantity > 0),
        });
      },
      updateItem: (id, size, color, updates) => {
        set({
          items: get().items.map((item) =>
            item.id === id && item.size === size && (color !== undefined ? item.color === color : true) ? { ...item, ...updates } : item
          ),
        });
      },
      clearCart: () => set({ items: [] }),
      toggleCart: () => set({ isOpen: !get().isOpen }),
      getTotalItems: () => get().items.reduce((total, item) => total + item.quantity, 0),
      getTotalPrice: () => get().items.reduce((total, item) => total + item.price * item.quantity, 0),
    }),
    {
      name: 'cart-storage',
    }
  )
);
