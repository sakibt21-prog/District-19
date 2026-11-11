"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, LayoutGroup, motion, useReducedMotion } from "motion/react";
import { ModelArt } from "@/components/art/PlaceholderArt";
import { ProductVisual } from "@/components/product/ProductVisual";
import { Icon } from "@/components/site/Icon";
import { formatBDT } from "@/lib/format";
import { effectivePrice, type Look } from "@/lib/types";

const EXPO_OUT = [0.16, 1, 0.3, 1] as const;
const EXPO_IN_OUT = [0.87, 0, 0.13, 1] as const;

function LookFigure({ look, sizes }: { look: Look; sizes: string }) {
  if (look.modelImageUrl) {
    return (
      <Image
        src={look.modelImageUrl}
        alt=""
        fill
        sizes={sizes}
        className="object-contain object-bottom"
      />
    );
  }
  const colorOf = (category: string, fallback: string) =>
    look.items.find((item) => item.category === category)?.variants[0]?.colorHex ?? fallback;
  return (
    <ModelArt
      top={colorOf("shirt", "#e7e5e4")}
      bottom={colorOf("pant", "#57534e")}
      shoes={colorOf("shoe", "#1c1917")}
      topCut={look.items.find((item) => item.category === "shirt")?.cut}
      className="absolute inset-0 h-full w-full"
    />
  );
}

/**
 * Scene 3 from the reference reel: a row of models. Choosing one moves that
 * model to the centre and lists the pieces in the outfit beside it.
 */
export function LookScene({ looks }: { looks: Look[] }) {
  const reduce = useReducedMotion();
  const [openId, setOpenId] = useState<string | null>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const lastTrigger = useRef<string | null>(null);
  const open = looks.find((look) => look.id === openId) ?? null;

  // Move keyboard focus with the view: into the outfit when it opens, back to the model when it closes.
  useEffect(() => {
    if (openId) {
      closeButton.current?.focus({ preventScroll: true });
    } else if (lastTrigger.current) {
      document.getElementById(`look-trigger-${lastTrigger.current}`)?.focus({ preventScroll: true });
      lastTrigger.current = null;
    }
  }, [openId]);

  useEffect(() => {
    if (!openId) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpenId(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [openId]);

  const layoutTransition = reduce
    ? { duration: 0 }
    : { duration: 0.7, ease: EXPO_IN_OUT };

  return (
    <LayoutGroup id="looks">
      <div className="relative min-h-[640px] overflow-hidden bg-paper md:h-[92svh] md:max-h-[920px]">
        <AnimatePresence initial={false} mode="popLayout">
          {!open ? (
            <motion.div
              key="row"
              className="flex h-full min-h-[640px] flex-col"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: reduce ? 0.15 : 0.3 }}
            >
              <ul className="group/row no-scrollbar mt-auto flex snap-x snap-mandatory items-end gap-4 overflow-x-auto px-4 pb-10 pt-32 md:justify-center md:gap-[3vw] md:overflow-visible md:px-8 md:pb-14">
                {looks.map((look, index) => (
                  <motion.li
                    key={look.id}
                    className="w-[44vw] shrink-0 snap-center sm:w-[28vw] md:w-[13vw]"
                    initial={reduce ? { opacity: 0 } : { opacity: 0, y: 50 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: "0px 0px -10% 0px" }}
                    transition={{ duration: reduce ? 0.15 : 0.8, delay: index * 0.06, ease: EXPO_OUT }}
                  >
                    <button
                      id={`look-trigger-${look.id}`}
                      type="button"
                      onClick={() => {
                        lastTrigger.current = look.id;
                        setOpenId(look.id);
                      }}
                      aria-label={`${look.name}: ${look.items.map((item) => item.name).join(", ")}`}
                      className="block w-full transition-[opacity,translate] duration-500 ease-out-expo hover:-translate-y-2 focus-visible:-translate-y-2 md:group-hover/row:opacity-40 md:hover:opacity-100!"
                    >
                      <motion.div
                        layoutId={`look-${look.id}`}
                        transition={layoutTransition}
                        className="relative aspect-[140/360] w-full"
                      >
                        <LookFigure look={look} sizes="(min-width: 768px) 13vw, 44vw" />
                      </motion.div>
                      <span className="mt-3 block text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                        {look.name}
                      </span>
                    </button>
                  </motion.li>
                ))}
              </ul>
            </motion.div>
          ) : (
            <motion.div
              key={open.id}
              className="grid min-h-[640px] grid-cols-1 items-end gap-6 px-4 pb-10 pt-28 md:h-full md:grid-cols-[1fr_minmax(0,22rem)_1fr] md:gap-10 md:px-8 md:pb-14"
              initial={{ opacity: 1 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: reduce ? 0.15 : 0.25 }}
            >
              <div className="hidden md:block" />
              <motion.div
                layoutId={`look-${open.id}`}
                transition={layoutTransition}
                className="relative mx-auto aspect-[140/360] h-[52svh] max-h-[620px] md:h-[72svh]"
              >
                <LookFigure look={open} sizes="(min-width: 768px) 30vw, 70vw" />
              </motion.div>

              <div className="md:self-center">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  {open.name} — in this look
                </p>
                <ul className="mt-4 divide-y divide-border border-y border-border md:max-w-sm">
                  {open.items.map((item, index) => (
                    <motion.li
                      key={item.id}
                      initial={reduce ? { opacity: 0 } : { opacity: 0, x: 28 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{
                        duration: reduce ? 0.15 : 0.55,
                        delay: reduce ? 0 : 0.35 + index * 0.04,
                        ease: EXPO_OUT,
                      }}
                    >
                      <Link
                        href={`/product/${item.slug}`}
                        className="group flex items-center gap-4 py-3"
                      >
                        <span className="grid size-16 shrink-0 place-items-center bg-background p-2">
                          <ProductVisual product={item} labelled={false} sizes="64px" className="w-full" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-extrabold uppercase leading-tight tracking-wide">
                            {item.name}
                          </span>
                          <span className="tabular mt-0.5 block text-sm text-muted-foreground">
                            {formatBDT(effectivePrice(item))}
                          </span>
                        </span>
                        <Icon
                          name="arrowUpRight"
                          size={18}
                          className="shrink-0 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                        />
                      </Link>
                    </motion.li>
                  ))}
                </ul>
                <button
                  ref={closeButton}
                  type="button"
                  onClick={() => setOpenId(null)}
                  className="mt-6 inline-flex min-h-11 items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em]"
                >
                  <Icon name="arrowLeft" size={16} />
                  All looks
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <h3 className="pointer-events-none absolute left-4 top-6 text-4xl font-extrabold leading-none tracking-tight md:left-8 md:top-10 md:text-5xl">
          Try the Look.
        </h3>
      </div>
    </LayoutGroup>
  );
}
