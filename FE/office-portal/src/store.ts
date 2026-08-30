"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { CartItem, Customer } from "../../contracts/src";

type OfficeSection = "sales" | "expenses" | "collections";
type CustomerDraft = Pick<Customer, "name" | "phone" | "email" | "address"> & {
  id: number | null;
  query: string;
};

const emptyCustomer: CustomerDraft = {
  id: null,
  query: "",
  name: "",
  phone: "",
  email: "",
  address: "",
};

type OfficeState = {
  section: OfficeSection;
  categoryId: number | null;
  cart: CartItem[];
  customer: CustomerDraft;
  setSection: (section: OfficeSection) => void;
  setCategoryId: (id: number) => void;
  addItem: (item: CartItem) => void;
  setQuantity: (serviceId: number, quantity: number) => void;
  setCustomer: (values: Partial<CustomerDraft>) => void;
  resetSale: () => void;
};

export const useOfficeStore = create<OfficeState>()(
  persist(
    (set) => ({
      section: "sales",
      categoryId: null,
      cart: [],
      customer: emptyCustomer,
      setSection: (section) => set({ section }),
      setCategoryId: (categoryId) => set({ categoryId }),
      addItem: (incoming) =>
        set((state) => {
          const exists = state.cart.some((item) => item.serviceId === incoming.serviceId);
          return {
            cart: exists
              ? state.cart.map((item) =>
                  item.serviceId === incoming.serviceId
                    ? { ...item, quantity: item.quantity + 1 }
                    : item,
                )
              : [...state.cart, incoming],
          };
        }),
      setQuantity: (serviceId, quantity) =>
        set((state) => ({
          cart:
            quantity <= 0
              ? state.cart.filter((item) => item.serviceId !== serviceId)
              : state.cart.map((item) =>
                  item.serviceId === serviceId ? { ...item, quantity } : item,
                ),
        })),
      setCustomer: (values) =>
        set((state) => ({ customer: { ...state.customer, ...values } })),
      resetSale: () => set({ cart: [], customer: emptyCustomer }),
    }),
    {
      name: "laundry-office-draft-v2",
      storage: createJSONStorage(() => sessionStorage),
      partialize: (state) => ({ cart: state.cart, customer: state.customer }),
    },
  ),
);
