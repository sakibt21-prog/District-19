"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useId, useMemo, useState } from "react";
import { ProductCard } from "@/components/product/ProductCard";
import { Icon } from "@/components/site/Icon";
import {
  CATEGORIES,
  CATEGORY_LABEL,
  effectivePrice,
  isOnSale,
  totalStock,
  type Category,
  type Product,
} from "@/lib/types";

const SORTS = [
  { value: "newest", label: "Newest" },
  { value: "price-asc", label: "Price: low to high" },
  { value: "price-desc", label: "Price: high to low" },
  { value: "name", label: "Name: A to Z" },
] as const;
type Sort = (typeof SORTS)[number]["value"];

function listParam(value: string | null): string[] {
  return value ? value.split(",").filter(Boolean) : [];
}

function Chip({
  pressed,
  onClick,
  children,
  swatch,
}: {
  pressed: boolean;
  onClick: () => void;
  children: React.ReactNode;
  swatch?: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onClick}
      className={`tabular inline-flex min-h-11 items-center gap-2 border px-3 text-sm font-medium transition-colors ${
        pressed ? "border-foreground bg-foreground text-paper" : "border-border hover:border-foreground"
      }`}
    >
      {swatch && (
        <span
          aria-hidden="true"
          className="size-3 rounded-full ring-1 ring-black/20"
          style={{ backgroundColor: swatch }}
        />
      )}
      {children}
    </button>
  );
}

/**
 * Product grid with search, filters and sorting. Everything is filtered in the
 * browser from the list the server sent, and the choices live in the URL so a
 * filtered view can be shared and survives the back button.
 */
export function CatalogView({
  products,
  showCategoryFilter = false,
  autoFocusSearch = false,
}: {
  products: Product[];
  showCategoryFilter?: boolean;
  autoFocusSearch?: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const searchId = useId();
  const sortId = useId();
  const [filtersOpen, setFiltersOpen] = useState(false);

  const query = params.get("q") ?? "";
  const [draft, setDraft] = useState(query);
  const categories = listParam(params.get("category")) as Category[];
  const sizes = listParam(params.get("size"));
  const colors = listParam(params.get("color"));
  const inStock = params.get("stock") === "1";
  const onlyNew = params.get("new") === "1";
  const onlySale = params.get("sale") === "1";
  const sort = (SORTS.find((s) => s.value === params.get("sort"))?.value ?? "newest") as Sort;

  function update(changes: Record<string, string | null>) {
    const next = new URLSearchParams(params.toString());
    for (const [key, value] of Object.entries(changes)) {
      if (value === null || value === "") next.delete(key);
      else next.set(key, value);
    }
    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  function toggleIn(key: string, current: string[], value: string) {
    const next = current.includes(value) ? current.filter((v) => v !== value) : [...current, value];
    update({ [key]: next.join(",") || null });
  }

  // Search as you type, a short pause after the last keystroke.
  useEffect(() => {
    if (draft === query) return;
    const timer = window.setTimeout(() => update({ q: draft.trim() || null }), 250);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft]);

  const scoped = useMemo(
    () => (categories.length ? products.filter((p) => categories.includes(p.category)) : products),
    [products, categories],
  );

  const sizeOptions = useMemo(() => {
    const seen: string[] = [];
    for (const p of scoped) for (const v of p.variants) if (!seen.includes(v.size)) seen.push(v.size);
    return seen;
  }, [scoped]);

  const colorOptions = useMemo(() => {
    const seen = new Map<string, string>();
    for (const p of scoped) for (const v of p.variants) if (!seen.has(v.color)) seen.set(v.color, v.colorHex);
    return [...seen.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [scoped]);

  const results = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const filtered = scoped.filter((p) => {
      if (needle && !`${p.name} ${p.description} ${CATEGORY_LABEL[p.category]}`.toLowerCase().includes(needle)) {
        return false;
      }
      if (onlyNew && !p.isNew) return false;
      if (onlySale && !isOnSale(p)) return false;
      if (inStock && totalStock(p) === 0) return false;
      // Size, colour and stock are checked together: "M" + "Black" + in stock means that exact variant.
      if (sizes.length || colors.length) {
        const match = p.variants.some(
          (v) =>
            (!sizes.length || sizes.includes(v.size)) &&
            (!colors.length || colors.includes(v.color)) &&
            (!inStock || v.stock > 0),
        );
        if (!match) return false;
      }
      return true;
    });
    const sorted = [...filtered];
    if (sort === "price-asc") sorted.sort((a, b) => effectivePrice(a) - effectivePrice(b));
    else if (sort === "price-desc") sorted.sort((a, b) => effectivePrice(b) - effectivePrice(a));
    else if (sort === "name") sorted.sort((a, b) => a.name.localeCompare(b.name));
    else sorted.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return sorted;
  }, [scoped, query, onlyNew, onlySale, inStock, sizes, colors, sort]);

  const activeCount =
    categories.length + sizes.length + colors.length + Number(inStock) + Number(onlyNew) + Number(onlySale);
  const anyFilter = activeCount > 0 || query !== "";

  function clearAll() {
    setDraft("");
    router.replace(pathname, { scroll: false });
  }

  return (
    <div>
      {/* Toolbar */}
      <div className="flex flex-col gap-3 border-y border-border py-3 md:flex-row md:items-center md:justify-between">
        <div className="relative flex-1 md:max-w-sm">
          <label htmlFor={searchId} className="sr-only">
            Search products
          </label>
          <Icon name="search" size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            id={searchId}
            type="search"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="Search by name"
            autoComplete="off"
            autoFocus={autoFocusSearch}
            className="h-12 w-full border border-border bg-paper pl-10 pr-3 text-base placeholder:text-muted-foreground focus:border-foreground"
          />
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            aria-expanded={filtersOpen}
            aria-controls="catalog-filters"
            onClick={() => setFiltersOpen((v) => !v)}
            className="inline-flex h-12 items-center gap-2 border border-border px-4 text-sm font-semibold uppercase tracking-[0.12em] transition-colors hover:border-foreground"
          >
            <Icon name="filter" size={18} />
            Filters
            {activeCount > 0 && (
              <span className="tabular grid min-w-5 place-items-center rounded-full bg-primary px-1 text-[11px] leading-5 text-on-primary">
                {activeCount}
              </span>
            )}
          </button>
          <div className="relative">
            <label htmlFor={sortId} className="sr-only">
              Sort by
            </label>
            <select
              id={sortId}
              value={sort}
              onChange={(event) => update({ sort: event.target.value === "newest" ? null : event.target.value })}
              className="h-12 appearance-none border border-border bg-paper pl-4 pr-10 text-sm font-semibold transition-colors hover:border-foreground"
            >
              {SORTS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <Icon name="chevronDown" size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2" />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div id="catalog-filters" hidden={!filtersOpen} className="border-b border-border py-6">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {showCategoryFilter && (
            <fieldset>
              <legend className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Category</legend>
              <div className="mt-3 flex flex-wrap gap-2">
                {CATEGORIES.map((category) => (
                  <Chip
                    key={category}
                    pressed={categories.includes(category)}
                    onClick={() => toggleIn("category", categories, category)}
                  >
                    {CATEGORY_LABEL[category]}
                  </Chip>
                ))}
              </div>
            </fieldset>
          )}
          <fieldset>
            <legend className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Size</legend>
            <div className="mt-3 flex flex-wrap gap-2">
              {sizeOptions.map((size) => (
                <Chip key={size} pressed={sizes.includes(size)} onClick={() => toggleIn("size", sizes, size)}>
                  {size}
                </Chip>
              ))}
            </div>
          </fieldset>
          <fieldset>
            <legend className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Colour</legend>
            <div className="mt-3 flex flex-wrap gap-2">
              {colorOptions.map(([name, hex]) => (
                <Chip key={name} swatch={hex} pressed={colors.includes(name)} onClick={() => toggleIn("color", colors, name)}>
                  {name}
                </Chip>
              ))}
            </div>
          </fieldset>
          <fieldset>
            <legend className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Show only</legend>
            <div className="mt-3 flex flex-wrap gap-2">
              <Chip pressed={inStock} onClick={() => update({ stock: inStock ? null : "1" })}>
                In stock
              </Chip>
              <Chip pressed={onlyNew} onClick={() => update({ new: onlyNew ? null : "1" })}>
                New releases
              </Chip>
              <Chip pressed={onlySale} onClick={() => update({ sale: onlySale ? null : "1" })}>
                On sale
              </Chip>
            </div>
          </fieldset>
        </div>
      </div>

      <div className="flex min-h-12 items-center justify-between gap-4 py-3">
        <p role="status" aria-live="polite" className="tabular text-sm text-secondary">
          {results.length} {results.length === 1 ? "product" : "products"}
        </p>
        {anyFilter && (
          <button
            type="button"
            onClick={clearAll}
            className="min-h-11 text-sm font-semibold underline underline-offset-4"
          >
            Clear all
          </button>
        )}
      </div>

      {results.length > 0 ? (
        <ul className="grid grid-cols-2 gap-x-4 gap-y-10 pb-24 md:grid-cols-3 lg:grid-cols-4 lg:gap-x-6">
          {results.map((product, index) => (
            <li key={product.id}>
              <ProductCard
                product={product}
                shared
                priority={index < 4}
                sizes="(min-width: 1024px) 25vw, (min-width: 768px) 33vw, 50vw"
              />
            </li>
          ))}
        </ul>
      ) : (
        <div className="py-24 text-center">
          <p className="text-2xl font-extrabold uppercase tracking-tight">Nothing matches</p>
          <p className="mt-2 text-secondary">
            No products fit this search and these filters. Remove a filter or clear them all.
          </p>
          <button
            type="button"
            onClick={clearAll}
            className="mt-6 inline-flex h-12 items-center bg-primary px-6 text-sm font-semibold uppercase tracking-[0.14em] text-on-primary transition-opacity hover:opacity-85"
          >
            Clear all filters
          </button>
        </div>
      )}
    </div>
  );
}
