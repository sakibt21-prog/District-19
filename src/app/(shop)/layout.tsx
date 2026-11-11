import { Suspense } from "react";
import { CartProvider } from "@/components/cart/CartProvider";
import { Footer } from "@/components/site/Footer";
import { Header } from "@/components/site/Header";

export default function ShopLayout({ children }: LayoutProps<"/">) {
  return (
    <CartProvider>
      <Suspense>
        <Header />
      </Suspense>
      <main id="main" tabIndex={-1} className="flex-1 outline-none">
        {children}
      </main>
      <Footer />
    </CartProvider>
  );
}
