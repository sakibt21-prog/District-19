import { Suspense } from "react";
import { SplitHeadline } from "@/components/motion/Reveal";
import { getProductsByCategory } from "@/lib/catalog";
import { CATEGORY_LABEL, type Category } from "@/lib/types";
import { CatalogView } from "./CatalogView";

const INTRO: Record<Category, string> = {
  shirt: "Tees, jerseys and overshirts, cut wide and built heavy.",
  pant: "Baggy denim, cargos and wide trousers.",
  shoe: "Runners, court shoes and high-tops.",
};

export function GridFallback() {
  return (
    <ul aria-hidden="true" className="grid grid-cols-2 gap-x-4 gap-y-10 pb-24 pt-20 md:grid-cols-3 lg:grid-cols-4 lg:gap-x-6">
      {Array.from({ length: 8 }, (_, index) => (
        <li key={index}>
          <div className="aspect-[4/5] animate-pulse bg-background" />
          <div className="mt-3 h-4 w-2/3 animate-pulse bg-background" />
        </li>
      ))}
    </ul>
  );
}

export async function CategoryPage({ category }: { category: Category }) {
  const products = await getProductsByCategory(category);
  return (
    <div className="mx-auto max-w-[1440px] px-4 pt-[calc(var(--header-h)+2.5rem)] md:px-8 md:pt-[calc(var(--header-h)+4rem)]">
      <header className="pb-8 md:flex md:items-end md:justify-between md:pb-12">
        <SplitHeadline
          as="h1"
          text={CATEGORY_LABEL[category]}
          onLoad
          className="font-display text-[14vw] font-extrabold uppercase leading-[0.86] tracking-tighter md:text-[11vw]"
        />
        <p className="mt-4 max-w-xs text-base text-secondary md:mb-3 md:text-right">{INTRO[category]}</p>
      </header>
      <Suspense fallback={<GridFallback />}>
        <CatalogView products={products} />
      </Suspense>
    </div>
  );
}
