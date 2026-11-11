"use client";

import Image from "next/image";
import Link from "next/link";
import { ViewTransition, useEffect, useId, useMemo, useRef, useState, type PointerEvent } from "react";
import { animate, motion, useMotionValue, useReducedMotion } from "motion/react";
import { useCart } from "@/components/cart/CartProvider";
import { Icon } from "@/components/site/Icon";
import { formatBDT } from "@/lib/format";
import {
  CATEGORY_LABEL,
  CATEGORY_PATH,
  colorsOf,
  effectivePrice,
  isOnSale,
  primaryImage,
  sizesOf,
  totalStock,
  type Product,
} from "@/lib/types";
import { Badges } from "./ProductCard";
import { ASPECT, ProductVisual } from "./ProductVisual";
import { SizeGuideButton } from "./SizeGuide";

const EXPO_IN_OUT = [0.87, 0, 0.13, 1] as const;

/* Pants are tall and shoes are wide, so each category gets its own stage width. */
const STAGE_WIDTH: Record<Product["category"], string> = {
  shirt: "w-[min(72vw,440px)] lg:w-[min(34vw,480px)]",
  pant: "w-[min(48vw,300px)] lg:w-[min(24vw,340px)]",
  shoe: "w-[min(84vw,520px)] lg:w-[min(40vw,560px)]",
};

/**
 * The top of a product page: the turning product on the left (as in the
 * reference reel) and the buying controls on the right. The chosen colour is
 * shared between the two so the drawn placeholder follows the swatch.
 */
export function ProductDetail({ product }: { product: Product }) {
  const reduce = useReducedMotion();
  const cart = useCart();
  const colors = useMemo(() => colorsOf(product), [product]);
  const sizes = useMemo(() => sizesOf(product), [product]);
  const gallery = useMemo(
    () => [...product.images].filter((i) => i.role === "gallery").sort((a, b) => a.sortOrder - b.sortOrder),
    [product],
  );

  const [color, setColor] = useState(colors[0]?.name ?? "");
  const [size, setSize] = useState<string | null>(null);
  const [wanted, setQuantity] = useState(1);
  const [sizeError, setSizeError] = useState(false);
  const [justAdded, setJustAdded] = useState(false);
  /** Which side faces the viewer, or the id of a gallery photo shown flat. */
  const [view, setView] = useState<"front" | "back" | string>("front");

  const sizeErrorId = useId();
  const sizeGroup = useRef<HTMLDivElement>(null);
  const colorHex = colors.find((c) => c.name === color)?.hex;
  const stockFor = (s: string) =>
    product.variants.find((v) => v.color === color && v.size === s)?.stock ?? 0;
  const variant = size ? product.variants.find((v) => v.color === color && v.size === size) : undefined;
  const soldOut = totalStock(product) === 0;
  const available = variant ? variant.stock : null;
  // The quantity never exceeds what is in stock for the chosen size.
  const quantity = available != null ? Math.max(1, Math.min(wanted, available)) : wanted;

  function chooseColor(name: string) {
    setColor(name);
    // A size that is sold out in the newly chosen colour is cleared.
    const stillAvailable =
      size != null && (product.variants.find((v) => v.color === name && v.size === size)?.stock ?? 0) > 0;
    if (!stillAvailable) setSize(null);
  }

  /* ---- The turn ---- */
  const rotation = useMotionValue(0);
  const drag = useRef<{ startX: number; startRotation: number } | null>(null);

  useEffect(() => {
    if (reduce) return;
    // One full turn on arrival, after the shared-element move has landed.
    const controls = animate(rotation, 360, { duration: 1.5, delay: 0.7, ease: EXPO_IN_OUT });
    controls.then(() => rotation.set(0));
    return () => controls.stop();
  }, [reduce, rotation]);

  function turnTo(side: "front" | "back") {
    setView(side);
    const target = side === "front" ? 0 : 180;
    const current = rotation.get();
    // Go the short way round from wherever the product is now.
    const base = Math.round((current - target) / 360) * 360 + target;
    if (reduce) rotation.set(base);
    else animate(rotation, base, { duration: 0.8, ease: EXPO_IN_OUT });
  }

  function onPointerDown(event: PointerEvent<HTMLDivElement>) {
    if (view !== "front" && view !== "back") return;
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = { startX: event.clientX, startRotation: rotation.get() };
  }
  function onPointerMove(event: PointerEvent<HTMLDivElement>) {
    if (!drag.current) return;
    rotation.set(drag.current.startRotation + (event.clientX - drag.current.startX) * 0.6);
  }
  function onPointerUp() {
    if (!drag.current) return;
    drag.current = null;
    const settled = Math.round(rotation.get() / 180) * 180;
    setView(Math.abs(settled / 180) % 2 === 1 ? "back" : "front");
    animate(rotation, settled, { type: "spring", stiffness: 170, damping: 22 });
  }

  function addToCart() {
    if (!size || !variant) {
      setSizeError(true);
      sizeGroup.current?.querySelector<HTMLButtonElement>("button:not(:disabled)")?.focus();
      return;
    }
    if (variant.stock <= 0) return;
    cart.add({
      variantId: variant.id,
      productId: product.id,
      slug: product.slug,
      name: product.name,
      category: product.category,
      cut: product.cut,
      size: variant.size,
      color: variant.color,
      colorHex: variant.colorHex,
      unitPrice: effectivePrice(product),
      imageUrl: primaryImage(product)?.url ?? null,
      quantity,
      maxQuantity: variant.stock,
    });
    setJustAdded(true);
    window.setTimeout(() => setJustAdded(false), 2400);
  }

  const flatPhoto = gallery.find((image) => image.id === view);
  const stockMessage = soldOut
    ? { text: "Sold out", tone: "text-muted-foreground" }
    : available == null
      ? { text: "In stock", tone: "text-success" }
      : available === 0
        ? { text: "This size is sold out", tone: "text-muted-foreground" }
        : available <= 3
          ? { text: `Only ${available} left in this size`, tone: "text-accent" }
          : { text: "In stock", tone: "text-success" };

  return (
    <div className="grid lg:min-h-[calc(100svh-var(--header-h))] lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
      {/* Left: the product, turning */}
      <div className="relative flex flex-col items-center justify-center bg-paper px-4 pb-6 pt-8 md:px-8 lg:py-12">
        <span className="absolute left-4 top-4 z-10 md:left-8 md:top-6">
          <Badges product={product} />
        </span>

        <div
          className={`spin-stage touch-pan-y select-none ${STAGE_WIDTH[product.category]}`}
          style={{ cursor: flatPhoto ? "default" : "grab" }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          <ViewTransition name={`product-${product.slug}`} share="morph" default="none">
            <div>
              {flatPhoto ? (
                <div className="relative" style={{ aspectRatio: ASPECT[product.category] }}>
                  <Image
                    src={flatPhoto.url}
                    alt={`${product.name}, detail photo`}
                    fill
                    sizes="(min-width: 1024px) 34vw, 72vw"
                    className="object-contain"
                  />
                </div>
              ) : (
                <motion.div className="spin-plane relative" style={{ rotateY: rotation }}>
                  <div className="spin-face">
                    <ProductVisual
                      product={product}
                      colorHex={colorHex}
                      priority
                      sizes="(min-width: 1024px) 34vw, 72vw"
                    />
                  </div>
                  <div className="spin-face absolute inset-0" style={{ transform: "rotateY(180deg)" }}>
                    <ProductVisual
                      product={product}
                      colorHex={colorHex}
                      view="back"
                      labelled={false}
                      sizes="(min-width: 1024px) 34vw, 72vw"
                    />
                  </div>
                </motion.div>
              )}
            </div>
          </ViewTransition>
        </div>

        <div role="group" aria-label="Product views" className="mt-8 flex flex-wrap items-center justify-center gap-2">
          {(["front", "back"] as const).map((side) => (
            <button
              key={side}
              type="button"
              aria-pressed={view === side}
              onClick={() => turnTo(side)}
              className={`min-h-11 border px-4 text-xs font-semibold uppercase tracking-[0.14em] transition-colors ${
                view === side
                  ? "border-foreground bg-foreground text-paper"
                  : "border-border hover:border-foreground"
              }`}
            >
              {side}
            </button>
          ))}
          {gallery.map((image, index) => (
            <button
              key={image.id}
              type="button"
              aria-pressed={view === image.id}
              aria-label={`Photo ${index + 1}`}
              onClick={() => setView(image.id)}
              className={`relative size-11 overflow-hidden border bg-background transition-colors ${
                view === image.id ? "border-foreground" : "border-border hover:border-foreground"
              }`}
            >
              <Image src={image.url} alt="" fill sizes="44px" className="object-cover" />
            </button>
          ))}
        </div>
        <p className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
          <Icon name="rotate" size={14} />
          Drag the product to turn it
        </p>
      </div>

      {/* Right: buying controls */}
      <div className="border-t border-border px-4 py-10 md:px-8 lg:border-l lg:border-t-0 lg:py-16">
        <div className="mx-auto max-w-md lg:mx-0">
          <nav aria-label="Breadcrumb" className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
            <ol className="flex gap-2">
              <li>
                <Link href="/" className="hover:text-foreground">
                  Home
                </Link>
              </li>
              <li aria-hidden="true">/</li>
              <li>
                <Link href={CATEGORY_PATH[product.category]} className="hover:text-foreground">
                  {CATEGORY_LABEL[product.category]}
                </Link>
              </li>
            </ol>
          </nav>

          <h1 className="mt-4 text-4xl font-extrabold uppercase leading-[0.95] tracking-tight md:text-5xl">
            {product.name}
          </h1>
          <p className="tabular mt-4 text-xl">
            {isOnSale(product) && (
              <>
                <span className="sr-only">Was </span>
                <span className="mr-3 text-muted-foreground line-through">{formatBDT(product.price)}</span>
                <span className="sr-only">now </span>
              </>
            )}
            <span className="font-semibold">{formatBDT(effectivePrice(product))}</span>
          </p>

          {/* Colour */}
          <fieldset className="mt-8">
            <legend className="text-xs font-semibold uppercase tracking-[0.14em]">
              Colour: <span className="font-normal normal-case tracking-normal text-secondary">{color}</span>
            </legend>
            <div className="mt-3 flex flex-wrap gap-2">
              {colors.map((c) => (
                <label key={c.name} className="relative">
                  <input
                    type="radio"
                    name="colour"
                    value={c.name}
                    checked={color === c.name}
                    onChange={() => chooseColor(c.name)}
                    className="peer sr-only"
                  />
                  <span
                    title={c.name}
                    className="block size-11 cursor-pointer rounded-full border border-border p-1 transition-colors peer-checked:border-foreground peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ring"
                  >
                    <span className="block size-full rounded-full ring-1 ring-black/10" style={{ backgroundColor: c.hex }} />
                  </span>
                  <span className="sr-only">{c.name}</span>
                </label>
              ))}
            </div>
          </fieldset>

          {/* Size */}
          <div className="mt-8">
            <div className="flex items-center justify-between">
              <p id="size-label" className="text-xs font-semibold uppercase tracking-[0.14em]">
                Size <span aria-hidden="true">*</span>
              </p>
              <SizeGuideButton category={product.category} />
            </div>
            <div
              ref={sizeGroup}
              role="radiogroup"
              aria-labelledby="size-label"
              aria-required="true"
              aria-describedby={sizeError ? sizeErrorId : undefined}
              className="mt-2 flex flex-wrap gap-2"
            >
              {sizes.map((s) => {
                const out = stockFor(s) === 0;
                const selected = size === s;
                return (
                  <button
                    key={s}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    aria-label={out ? `${s}, sold out` : s}
                    disabled={out}
                    onClick={() => {
                      setSize(s);
                      setSizeError(false);
                    }}
                    className={`tabular relative grid h-12 min-w-14 place-items-center border px-3 text-sm font-semibold transition-colors ${
                      selected
                        ? "border-foreground bg-foreground text-paper"
                        : out
                          ? "border-border text-muted-foreground/60 line-through"
                          : "border-border hover:border-foreground"
                    }`}
                  >
                    {s}
                  </button>
                );
              })}
            </div>
            {sizeError && (
              <p id={sizeErrorId} role="alert" className="mt-2 flex items-center gap-2 text-sm text-destructive">
                <Icon name="alert" size={16} />
                Choose a size before adding to cart.
              </p>
            )}
          </div>

          {/* Quantity and add */}
          <div className="mt-8 flex items-stretch gap-3">
            <div role="group" aria-label="Quantity" className="flex h-14 items-center border border-border">
              <button
                type="button"
                aria-label="Decrease quantity"
                disabled={quantity <= 1 || soldOut}
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                className="grid h-full w-12 place-items-center disabled:opacity-30"
              >
                <Icon name="minus" size={16} />
              </button>
              <output aria-live="polite" className="tabular w-8 text-center text-base font-semibold">
                {quantity}
              </output>
              <button
                type="button"
                aria-label="Increase quantity"
                disabled={soldOut || (available != null && quantity >= available)}
                onClick={() => setQuantity(quantity + 1)}
                className="grid h-full w-12 place-items-center disabled:opacity-30"
              >
                <Icon name="plus" size={16} />
              </button>
            </div>
            <button
              type="button"
              onClick={addToCart}
              disabled={soldOut || available === 0}
              className="flex h-14 flex-1 items-center justify-center gap-2 bg-primary px-6 text-sm font-semibold uppercase tracking-[0.14em] text-on-primary transition-opacity hover:opacity-85 active:scale-[0.99] disabled:bg-muted disabled:text-muted-foreground disabled:opacity-100"
            >
              {soldOut ? (
                "Sold out"
              ) : justAdded ? (
                <>
                  <Icon name="check" size={18} />
                  Added
                </>
              ) : (
                "Add to cart"
              )}
            </button>
          </div>

          <p className={`mt-3 flex items-center gap-2 text-sm font-medium ${stockMessage.tone}`}>
            <span aria-hidden="true" className="size-1.5 rounded-full bg-current" />
            {stockMessage.text}
          </p>
          {justAdded && (
            <p className="mt-2 text-sm">
              <Link href="/cart" className="font-semibold underline underline-offset-4">
                View cart
              </Link>
            </p>
          )}

          <ul className="mt-10 space-y-3 border-t border-border pt-6 text-sm text-secondary">
            <li className="flex gap-3">
              <Icon name="truck" size={18} className="mt-0.5 shrink-0" />
              Delivery across Bangladesh. Inside Dhaka in 1 to 2 days, elsewhere in 3 to 5.
            </li>
            <li className="flex gap-3">
              <Icon name="check" size={18} className="mt-0.5 shrink-0" />
              Pay with Cash on Delivery, bKash or Nagad.
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
