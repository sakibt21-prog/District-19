"use client";

import Image from "next/image";
import Link from "next/link";
import { PlaceholderArt } from "@/components/art/PlaceholderArt";
import { Icon } from "@/components/site/Icon";
import { formatBDT } from "@/lib/format";
import { useCart, type CartLine } from "./CartProvider";

export function LineThumb({ line, className = "size-24" }: { line: CartLine; className?: string }) {
  return (
    <span className={`relative grid shrink-0 place-items-center bg-background p-2 ${className}`}>
      {line.imageUrl ? (
        <Image src={line.imageUrl} alt="" fill sizes="96px" className="object-contain p-2" />
      ) : (
        <PlaceholderArt category={line.category} cut={line.cut} color={line.colorHex} className="h-full w-full" />
      )}
    </span>
  );
}

export function CartView() {
  const { lines, ready, subtotal, count, setQuantity, remove } = useCart();

  if (!ready) {
    return <div aria-hidden="true" className="mt-10 h-48 animate-pulse bg-background" />;
  }

  if (lines.length === 0) {
    return (
      <div className="mt-10 border-t border-border py-20 text-center">
        <p className="text-2xl font-extrabold uppercase tracking-tight">Your cart is empty</p>
        <p className="mt-2 text-secondary">Pick something off the rail to get started.</p>
        <Link
          href="/"
          className="mt-6 inline-flex h-12 items-center gap-2 bg-primary px-6 text-sm font-semibold uppercase tracking-[0.14em] text-on-primary transition-opacity hover:opacity-85"
        >
          Back to the shop
          <Icon name="arrowRight" size={16} />
        </Link>
      </div>
    );
  }

  return (
    <div className="mt-10 grid gap-10 lg:grid-cols-[1fr_22rem] lg:gap-16">
      <ul className="divide-y divide-border border-y border-border">
        {lines.map((line) => (
          <li key={line.variantId} className="flex gap-4 py-5">
            <Link href={`/product/${line.slug}`} aria-label={line.name}>
              <LineThumb line={line} />
            </Link>
            <div className="flex min-w-0 flex-1 flex-col justify-between gap-3">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <h2 className="text-sm font-extrabold uppercase leading-tight tracking-wide">
                    <Link href={`/product/${line.slug}`}>{line.name}</Link>
                  </h2>
                  <p className="mt-1 text-sm text-secondary">
                    {line.color} · Size {line.size}
                  </p>
                </div>
                <p className="tabular shrink-0 text-sm font-semibold">
                  {formatBDT(line.unitPrice * line.quantity)}
                </p>
              </div>
              <div className="flex items-center justify-between">
                <div role="group" aria-label={`Quantity of ${line.name}`} className="flex h-11 items-center border border-border">
                  <button
                    type="button"
                    aria-label="Decrease quantity"
                    disabled={line.quantity <= 1}
                    onClick={() => setQuantity(line.variantId, line.quantity - 1)}
                    className="grid h-full w-11 place-items-center disabled:opacity-30"
                  >
                    <Icon name="minus" size={14} />
                  </button>
                  <output aria-live="polite" className="tabular w-7 text-center text-sm font-semibold">
                    {line.quantity}
                  </output>
                  <button
                    type="button"
                    aria-label="Increase quantity"
                    disabled={line.quantity >= line.maxQuantity}
                    onClick={() => setQuantity(line.variantId, line.quantity + 1)}
                    className="grid h-full w-11 place-items-center disabled:opacity-30"
                  >
                    <Icon name="plus" size={14} />
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => remove(line.variantId)}
                  className="inline-flex min-h-11 items-center gap-2 text-sm text-secondary transition-colors hover:text-destructive"
                >
                  <Icon name="trash" size={16} />
                  Remove
                </button>
              </div>
            </div>
          </li>
        ))}
      </ul>

      <aside aria-label="Order summary" className="h-fit bg-background p-6 lg:sticky lg:top-[calc(var(--header-h)+1.5rem)]">
        <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Summary</h2>
        <dl className="mt-4 space-y-2 text-sm">
          <div className="flex justify-between">
            <dt>
              Subtotal ({count} {count === 1 ? "item" : "items"})
            </dt>
            <dd className="tabular font-semibold">{formatBDT(subtotal)}</dd>
          </div>
          <div className="flex justify-between text-secondary">
            <dt>Delivery</dt>
            <dd>Calculated at checkout</dd>
          </div>
        </dl>
        <Link
          href="/checkout"
          className="mt-6 flex h-14 items-center justify-center gap-2 bg-primary px-6 text-sm font-semibold uppercase tracking-[0.14em] text-on-primary transition-opacity hover:opacity-85"
        >
          Checkout
          <Icon name="arrowRight" size={16} />
        </Link>
        <p className="mt-3 text-center text-xs text-secondary">Cash on Delivery, bKash or Nagad.</p>
      </aside>
    </div>
  );
}
