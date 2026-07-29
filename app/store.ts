"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { BootstrapData, CartItem } from "./types";

export type AppView =
  | "dashboard"
  | "billing"
  | "reports"
  | "catalog"
  | "customers"
  | "imports"
  | "team"
  | "settings";

type CustomerDraft = {
  id: number | null;
  query: string;
  name: string;
  phone: string;
  email: string;
  address: string;
};

type AppState = {
  data: BootstrapData | null;
  loading: boolean;
  navLoading: boolean;
  view: AppView;
  menuOpen: boolean;
  cart: CartItem[];
  customerDraft: CustomerDraft;
  setData: (data: BootstrapData | null) => void;
  setLoading: (loading: boolean) => void;
  setView: (view: AppView) => void;
  setMenuOpen: (open: boolean) => void;
  addCartItem: (item: CartItem) => void;
  setQuantity: (serviceId: number, quantity: number) => void;
  clearCart: () => void;
  setCustomerDraft: (draft: Partial<CustomerDraft>) => void;
  clearCustomerDraft: () => void;
};

const emptyCustomer: CustomerDraft = {
  id: null,
  query: "",
  name: "",
  phone: "",
  email: "",
  address: "",
};

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      data: null,
      loading: true,
      navLoading: false,
      view: "billing",
      menuOpen: false,
      cart: [],
      customerDraft: emptyCustomer,
      setData: (data) => set({ data }),
      setLoading: (loading) => set({ loading }),
      setView: (view) => {
        set({ navLoading: true, menuOpen: false });
        window.requestAnimationFrame(() =>
          window.setTimeout(() => set({ view, navLoading: false }), 120),
        );
      },
      setMenuOpen: (menuOpen) => set({ menuOpen }),
      addCartItem: (incoming) =>
        set((state) => {
          const existing = state.cart.find(
            (item) => item.serviceId === incoming.serviceId,
          );
          return {
            cart: existing
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
      clearCart: () => set({ cart: [] }),
      setCustomerDraft: (draft) =>
        set((state) => ({
          customerDraft: { ...state.customerDraft, ...draft },
        })),
      clearCustomerDraft: () => set({ customerDraft: emptyCustomer }),
    }),
    {
      name: "pearl-laundry-draft-v1",
      storage: createJSONStorage(() => sessionStorage),
      partialize: (state) => ({
        cart: state.cart,
        customerDraft: state.customerDraft,
      }),
    },
  ),
);
