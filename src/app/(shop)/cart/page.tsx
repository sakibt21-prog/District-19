import type { Metadata } from "next";
import { CartView } from "@/components/cart/CartView";

export const metadata: Metadata = { title: "Cart" };

export default function CartPage() {
  return (
    <div className="mx-auto max-w-[1100px] px-4 pb-24 pt-[calc(var(--header-h)+2.5rem)] md:px-8 md:pt-[calc(var(--header-h)+4rem)]">
      <h1 className="font-display text-6xl font-extrabold uppercase leading-[0.9] tracking-tighter md:text-8xl">
        Cart
      </h1>
      <CartView />
    </div>
  );
}
