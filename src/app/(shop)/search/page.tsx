import type { Metadata } from "next";
import { Suspense } from "react";
import { CatalogView } from "@/components/catalog/CatalogView";
import { GridFallback } from "@/components/catalog/CategoryPage";
import { getProducts } from "@/lib/catalog";

export const metadata: Metadata = {
  title: "Search",
  description: "Search every DISTRICT 19 shirt, pant and shoe.",
};

export default async function SearchPage() {
  const products = await getProducts();
  return (
    <div className="mx-auto max-w-[1440px] px-4 pt-[calc(var(--header-h)+2.5rem)] md:px-8 md:pt-[calc(var(--header-h)+4rem)]">
      <h1 className="pb-8 font-display text-6xl font-extrabold uppercase leading-[0.9] tracking-tighter md:pb-12 md:text-8xl">
        Search
      </h1>
      <Suspense fallback={<GridFallback />}>
        <CatalogView products={products} showCategoryFilter autoFocusSearch />
      </Suspense>
    </div>
  );
}
