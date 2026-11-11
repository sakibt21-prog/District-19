"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import type { Category } from "@/lib/types";

export interface CartLine {
  variantId: string;
  productId: string;
  slug: string;
  name: string;
  category: Category;
  cut: string;
  size: string;
  color: string;
  colorHex: string;
  /** Price per item when it was added, in taka. Re-checked on the server at checkout. */
  unitPrice: number;
  imageUrl: string | null;
  quantity: number;
  /** Stock known when added, used to cap the quantity stepper. */
  maxQuantity: number;
}

interface CartValue {
  lines: CartLine[];
  /** False while rendering on the server, before this browser's saved cart is known. */
  ready: boolean;
  count: number;
  subtotal: number;
  add: (line: CartLine) => void;
  setQuantity: (variantId: string, quantity: number) => void;
  remove: (variantId: string) => void;
  clear: () => void;
}

/*
  The cart lives in this browser's localStorage. It is read through a small
  external store so every component (and every open tab) sees the same lines.
*/
const STORAGE_KEY = "district19.cart.v1";
const EMPTY: CartLine[] = [];
const listeners = new Set<() => void>();
let cache: CartLine[] | null = null;

function read(): CartLine[] {
  if (cache) return cache;
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    const parsed: unknown = saved ? JSON.parse(saved) : [];
    cache = Array.isArray(parsed) ? (parsed as CartLine[]) : [];
  } catch {
    // Unreadable or blocked storage: start with an empty cart.
    cache = [];
  }
  return cache;
}

function write(next: CartLine[]) {
  cache = next;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Storage full or blocked: the cart still works for this visit.
  }
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  const onStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY) {
      cache = null;
      listener();
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

const noopSubscribe = () => () => {};

function clamp(quantity: number, max: number) {
  return Math.max(1, Math.min(quantity, Math.max(1, max)));
}

const CartContext = createContext<CartValue | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const lines = useSyncExternalStore(subscribe, read, () => EMPTY);
  const ready = useSyncExternalStore(noopSubscribe, () => true, () => false);
  /** Text for the screen-reader live region, e.g. after adding an item. */
  const [announcement, setAnnouncement] = useState("");

  const add = useCallback((line: CartLine) => {
    const current = read();
    const existing = current.find((l) => l.variantId === line.variantId);
    write(
      existing
        ? current.map((l) =>
            l.variantId === line.variantId
              ? {
                  ...l,
                  maxQuantity: line.maxQuantity,
                  unitPrice: line.unitPrice,
                  quantity: clamp(l.quantity + line.quantity, line.maxQuantity),
                }
              : l,
          )
        : [...current, { ...line, quantity: clamp(line.quantity, line.maxQuantity) }],
    );
    setAnnouncement(`${line.name}, size ${line.size}, added to cart.`);
  }, []);

  const setQuantity = useCallback((variantId: string, quantity: number) => {
    write(
      read().map((l) =>
        l.variantId === variantId ? { ...l, quantity: clamp(quantity, l.maxQuantity) } : l,
      ),
    );
  }, []);

  const remove = useCallback((variantId: string) => {
    const current = read();
    const gone = current.find((l) => l.variantId === variantId);
    write(current.filter((l) => l.variantId !== variantId));
    if (gone) setAnnouncement(`${gone.name} removed from cart.`);
  }, []);

  const clear = useCallback(() => write([]), []);

  const value = useMemo<CartValue>(() => {
    const count = lines.reduce((sum, l) => sum + l.quantity, 0);
    const subtotal = lines.reduce((sum, l) => sum + l.quantity * l.unitPrice, 0);
    return { lines, ready, count, subtotal, add, setQuantity, remove, clear };
  }, [lines, ready, add, setQuantity, remove, clear]);

  return (
    <CartContext.Provider value={value}>
      {children}
      <div aria-live="polite" role="status" className="sr-only">
        {announcement}
      </div>
    </CartContext.Provider>
  );
}

export function useCart(): CartValue {
  const value = useContext(CartContext);
  if (!value) throw new Error("useCart must be used inside <CartProvider>.");
  return value;
}
