"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ViewTransition, useEffect, useRef, useState, type MouseEvent } from "react";
import { motion, useReducedMotion } from "motion/react";
import { Hanger } from "@/components/art/PlaceholderArt";
import { ProductVisual } from "@/components/product/ProductVisual";
import { Icon } from "@/components/site/Icon";
import { formatBDT } from "@/lib/format";
import { effectivePrice, type Product } from "@/lib/types";

const EXPO_IN_OUT = [0.87, 0, 0.13, 1] as const;
const FOCUS_MS = 620;

/**
 * Scene 1 from the reference reel: garments on hangers along a rail.
 * Hover swings a garment; choosing one brings it forward while the rest blur,
 * then the page changes with that garment as the one shared element.
 */
export function RailScene({ products }: { products: Product[] }) {
  const router = useRouter();
  const reduce = useReducedMotion();
  const scroller = useRef<HTMLDivElement>(null);
  const timer = useRef<number | null>(null);
  const [focused, setFocused] = useState<string | null>(null);
  const [edges, setEdges] = useState({ start: true, end: false });

  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    const update = () =>
      setEdges({
        start: el.scrollLeft <= 4,
        end: el.scrollLeft + el.clientWidth >= el.scrollWidth - 4,
      });
    update();
    el.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      el.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [products.length]);

  useEffect(
    () => () => {
      if (timer.current) window.clearTimeout(timer.current);
    },
    [],
  );

  function open(event: MouseEvent<HTMLAnchorElement>, product: Product) {
    // Leave new-tab and modified clicks to the browser.
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) {
      return;
    }
    if (reduce || focused) return;
    event.preventDefault();
    const href = `/product/${product.slug}`;
    router.prefetch(href);
    setFocused(product.id);
    event.currentTarget.scrollIntoView({ inline: "center", block: "nearest", behavior: "smooth" });
    timer.current = window.setTimeout(() => router.push(href), FOCUS_MS);
  }

  function page(direction: 1 | -1) {
    const el = scroller.current;
    if (!el) return;
    el.scrollBy({ left: direction * el.clientWidth * 0.6, behavior: reduce ? "auto" : "smooth" });
  }

  return (
    <div className="relative">
      <div
        ref={scroller}
        role="region"
        aria-label="New releases on the rail"
        tabIndex={0}
        className="no-scrollbar snap-x snap-mandatory overflow-x-auto overflow-y-hidden overscroll-x-contain md:snap-none"
      >
        <ul className="relative mx-auto flex w-max items-start gap-[3vw] px-[8vw] pb-16 pt-6 md:gap-[1.6vw] md:px-[6vw]">
          {/* The rail itself. */}
          <li
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 top-[calc(1.5rem+6px)] h-px bg-stone-500"
          />
          {products.map((product, index) => {
            const isFocused = focused === product.id;
            const dimmed = focused !== null && !isFocused;
            const isPant = product.category === "pant";
            return (
              <li key={product.id} className="w-[38vw] shrink-0 snap-center sm:w-[22vw] lg:w-[10.6vw]">
                <motion.div
                  initial={reduce ? false : { opacity: 0, y: -40 }}
                  animate={{
                    opacity: dimmed ? 0.22 : 1,
                    y: isFocused ? 36 : 0,
                    scale: isFocused ? 1.6 : 1,
                    filter: dimmed ? "blur(7px)" : "blur(0px)",
                  }}
                  transition={
                    focused
                      ? { duration: FOCUS_MS / 1000, ease: EXPO_IN_OUT }
                      : { duration: 0.9, delay: 0.15 + index * 0.045, ease: [0.16, 1, 0.3, 1] }
                  }
                  style={{ transformOrigin: "50% 0%", zIndex: isFocused ? 10 : 0 }}
                  className="relative"
                >
                  <Link
                    href={`/product/${product.slug}`}
                    prefetch
                    onClick={(event) => open(event, product)}
                    aria-label={`${product.name}, ${formatBDT(effectivePrice(product))}`}
                    className="rail-item group block"
                  >
                    <div className="hanger-swing">
                      <Hanger className="w-full" />
                      <ViewTransition name={`product-${product.slug}`} share="morph" default="none">
                        <div className={isPant ? "mx-auto -mt-[5%] w-[72%]" : "-mt-[20%]"}>
                          <ProductVisual
                            product={product}
                            labelled={false}
                            priority={index < 6}
                            sizes="(min-width: 1024px) 15vw, (min-width: 640px) 22vw, 38vw"
                          />
                        </div>
                      </ViewTransition>
                    </div>
                    <div
                      aria-hidden="true"
                      className={`mt-4 text-center transition-opacity duration-300 md:opacity-0 md:group-hover:opacity-100 md:group-focus-visible:opacity-100 ${
                        focused ? "!opacity-0" : ""
                      }`}
                    >
                      <p className="text-[11px] font-extrabold uppercase leading-tight tracking-wide">
                        {product.name}
                      </p>
                      <p className="tabular mt-0.5 text-[11px] text-muted-foreground">
                        {formatBDT(effectivePrice(product))}
                      </p>
                    </div>
                  </Link>
                </motion.div>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-center justify-end gap-2 px-4 md:px-8">
        <button
          type="button"
          onClick={() => page(-1)}
          disabled={edges.start}
          aria-label="Scroll the rail left"
          className="pointer-events-auto grid size-11 place-items-center rounded-full border border-foreground/60 transition-colors hover:bg-foreground hover:text-paper disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-foreground"
        >
          <Icon name="arrowLeft" size={18} />
        </button>
        <button
          type="button"
          onClick={() => page(1)}
          disabled={edges.end}
          aria-label="Scroll the rail right"
          className="pointer-events-auto grid size-11 place-items-center rounded-full border border-foreground/60 transition-colors hover:bg-foreground hover:text-paper disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-foreground"
        >
          <Icon name="arrowRight" size={18} />
        </button>
      </div>
    </div>
  );
}
