import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Reveal } from "@/components/motion/Reveal";
import { ProductCard } from "@/components/product/ProductCard";
import { ProductDetail } from "@/components/product/ProductDetail";
import { SizeTable } from "@/components/product/SizeGuide";
import { getProductBySlug, getRelatedProducts } from "@/lib/catalog";
import { CATEGORY_LABEL, colorsOf, sizesOf } from "@/lib/types";

export async function generateMetadata(props: PageProps<"/product/[slug]">): Promise<Metadata> {
  const { slug } = await props.params;
  const product = await getProductBySlug(slug);
  if (!product) return { title: "Product not found" };
  return { title: product.name, description: product.description };
}

function ProductFallback() {
  return (
    <div
      aria-hidden="true"
      className="grid lg:min-h-[calc(100svh-var(--header-h))] lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]"
    >
      <div className="grid min-h-[60svh] place-items-center">
        <div className="aspect-[12/13] w-[min(60vw,380px)] animate-pulse bg-background" />
      </div>
      <div className="border-t border-border px-4 py-10 md:px-8 lg:border-l lg:border-t-0 lg:py-16">
        <div className="h-12 w-3/4 animate-pulse bg-background" />
        <div className="mt-4 h-6 w-24 animate-pulse bg-background" />
        <div className="mt-10 h-14 w-full max-w-md animate-pulse bg-background" />
      </div>
    </div>
  );
}

export default function ProductPage(props: PageProps<"/product/[slug]">) {
  return (
    <div className="pt-(--header-h)">
      {/* The slug is only known per link, so the content streams inside a boundary.
          Links that set prefetch load it ahead of the click and skip the placeholder. */}
      <Suspense fallback={<ProductFallback />}>
        <ProductContent params={props.params} />
      </Suspense>
    </div>
  );
}

async function ProductContent({ params }: { params: PageProps<"/product/[slug]">["params"] }) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) notFound();
  const related = await getRelatedProducts(product);

  return (
    <>
      <ProductDetail product={product} />

      <section
        aria-label="Product details"
        className="border-t border-border"
      >
        <div className="mx-auto grid max-w-[1440px] gap-12 px-4 py-16 md:grid-cols-2 md:gap-16 md:px-8 md:py-24">
          <Reveal className="min-w-0">
            <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Description
            </h2>
            <p className="mt-4 max-w-[60ch] text-lg leading-relaxed">{product.description}</p>
            <dl className="mt-8 grid max-w-md grid-cols-[auto_1fr] gap-x-8 gap-y-2 text-sm">
              <dt className="text-muted-foreground">Category</dt>
              <dd>{CATEGORY_LABEL[product.category]}</dd>
              <dt className="text-muted-foreground">Colours</dt>
              <dd>
                {colorsOf(product)
                  .map((c) => c.name)
                  .join(", ")}
              </dd>
              <dt className="text-muted-foreground">Sizes</dt>
              <dd>{sizesOf(product).join(", ")}</dd>
            </dl>
          </Reveal>
          <Reveal delay={0.08} className="min-w-0">
            <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Size guide
            </h2>
            <div className="mt-4">
              <SizeTable category={product.category} />
            </div>
          </Reveal>
        </div>
      </section>

      {related.length > 0 && (
        <section aria-label="Related products" className="border-t border-border">
          <div className="mx-auto max-w-[1440px] px-4 py-16 md:px-8 md:py-24">
            <h2 className="font-display text-4xl font-extrabold uppercase tracking-tight md:text-5xl">
              You may also like
            </h2>
            <ul className="mt-10 grid grid-cols-2 gap-x-4 gap-y-10 lg:grid-cols-4 lg:gap-x-6">
              {related.map((item, index) => (
                <li key={item.id}>
                  <Reveal delay={index * 0.05}>
                    <ProductCard product={item} />
                  </Reveal>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}
    </>
  );
}
