import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface CartItem {
  id: string; // the product id
  name: string;
  price: number;
  image: string;
  size: string;
  team: string;
  quantity: number;
}

interface CartState {
  items: CartItem[];
  addToCart: (item: Omit<CartItem, 'quantity'>) => void;
  removeFromCart: (id: string, size: string) => void;
  clearCart: () => void;
  getTotalItems: () => number;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      addToCart: (item) => {
        set((state) => {
          // Check if item with same ID and SIZE already exists
          const existingItemIndex = state.items.findIndex(
            (i) => i.id === item.id && i.size === item.size
          );
          
          if (existingItemIndex !== -1) {
            // increment quantity
            const updatedItems = [...state.items];
            updatedItems[existingItemIndex].quantity += 1;
            return { items: updatedItems };
          } else {
            // add new
            return { items: [...state.items, { ...item, quantity: 1 }] };
          }
        });
      },
      removeFromCart: (id, size) => {
        set((state) => ({
          items: state.items.filter((i) => !(i.id === id && i.size === size)),
        }));
      },
      clearCart: () => set({ items: [] }),
      getTotalItems: () => {
        return get().items.reduce((total, item) => total + item.quantity, 0);
      },
    }),
    {
      name: 'mystic-cart-storage', // key for localStorage
    }
  )
);
