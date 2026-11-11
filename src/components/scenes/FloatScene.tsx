"use client";

import Link from "next/link";
import { ViewTransition, useMemo, useRef, useState, type CSSProperties, type PointerEvent } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ProductVisual } from "@/components/product/ProductVisual";
import { Icon } from "@/components/site/Icon";
import { formatBDT } from "@/lib/format";
import { effectivePrice, isOnSale, type Product } from "@/lib/types";

const EXPO_OUT = [0.16, 1, 0.3, 1] as const;
const PER_PAGE = 5;

/* Where each shoe sits. x/y/w are desktop, mx/my/mw are phones; all in % of the stage. */
const SLOTS = [
  { x: "38%", y: "24%", w: "27%", mx: "14%", my: "34%", mw: "70%", depth: 1, tilt: "-9deg", speed: "9s", delay: "0s" },
  { x: "66%", y: "13%", w: "14%", mx: "56%", my: "17%", mw: "34%", depth: 0.55, tilt: "5deg", speed: "11s", delay: "-3s" },
  { x: "85%", y: "20%", w: "7.5%", mx: "8%", my: "20%", mw: "24%", depth: 0.25, tilt: "-5deg", speed: "13s", delay: "-6s" },
  { x: "27%", y: "58%", w: "15%", mx: "8%", my: "66%", mw: "40%", depth: 0.7, tilt: "-12deg", speed: "10s", delay: "-2s" },
  { x: "17%", y: "80%", w: "8%", mx: "58%", my: "70%", mw: "28%", depth: 0.35, tilt: "14deg", speed: "12s", delay: "-8s" },
];

/**
 * Scene 2 from the reference reel: cut-out shoes floating on white. The name
 * at top left follows whichever shoe is hovered or focused.
 */
export function FloatScene({ products }: { products: Product[] }) {
  const reduce = useReducedMotion();
  const stage = useRef<HTMLDivElement>(null);
  const pages = useMemo(() => {
    const chunks: Product[][] = [];
    for (let i = 0; i < products.length; i += PER_PAGE) chunks.push(products.slice(i, i + PER_PAGE));
    return chunks;
  }, [products]);
  const [pageIndex, setPageIndex] = useState(0);
  const [activeId, setActiveId] = useState<string | null>(null);

  const current = pages[pageIndex] ?? [];
  const active = current.find((p) => p.id === activeId) ?? current[0];

  function onPointerMove(event: PointerEvent<HTMLDivElement>) {
    if (reduce || event.pointerType !== "mouse" || !stage.current) return;
    const box = stage.current.getBoundingClientRect();
    stage.current.style.setProperty("--px", (((event.clientX - box.left) / box.width) * 2 - 1).toFixed(3));
    stage.current.style.setProperty("--py", (((event.clientY - box.top) / box.height) * 2 - 1).toFixed(3));
  }

  function goTo(index: number) {
    setPageIndex(index);
    setActiveId(null);
  }

  if (!active) return null;

  return (
    <div
      ref={stage}
      onPointerMove={onPointerMove}
      className="relative h-[92svh] max-h-[920px] min-h-[600px] overflow-hidden bg-paper"
    >
      {/* Title block: follows the active shoe. */}
      <div className="absolute left-4 top-6 z-20 max-w-[70%] md:left-8 md:top-10 md:max-w-[30%]" aria-live="polite">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={active.id}
            initial={{ opacity: 0, y: reduce ? 0 : 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: reduce ? 0 : -10 }}
            transition={{ duration: reduce ? 0.15 : 0.32, ease: EXPO_OUT }}
          >
            <h3 className="text-4xl font-extrabold uppercase leading-[0.95] tracking-tight md:text-5xl lg:text-6xl">
              {active.name}
            </h3>
            <p className="tabular mt-3 text-base text-muted-foreground">
              {isOnSale(active) && (
                <span className="mr-2 line-through">{formatBDT(active.price)}</span>
              )}
              <span className="text-foreground">{formatBDT(effectivePrice(active))}</span>
            </p>
            <Link
              href={`/product/${active.slug}`}
              className="group mt-4 inline-flex items-center gap-2 border-b border-foreground pb-1 text-xs font-semibold uppercase tracking-[0.16em]"
            >
              View product
              <Icon
                name="arrowRight"
                size={14}
                className="transition-transform duration-300 group-hover:translate-x-1"
              />
            </Link>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* The shoes. */}
      <AnimatePresence mode="wait" initial={false}>
        <motion.ul
          key={pageIndex}
          className="absolute inset-0"
          initial="hidden"
          animate="shown"
          exit="gone"
          transition={{ staggerChildren: 0.06 }}
        >
          {current.map((product, index) => {
            const slot = SLOTS[index];
            const isActive = product.id === active.id;
            return (
              <li
                key={product.id}
                className="float-item"
                style={
                  {
                    "--x": slot.x,
                    "--y": slot.y,
                    "--w": slot.w,
                    "--mx": slot.mx,
                    "--my": slot.my,
                    "--mw": slot.mw,
                    "--depth": slot.depth,
                    zIndex: isActive ? 10 : Math.round(slot.depth * 5),
                  } as CSSProperties
                }
              >
                <motion.div
                  variants={{
                    hidden: reduce ? { opacity: 0 } : { opacity: 0, scale: 0.55, y: 60 },
                    shown: { opacity: 1, scale: 1, y: 0, transition: { duration: reduce ? 0.15 : 0.9, ease: EXPO_OUT } },
                    gone: { opacity: 0, scale: reduce ? 1 : 0.8, transition: { duration: reduce ? 0.1 : 0.25 } },
                  }}
                >
                  <div
                    className="float-drift"
                    style={{ "--tilt": slot.tilt, "--speed": slot.speed, "--delay": slot.delay } as CSSProperties}
                  >
                    <Link
                      href={`/product/${product.slug}`}
                      prefetch
                      aria-label={`${product.name}, ${formatBDT(effectivePrice(product))}`}
                      onPointerEnter={() => setActiveId(product.id)}
                      onFocus={() => setActiveId(product.id)}
                      className={`block transition-[scale,opacity] duration-500 ease-out-expo ${
                        isActive ? "scale-110 opacity-100" : "scale-100 opacity-55"
                      }`}
                    >
                      <ViewTransition name={`product-${product.slug}`} share="morph" default="none">
                        <div>
                          <ProductVisual
                            product={product}
                            labelled={false}
                            sizes="(min-width: 768px) 28vw, 70vw"
                          />
                        </div>
                      </ViewTransition>
                    </Link>
                  </div>
                </motion.div>
              </li>
            );
          })}
        </motion.ul>
      </AnimatePresence>

      {/* Scrubber: one segment per group of shoes. */}
      {pages.length > 1 && (
        <div className="absolute inset-x-0 bottom-6 z-20 flex items-center justify-center gap-4 md:bottom-10">
          <div role="group" aria-label="More shoes" className="flex items-center gap-1.5">
            {pages.map((_, index) => (
              <button
                key={index}
                type="button"
                aria-label={`Show shoes ${index * PER_PAGE + 1} to ${Math.min((index + 1) * PER_PAGE, products.length)}`}
                aria-pressed={index === pageIndex}
                onClick={() => goTo(index)}
                className="group grid h-11 w-16 place-items-center md:w-24"
              >
                <span
                  className={`block h-0.5 w-full transition-colors duration-300 ${
                    index === pageIndex ? "bg-foreground" : "bg-border group-hover:bg-muted-foreground"
                  }`}
                />
              </button>
            ))}
          </div>
          <p className="tabular text-xs text-muted-foreground" aria-hidden="true">
            {String(pageIndex + 1).padStart(2, "0")} / {String(pages.length).padStart(2, "0")}
          </p>
        </div>
      )}
    </div>
  );
}
