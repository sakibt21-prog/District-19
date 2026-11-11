import { publicImageUrl } from "./supabase/env";
import type { Category, ImageRole, Product, ProductVariant } from "./types";

/* Shapes of the rows returned by Supabase, and their conversion to the app's types. */

export const PRODUCT_SELECT =
  "id, slug, name, category, description, price, sale_price, status, is_featured, is_new, cut, created_at, " +
  "product_images(id, storage_path, role, is_primary, sort_order), " +
  "product_variants(id, size, color, color_hex, stock_quantity)";

export interface ImageRow {
  id: string;
  storage_path: string;
  role: ImageRole;
  is_primary: boolean;
  sort_order: number;
}

export interface VariantRow {
  id: string;
  size: string;
  color: string;
  color_hex: string;
  stock_quantity: number;
}

export interface ProductRow {
  id: string;
  slug: string;
  name: string;
  category: Category;
  description: string;
  price: number;
  sale_price: number | null;
  status: "draft" | "published";
  is_featured: boolean;
  is_new: boolean;
  cut: string;
  created_at: string;
  product_images: ImageRow[];
  product_variants: VariantRow[];
}

const LETTER_SIZES = ["XXS", "XS", "S", "M", "L", "XL", "XXL", "3XL"];

/** Orders sizes the way a shopper expects: S before M before L, 28 before 30. */
export function compareSizes(a: string, b: string): number {
  const na = Number(a);
  const nb = Number(b);
  if (!Number.isNaN(na) && !Number.isNaN(nb)) return na - nb;
  const ia = LETTER_SIZES.indexOf(a.toUpperCase());
  const ib = LETTER_SIZES.indexOf(b.toUpperCase());
  if (ia !== -1 && ib !== -1) return ia - ib;
  return a.localeCompare(b);
}

export function toVariants(rows: VariantRow[]): ProductVariant[] {
  // Keep colours in the order they were first entered, sizes in size order within each.
  const colorOrder: string[] = [];
  for (const row of rows) if (!colorOrder.includes(row.color)) colorOrder.push(row.color);
  return [...rows]
    .sort(
      (a, b) =>
        colorOrder.indexOf(a.color) - colorOrder.indexOf(b.color) || compareSizes(a.size, b.size),
    )
    .map((row) => ({
      id: row.id,
      size: row.size,
      color: row.color,
      colorHex: row.color_hex,
      stock: row.stock_quantity,
    }));
}

export function toProduct(row: ProductRow, bestSellerIds: ReadonlySet<string> = new Set()): Product {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    category: row.category,
    description: row.description,
    price: row.price,
    salePrice: row.sale_price,
    isFeatured: row.is_featured,
    isNew: row.is_new,
    isBestSeller: bestSellerIds.has(row.id),
    cut: row.cut,
    images: [...(row.product_images ?? [])]
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((image) => ({
        id: image.id,
        url: publicImageUrl(image.storage_path),
        role: image.role,
        isPrimary: image.is_primary,
        sortOrder: image.sort_order,
      })),
    variants: toVariants(row.product_variants ?? []),
    createdAt: row.created_at,
  };
}
