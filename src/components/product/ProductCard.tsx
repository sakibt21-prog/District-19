import Link from "next/link";
import { ViewTransition } from "react";
import { formatBDT } from "@/lib/format";
import {
  colorsOf,
  effectivePrice,
  isOnSale,
  totalStock,
  type Product,
} from "@/lib/types";
import { ProductVisual } from "./ProductVisual";

export function Badges({ product }: { product: Product }) {
  const soldOut = totalStock(product) === 0;
  return (
    <span className="flex flex-wrap gap-1.5">
      {soldOut && (
        <span className="bg-paper px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground ring-1 ring-border">
          Sold out
        </span>
      )}
      {!soldOut && product.isNew && (
        <span className="bg-primary px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-on-primary">
          New release
        </span>
      )}
      {!soldOut && isOnSale(product) && (
        <span className="bg-accent px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-on-accent">
          Sale −{Math.round((1 - effectivePrice(product) / product.price) * 100)}%
        </span>
      )}
    </span>
  );
}

export function Price({ product, className = "" }: { product: Product; className?: string }) {
  return (
    <span className={`tabular ${className}`}>
      {isOnSale(product) && (
        <>
          <span className="sr-only">Was </span>
          <span className="mr-2 text-muted-foreground line-through">{formatBDT(product.price)}</span>
          <span className="sr-only">now </span>
        </>
      )}
      <span>{formatBDT(effectivePrice(product))}</span>
    </span>
  );
}

interface Props {
  product: Product;
  /**
   * Makes the picture the shared element for the move to the product page.
   * Only set this where the product appears once on the page.
   */
  shared?: boolean;
  sizes?: string;
  priority?: boolean;
}

export function ProductCard({ product, shared = false, sizes, priority }: Props) {
  const colors = colorsOf(product);
  const visual = (
    <div className="w-[68%] transition-transform duration-700 ease-out-expo group-hover:scale-[1.06] group-hover:-rotate-2">
      <ProductVisual product={product} labelled={false} sizes={sizes} priority={priority} />
    </div>
  );
  return (
    <Link href={`/product/${product.slug}`} className="group block">
      <div className="relative grid aspect-[4/5] place-items-center overflow-hidden bg-background">
        <span className="absolute left-3 top-3 z-10">
          <Badges product={product} />
        </span>
        {shared ? (
          <ViewTransition name={`product-${product.slug}`} share="morph" default="none">
            {visual}
          </ViewTransition>
        ) : (
          visual
        )}
      </div>
      <div className="mt-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-sm font-extrabold uppercase leading-tight tracking-wide">
            {product.name}
          </h3>
          <Price product={product} className="mt-1 block text-sm" />
        </div>
        <ul aria-label={`${colors.length} ${colors.length === 1 ? "colour" : "colours"}`} className="mt-0.5 flex shrink-0 gap-1">
          {colors.map((color) => (
            <li
              key={color.name}
              title={color.name}
              className="size-3 rounded-full ring-1 ring-border"
              style={{ backgroundColor: color.hex }}
            />
          ))}
        </ul>
      </div>
    </Link>
  );
}
