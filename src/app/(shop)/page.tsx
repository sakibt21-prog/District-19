import Link from "next/link";
import { MaskReveal, Parallax, Reveal, SplitHeadline } from "@/components/motion/Reveal";
import { ScrollStatement } from "@/components/motion/ScrollStatement";
import { ProductCard } from "@/components/product/ProductCard";
import { ProductVisual } from "@/components/product/ProductVisual";
import { FloatScene } from "@/components/scenes/FloatScene";
import { LookScene } from "@/components/scenes/LookScene";
import { RailScene } from "@/components/scenes/RailScene";
import { Icon } from "@/components/site/Icon";
import { getLooks, getProducts, isDemoCatalog, newestFirst } from "@/lib/catalog";
import { CATEGORY_LABEL, CATEGORY_PATH, type Category, type Product } from "@/lib/types";

const TILE_TONE: Record<Category, string> = {
  shirt: "#ecebe7",
  pant: "#e3e7ec",
  shoe: "#efe8df",
};

function SectionHeader({
  eyebrow,
  title,
  href,
  linkLabel,
}: {
  eyebrow: string;
  title: string;
  href?: string;
  linkLabel?: string;
}) {
  return (
    <div className="flex flex-col items-start gap-4 md:flex-row md:items-end md:justify-between md:gap-6">
      <div className="min-w-0">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          {eyebrow}
        </p>
        <SplitHeadline
          text={title}
          className="mt-2 font-display text-5xl font-extrabold uppercase leading-[0.9] tracking-tight md:text-7xl"
        />
      </div>
      {href && linkLabel && (
        <Link
          href={href}
          className="group mb-1 inline-flex min-h-11 shrink-0 items-center gap-2 border-b border-foreground text-xs font-semibold uppercase tracking-[0.16em]"
        >
          {linkLabel}
          <Icon
            name="arrowRight"
            size={14}
            className="transition-transform duration-300 group-hover:translate-x-1"
          />
        </Link>
      )}
    </div>
  );
}

function CollectionTile({
  category,
  product,
  count,
  delay,
  className = "",
}: {
  category: Category;
  product: Product | undefined;
  count: number;
  delay: number;
  className?: string;
}) {
  return (
    <Link href={CATEGORY_PATH[category]} className={`group block ${className}`}>
      <MaskReveal delay={delay} className="overflow-hidden">
        <div
          className="relative grid aspect-[3/4] place-items-center overflow-hidden"
          style={{ backgroundColor: TILE_TONE[category] }}
        >
          {product && (
            <Parallax distance={70} className="w-[62%]">
              <div className="transition-transform duration-700 ease-out-expo group-hover:scale-105">
                <ProductVisual
                  product={product}
                  labelled={false}
                  sizes="(min-width: 768px) 30vw, 80vw"
                />
              </div>
            </Parallax>
          )}
          <span className="tabular absolute right-4 top-4 text-xs font-semibold uppercase tracking-[0.16em] text-secondary">
            {String(count).padStart(2, "0")} pieces
          </span>
        </div>
      </MaskReveal>
      <div className="mt-4 flex items-center justify-between">
        <h3 className="font-display text-3xl font-extrabold uppercase tracking-tight md:text-4xl">
          {CATEGORY_LABEL[category]}
        </h3>
        <Icon
          name="arrowUpRight"
          size={26}
          className="transition-transform duration-300 group-hover:-translate-y-1 group-hover:translate-x-1"
        />
      </div>
    </Link>
  );
}

export default async function HomePage() {
  const [products, looks] = await Promise.all([getProducts(), getLooks()]);
  const of = (category: Category) => products.filter((p) => p.category === category);
  const shirts = of("shirt");
  const pants = of("pant");
  const shoes = of("shoe");

  // The rail hangs clothes; new releases come first, then the rest so it is never short.
  const hanging = [...shirts, ...pants];
  const rail = [
    ...newestFirst(hanging.filter((p) => p.isNew)),
    ...newestFirst(hanging.filter((p) => !p.isNew)),
  ].slice(0, 14);

  const featuredOf = (list: Product[]) => list.find((p) => p.isFeatured) ?? list[0];
  const bestSellers = [
    ...products.filter((p) => p.isBestSeller),
    ...products.filter((p) => !p.isBestSeller && p.isFeatured),
  ].slice(0, 4);
  const shirtPicks = newestFirst(shirts).slice(0, 4);
  // Put new and featured shoes on the first screen of the float.
  const floatShoes = [
    ...shoes.filter((p) => p.isFeatured),
    ...shoes.filter((p) => !p.isFeatured),
  ];

  return (
    <>
      {/* Hero: the rail, New Releases */}
      <section
        aria-labelledby="hero-title"
        className="rail-gradient relative flex min-h-svh flex-col overflow-hidden pt-(--header-h)"
      >
        <p className="mt-6 text-center text-xs font-semibold uppercase tracking-[0.2em] text-secondary">
          New releases <span aria-hidden="true">·</span> Drop 01
        </p>

        <div className="flex min-w-0 flex-1 items-center">
          <div className="w-full min-w-0">
            {rail.length > 0 ? (
              <RailScene products={rail} />
            ) : (
              <p className="px-4 text-center text-lg text-secondary">
                The first release is on its way. Nothing is published yet.
              </p>
            )}
          </div>
        </div>

        <div className="flex items-end justify-between gap-8 px-4 pb-6 md:px-8 md:pb-8">
          <SplitHeadline
            as="h1"
            text="DISTRICT 19"
            onLoad
            delay={0.25}
            className="min-w-0 font-display text-[11.5vw] font-extrabold uppercase leading-[0.86] tracking-tighter md:shrink-0 md:whitespace-nowrap md:text-[6.4vw]"
          />
          <p className="hidden max-w-xs pb-2 text-right text-sm text-secondary md:block">
            Shirts, pants and shoes in small runs. Pick a piece off the rail to
            bring it forward.
          </p>
        </div>
        <span id="hero-title" className="sr-only">
          DISTRICT 19 new releases
        </span>
      </section>

      {isDemoCatalog() && (
        <p className="border-b border-border bg-background px-4 py-3 text-center text-sm text-secondary">
          Sample catalogue with drawn placeholders. Real products and photos
          appear here once they are published from the admin dashboard.
        </p>
      )}

      {/* Featured collections */}
      <section aria-label="Collections" className="mx-auto max-w-[1440px] px-4 py-24 md:px-8 md:py-36">
        <SectionHeader eyebrow="Featured collections" title="Three lines" />
        <div className="mt-12 grid gap-10 md:mt-16 md:grid-cols-3 md:gap-8">
          <CollectionTile category="shirt" product={featuredOf(shirts)} count={shirts.length} delay={0} />
          <CollectionTile
            category="pant"
            product={featuredOf(pants)}
            count={pants.length}
            delay={0.12}
            className="md:mt-24"
          />
          <CollectionTile category="shoe" product={featuredOf(shoes)} count={shoes.length} delay={0.24} />
        </div>
      </section>

      {/* Shirts */}
      <section
        aria-label="Shirts"
        hidden={shirtPicks.length === 0}
        className="mx-auto max-w-[1440px] px-4 pb-24 md:px-8 md:pb-36"
      >
        <SectionHeader eyebrow="Line 01" title="Shirts" href="/shirts" linkLabel="All shirts" />
        <ul className="mt-12 grid grid-cols-2 gap-x-4 gap-y-10 md:mt-16 lg:grid-cols-4 lg:gap-x-6">
          {shirtPicks.map((product, index) => (
            <li key={product.id}>
              <Reveal delay={index * 0.05}>
                <ProductCard product={product} />
              </Reveal>
            </li>
          ))}
        </ul>
      </section>

      {/* Pants: Try the Look */}
      <section aria-label="Pants, shown as full looks" className="border-y border-border">
        {looks.length > 0 && <LookScene looks={looks} />}
        <div className="mx-auto flex max-w-[1440px] items-center justify-between gap-6 border-t border-border px-4 py-5 md:px-8">
          <p className="text-sm text-secondary">
            <span className="font-semibold text-foreground">Line 02 — Pants.</span>{" "}
            Wide, baggy and cargo cuts, styled head to toe.
          </p>
          <Link
            href="/pants"
            className="group inline-flex min-h-11 shrink-0 items-center gap-2 border-b border-foreground text-xs font-semibold uppercase tracking-[0.16em]"
          >
            All pants
            <Icon name="arrowRight" size={14} className="transition-transform duration-300 group-hover:translate-x-1" />
          </Link>
        </div>
      </section>

      {/* Shoes: the float */}
      <section aria-label="Shoes" className="border-b border-border">
        <FloatScene products={floatShoes} />
        <div className="mx-auto flex max-w-[1440px] items-center justify-between gap-6 border-t border-border px-4 py-5 md:px-8">
          <p className="text-sm text-secondary">
            <span className="font-semibold text-foreground">Line 03 — Shoes.</span>{" "}
            Runners, court shoes and high-tops.
          </p>
          <Link
            href="/shoes"
            className="group inline-flex min-h-11 shrink-0 items-center gap-2 border-b border-foreground text-xs font-semibold uppercase tracking-[0.16em]"
          >
            All shoes
            <Icon name="arrowRight" size={14} className="transition-transform duration-300 group-hover:translate-x-1" />
          </Link>
        </div>
      </section>

      {/* Best sellers */}
      <section
        aria-label="Best sellers"
        hidden={bestSellers.length === 0}
        className="mx-auto max-w-[1440px] px-4 py-24 md:px-8 md:py-36"
      >
        <SectionHeader eyebrow="Most wanted" title="Best sellers" />
        <ul className="mt-12 grid grid-cols-2 gap-x-4 gap-y-10 md:mt-16 lg:grid-cols-4 lg:gap-x-6">
          {bestSellers.map((product, index) => (
            <li key={product.id}>
              <Reveal delay={index * 0.05}>
                <ProductCard product={product} />
              </Reveal>
            </li>
          ))}
        </ul>
      </section>

      {/* Brand introduction */}
      <section aria-label="About DISTRICT 19" className="bg-background">
        <div className="mx-auto grid max-w-[1440px] gap-10 px-4 py-24 md:grid-cols-[1fr_3fr] md:px-8 md:py-40">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            The label
          </p>
          <div>
            <ScrollStatement
              text="DISTRICT 19 makes shirts, pants and shoes in small runs. Every release is cut once and gone when it sells out. Built in Dhaka for the street, not the shelf."
              className="text-3xl font-extrabold leading-[1.1] tracking-tight md:text-5xl lg:text-6xl"
            />
            <Reveal className="mt-12 grid gap-8 text-base text-secondary sm:grid-cols-3">
              <p>
                <span className="block font-semibold text-foreground">Small runs</span>
                Limited quantities per release, with restocks only when stated.
              </p>
              <p>
                <span className="block font-semibold text-foreground">Nationwide delivery</span>
                Inside Dhaka and to every district, with tracking by phone.
              </p>
              <p>
                <span className="block font-semibold text-foreground">Pay your way</span>
                Cash on Delivery, bKash or Nagad.
              </p>
            </Reveal>
          </div>
        </div>
      </section>
    </>
  );
}
