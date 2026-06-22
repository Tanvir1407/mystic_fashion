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
  // Combo Box Fields
  comboSelections?: { productId: string; name: string; quantity: number }[];
}

interface CartStore {
  items: CartItem[];
  isOpen: boolean;
  addItem: (
    product: any,
    size?: string,
    quantity?: number,
    color?: string,
    comboSelections?: { productId: string; name: string; quantity: number }[]
  ) => void;
  removeItem: (
    id: string,
    size?: string,
    color?: string,
    comboSelections?: { productId: string; name: string; quantity: number }[]
  ) => void;
  updateQuantity: (
    id: string,
    quantity: number,
    size?: string,
    color?: string,
    comboSelections?: { productId: string; name: string; quantity: number }[]
  ) => void;
  updateItem: (
    id: string,
    size: string | undefined,
    color: string | undefined,
    updates: Partial<CartItem>,
    comboSelections?: { productId: string; name: string; quantity: number }[]
  ) => void;
  clearCart: () => void;
  toggleCart: () => void;
  getTotalItems: () => number;
  getTotalPrice: () => number;
}

const areSelectionsEqual = (
  a?: { productId: string; quantity: number }[],
  b?: { productId: string; quantity: number }[]
) => {
  const arrA = a || [];
  const arrB = b || [];
  if (arrA.length !== arrB.length) return false;
  
  // Sort by productId to compare regardless of selection order
  const sortedA = [...arrA].sort((x, y) => x.productId.localeCompare(y.productId));
  const sortedB = [...arrB].sort((x, y) => x.productId.localeCompare(y.productId));
  
  return sortedA.every((val, index) => 
    val.productId === sortedB[index].productId && val.quantity === sortedB[index].quantity
  );
};

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      isOpen: false,
      addItem: (product, size, qty = 1, color, comboSelections) => {
        const currentItems = get().items;
        const existingItem = currentItems.find(
          (item) =>
            item.id === product.id &&
            item.size === size &&
            item.color === color &&
            areSelectionsEqual(item.comboSelections, comboSelections)
        );

        if (existingItem) {
          set({
            items: currentItems.map((item) =>
              item.id === product.id &&
              item.size === size &&
              item.color === color &&
              areSelectionsEqual(item.comboSelections, comboSelections)
                ? { ...item, quantity: item.quantity + qty }
                : item
            ),
          });
        } else {
          set({
            items: [...currentItems, { ...product, quantity: qty, size, color, comboSelections }],
          });
        }
      },
      removeItem: (id, size, color, comboSelections) => {
        set({
          items: get().items.filter(
            (item) =>
              !(
                item.id === id &&
                item.size === size &&
                (color !== undefined ? item.color === color : true) &&
                areSelectionsEqual(item.comboSelections, comboSelections)
              )
          ),
        });
      },
      updateQuantity: (id, quantity, size, color, comboSelections) => {
        set({
          items: get().items
            .map((item) =>
              item.id === id &&
              item.size === size &&
              (color !== undefined ? item.color === color : true) &&
              areSelectionsEqual(item.comboSelections, comboSelections)
                ? { ...item, quantity: Math.max(0, quantity) }
                : item
            )
            .filter((item) => item.quantity > 0),
        });
      },
      updateItem: (id, size, color, updates, comboSelections) => {
        set({
          items: get().items.map((item) =>
            item.id === id &&
            item.size === size &&
            (color !== undefined ? item.color === color : true) &&
            areSelectionsEqual(item.comboSelections, comboSelections)
              ? { ...item, ...updates }
              : item
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
