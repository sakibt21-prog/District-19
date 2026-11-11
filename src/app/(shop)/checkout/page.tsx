import type { Metadata } from "next";
import { CheckoutForm } from "@/components/checkout/CheckoutForm";
import { getShopSettings, isDemoCatalog } from "@/lib/catalog";

export const metadata: Metadata = {
  title: "Checkout",
  robots: { index: false },
};

export default async function CheckoutPage() {
  const settings = await getShopSettings();
  return (
    <div className="mx-auto max-w-[1100px] px-4 pb-24 pt-[calc(var(--header-h)+2.5rem)] md:px-8 md:pt-[calc(var(--header-h)+4rem)]">
      <h1 className="font-display text-5xl font-extrabold uppercase leading-[0.9] tracking-tighter md:text-8xl">
        Checkout
      </h1>
      <CheckoutForm settings={settings} demo={isDemoCatalog()} />
    </div>
  );
}
