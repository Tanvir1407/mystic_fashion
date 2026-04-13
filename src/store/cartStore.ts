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
  originalPrice?: number;
}

interface CartStore {
  items: CartItem[];
  isOpen: boolean;
  addItem: (product: any, size?: string, quantity?: number) => void;
  removeItem: (id: string, size?: string) => void;
  updateQuantity: (id: string, quantity: number, size?: string) => void;
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
      addItem: (product, size, qty = 1) => {
        const currentItems = get().items;
        const existingItem = currentItems.find(
          (item) => item.id === product.id && item.size === size
        );

        if (existingItem) {
          set({
            items: currentItems.map((item) =>
              item.id === product.id && item.size === size
                ? { ...item, quantity: item.quantity + qty }
                : item
            ),
          });
        } else {
          set({
            items: [...currentItems, { ...product, quantity: qty, size }],
          });
        }
      },
      removeItem: (id, size) => {
        set({
          items: get().items.filter((item) => !(item.id === id && item.size === size)),
        });
      },
      updateQuantity: (id, quantity, size) => {
        set({
          items: get().items.map((item) =>
            item.id === id && item.size === size ? { ...item, quantity: Math.max(0, quantity) } : item
          ).filter(item => item.quantity > 0),
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
