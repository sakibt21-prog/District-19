import { cacheLife, cacheTag } from "next/cache";
import { DEMO_LOOKS, DEMO_PRODUCTS } from "./demo-data";
import { PRODUCT_SELECT, toProduct, type ProductRow } from "./rows";
import { isSupabaseConfigured, publicImageUrl } from "./supabase/env";
import { createPublicClient } from "./supabase/server";
import type { Category, Look, Product } from "./types";

/*
  Read side of the catalogue. Every public page gets its products from here.

  With Supabase configured it reads published products from the database.
  Without it, it serves the built-in sample catalogue so the shop can be seen.

  Results are cached and tagged; the admin actions clear the tag after a
  product is created, edited, published or deleted, so a newly published
  product shows up on the shop straight away.
*/

export const CATALOG_TAG = "catalog";
export const SETTINGS_TAG = "settings";

/** True when the shop is still showing the built-in sample catalogue. */
export function isDemoCatalog(): boolean {
  return !isSupabaseConfigured();
}

export async function getProducts(): Promise<Product[]> {
  "use cache";
  cacheLife("minutes");
  cacheTag(CATALOG_TAG);

  if (!isSupabaseConfigured()) return DEMO_PRODUCTS;

  const db = createPublicClient();
  const [products, best] = await Promise.all([
    db
      .from("products")
      .select(PRODUCT_SELECT)
      .eq("status", "published")
      .order("created_at", { ascending: false })
      .returns<ProductRow[]>(),
    db.rpc("best_seller_ids", { p_limit: 8 }),
  ]);
  if (products.error) {
    // Most often: the migration has not been run yet. Show an empty shop rather than crash.
    console.error("Could not load products:", products.error.message);
    return [];
  }
  const bestIds = new Set<string>(Array.isArray(best.data) ? (best.data as string[]) : []);
  return products.data.map((row) => toProduct(row, bestIds));
}

interface LookRow {
  id: string;
  name: string;
  model_image_path: string | null;
  look_items: { product_id: string; sort_order: number }[];
}

export async function getLooks(): Promise<Look[]> {
  "use cache";
  cacheLife("minutes");
  cacheTag(CATALOG_TAG);

  if (!isSupabaseConfigured()) return DEMO_LOOKS;

  const db = createPublicClient();
  const [looks, products] = await Promise.all([
    db
      .from("looks")
      .select("id, name, model_image_path, look_items(product_id, sort_order)")
      .eq("is_published", true)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true })
      .returns<LookRow[]>(),
    getProducts(),
  ]);
  if (looks.error) {
    console.error("Could not load looks:", looks.error.message);
    return [];
  }
  const byId = new Map(products.map((p) => [p.id, p]));
  return looks.data
    .map((look) => ({
      id: look.id,
      name: look.name,
      modelImageUrl: look.model_image_path ? publicImageUrl(look.model_image_path) : null,
      items: [...look.look_items]
        .sort((a, b) => a.sort_order - b.sort_order)
        .map((item) => byId.get(item.product_id))
        .filter((p): p is Product => Boolean(p)),
    }))
    .filter((look) => look.items.length > 0);
}

export interface ShopSettings {
  insideDhakaFee: number;
  outsideDhakaFee: number;
  bkashNumber: string;
  nagadNumber: string;
}

export const DEFAULT_SETTINGS: ShopSettings = {
  insideDhakaFee: 70,
  outsideDhakaFee: 130,
  bkashNumber: "",
  nagadNumber: "",
};

export async function getShopSettings(): Promise<ShopSettings> {
  "use cache";
  cacheLife("minutes");
  cacheTag(SETTINGS_TAG);

  if (!isSupabaseConfigured()) return DEFAULT_SETTINGS;
  const { data, error } = await createPublicClient()
    .from("shop_settings")
    .select("inside_dhaka_fee, outside_dhaka_fee, bkash_number, nagad_number")
    .maybeSingle<{
      inside_dhaka_fee: number;
      outside_dhaka_fee: number;
      bkash_number: string;
      nagad_number: string;
    }>();
  if (error || !data) return DEFAULT_SETTINGS;
  return {
    insideDhakaFee: data.inside_dhaka_fee,
    outsideDhakaFee: data.outside_dhaka_fee,
    bkashNumber: data.bkash_number,
    nagadNumber: data.nagad_number,
  };
}

export async function getProductsByCategory(category: Category): Promise<Product[]> {
  const all = await getProducts();
  return all.filter((p) => p.category === category);
}

export async function getProductBySlug(slug: string): Promise<Product | null> {
  const all = await getProducts();
  return all.find((p) => p.slug === slug) ?? null;
}

export async function getRelatedProducts(product: Product, limit = 4): Promise<Product[]> {
  const all = await getProducts();
  const sameCategory = all.filter(
    (p) => p.category === product.category && p.id !== product.id,
  );
  const others = all.filter((p) => p.category !== product.category && p.isFeatured);
  return [...sameCategory, ...others].slice(0, limit);
}

export function newestFirst(products: Product[]): Product[] {
  return [...products].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
