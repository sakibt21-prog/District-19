"use server";

import { updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { getAdminUser, requireAdmin } from "@/lib/auth";
import { CATALOG_TAG, SETTINGS_TAG } from "@/lib/catalog";
import { slugify } from "@/lib/format";
import { IMAGE_BUCKET, isSupabaseConfigured } from "@/lib/supabase/env";
import { createSessionClient } from "@/lib/supabase/server";
import type { Category, ImageRole } from "@/lib/types";

/*
  Every action here starts with requireAdmin(): the caller must be signed in
  and listed in admin_users. Server actions are public endpoints, so this check
  is what protects them, not the fact that the buttons live under /admin.
  Row-level security in the database enforces the same rule a second time.
*/

export interface ActionResult {
  ok: boolean;
  error?: string;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const HEX = /^#[0-9a-fA-F]{6}$/;
const CATEGORIES: Category[] = ["shirt", "pant", "shoe"];
const ROLES: ImageRole[] = ["front", "back", "gallery"];

const isInt = (value: unknown, min: number, max: number): value is number =>
  typeof value === "number" && Number.isInteger(value) && value >= min && value <= max;

/* ------------------------------------------------------------------ */
/* Session                                                             */
/* ------------------------------------------------------------------ */

export async function signIn(_previous: ActionResult | null, formData: FormData): Promise<ActionResult> {
  if (!isSupabaseConfigured()) {
    return { ok: false, error: "The shop is not connected to Supabase yet." };
  }
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  if (!email || !password) {
    return { ok: false, error: "Enter your email and password." };
  }

  const db = await createSessionClient();
  const { error } = await db.auth.signInWithPassword({ email, password });
  if (error) {
    // One message for every failure, so the form does not reveal which emails exist.
    return { ok: false, error: "Email or password is incorrect." };
  }
  if (!(await getAdminUser())) {
    await db.auth.signOut();
    return { ok: false, error: "This account is not an administrator." };
  }
  redirect("/admin");
}

export async function signOut(): Promise<void> {
  const db = await createSessionClient();
  await db.auth.signOut();
  redirect("/admin/login");
}

/* ------------------------------------------------------------------ */
/* Products                                                            */
/* ------------------------------------------------------------------ */

export interface ProductInput {
  id: string;
  name: string;
  category: Category;
  description: string;
  price: number;
  salePrice: number | null;
  status: "draft" | "published";
  isFeatured: boolean;
  isNew: boolean;
  cut: string;
  variants: { size: string; color: string; colorHex: string; stock: number }[];
  images: { id: string; storagePath: string; role: ImageRole; isPrimary: boolean }[];
}

function validateProduct(input: ProductInput): string | null {
  if (!input || typeof input !== "object") return "The form could not be read.";
  if (!UUID.test(input.id ?? "")) return "The product id is not valid.";
  const name = typeof input.name === "string" ? input.name.trim() : "";
  if (name.length < 1 || name.length > 120) return "Give the product a name of up to 120 characters.";
  if (!CATEGORIES.includes(input.category)) return "Choose a category.";
  if (typeof input.description !== "string" || input.description.length > 4000) {
    return "The description can be up to 4,000 characters.";
  }
  if (!isInt(input.price, 0, 10_000_000)) return "Enter the price as a whole number of taka.";
  if (input.salePrice !== null) {
    if (!isInt(input.salePrice, 0, 10_000_000)) return "Enter the discounted price as a whole number of taka.";
    if (input.salePrice >= input.price) return "The discounted price must be lower than the price.";
  }
  if (input.status !== "draft" && input.status !== "published") return "Choose Draft or Published.";
  if (typeof input.cut !== "string" || input.cut.length > 40) return "The placeholder shape is not valid.";

  if (!Array.isArray(input.variants) || input.variants.length === 0) {
    return "Add at least one size and one colour.";
  }
  if (input.variants.length > 400) return "Too many size and colour combinations.";
  const seen = new Set<string>();
  for (const v of input.variants) {
    const size = typeof v.size === "string" ? v.size.trim() : "";
    const color = typeof v.color === "string" ? v.color.trim() : "";
    if (size.length < 1 || size.length > 12) return "Each size needs a label of up to 12 characters.";
    if (color.length < 1 || color.length > 40) return "Each colour needs a name of up to 40 characters.";
    if (!HEX.test(v.colorHex ?? "")) return `Pick a swatch colour for ${color}.`;
    if (!isInt(v.stock, 0, 100_000)) return `Enter stock for ${color}, size ${size} as a whole number.`;
    const key = `${size}|${color}`.toLowerCase();
    if (seen.has(key)) return `${color}, size ${size} is listed twice.`;
    seen.add(key);
  }

  if (!Array.isArray(input.images)) return "The photos could not be read.";
  if (input.images.length > 12) return "A product can have up to 12 photos.";
  for (const image of input.images) {
    if (!UUID.test(image.id ?? "")) return "A photo id is not valid.";
    // Photos must live in this product's own folder; nothing else can be attached.
    if (typeof image.storagePath !== "string" || !image.storagePath.startsWith(`products/${input.id}/`)) {
      return "A photo is stored in the wrong place. Remove it and upload it again.";
    }
    if (image.storagePath.includes("..")) return "A photo path is not valid.";
    if (!ROLES.includes(image.role)) return "Choose Front, Back or Gallery for each photo.";
  }
  return null;
}

export async function saveProduct(input: ProductInput): Promise<ActionResult> {
  await requireAdmin();
  const problem = validateProduct(input);
  if (problem) return { ok: false, error: problem };

  const db = await createSessionClient();
  const { data: existing, error: lookupError } = await db
    .from("products")
    .select("id, slug")
    .eq("id", input.id)
    .maybeSingle<{ id: string; slug: string }>();
  if (lookupError) return { ok: false, error: lookupError.message };

  // The web address is set once, when the product is created, so links never break on rename.
  let slug = existing?.slug;
  if (!slug) {
    const base = slugify(input.name) || "product";
    const { data: taken } = await db.from("products").select("slug").like("slug", `${base}%`).returns<{ slug: string }[]>();
    const used = new Set((taken ?? []).map((row) => row.slug));
    slug = base;
    for (let n = 2; used.has(slug); n++) slug = `${base}-${n}`;
  }

  const { error: productError } = await db.from("products").upsert({
    id: input.id,
    slug,
    name: input.name.trim(),
    category: input.category,
    description: input.description.trim(),
    price: input.price,
    sale_price: input.salePrice,
    status: input.status,
    is_featured: input.isFeatured,
    is_new: input.isNew,
    cut: input.cut,
  });
  if (productError) return { ok: false, error: productError.message };

  /* Variants: update the ones that stay (keeping their ids, which past orders point to), remove the rest. */
  const wanted = input.variants.map((v) => ({
    product_id: input.id,
    size: v.size.trim(),
    color: v.color.trim(),
    color_hex: v.colorHex,
    stock_quantity: v.stock,
  }));
  const { error: variantError } = await db
    .from("product_variants")
    .upsert(wanted, { onConflict: "product_id,size,color" });
  if (variantError) return { ok: false, error: variantError.message };

  const { data: allVariants } = await db
    .from("product_variants")
    .select("id, size, color")
    .eq("product_id", input.id)
    .returns<{ id: string; size: string; color: string }[]>();
  const keep = new Set(wanted.map((v) => `${v.size}|${v.color}`));
  const stale = (allVariants ?? []).filter((v) => !keep.has(`${v.size}|${v.color}`)).map((v) => v.id);
  if (stale.length) {
    const { error } = await db.from("product_variants").delete().in("id", stale);
    if (error) return { ok: false, error: error.message };
  }

  /* Photos: drop removed ones (row and file), then write order, role and primary for the rest. */
  const { data: currentImages } = await db
    .from("product_images")
    .select("id, storage_path")
    .eq("product_id", input.id)
    .returns<{ id: string; storage_path: string }[]>();
  const keptIds = new Set(input.images.map((i) => i.id));
  const removed = (currentImages ?? []).filter((i) => !keptIds.has(i.id));
  if (removed.length) {
    const { error } = await db.from("product_images").delete().in("id", removed.map((i) => i.id));
    if (error) return { ok: false, error: error.message };
    await db.storage.from(IMAGE_BUCKET).remove(removed.map((i) => i.storage_path));
  }
  if (input.images.length) {
    // Exactly one primary photo: the one marked, or the first.
    const primaryIndex = Math.max(0, input.images.findIndex((i) => i.isPrimary));
    // Clear the old primary first so the one-primary-per-product rule is never broken mid-save.
    await db.from("product_images").update({ is_primary: false }).eq("product_id", input.id);
    const { error } = await db.from("product_images").upsert(
      input.images.map((image, index) => ({
        id: image.id,
        product_id: input.id,
        storage_path: image.storagePath,
        role: image.role,
        is_primary: index === primaryIndex,
        sort_order: index,
      })),
    );
    if (error) return { ok: false, error: error.message };
  }

  updateTag(CATALOG_TAG);
  return { ok: true };
}

export async function deleteProduct(id: string): Promise<void> {
  await requireAdmin();
  if (!UUID.test(id)) return;
  const db = await createSessionClient();
  const { data: images } = await db
    .from("product_images")
    .select("storage_path")
    .eq("product_id", id)
    .returns<{ storage_path: string }[]>();
  const { error } = await db.from("products").delete().eq("id", id);
  if (error) throw new Error(`Could not delete the product: ${error.message}`);
  if (images?.length) {
    await db.storage.from(IMAGE_BUCKET).remove(images.map((i) => i.storage_path));
  }
  updateTag(CATALOG_TAG);
}

export async function setProductStatus(id: string, status: "draft" | "published"): Promise<void> {
  await requireAdmin();
  if (!UUID.test(id) || (status !== "draft" && status !== "published")) return;
  const db = await createSessionClient();
  const { error } = await db.from("products").update({ status }).eq("id", id);
  if (error) throw new Error(`Could not change the status: ${error.message}`);
  updateTag(CATALOG_TAG);
}

export async function setProductFeatured(id: string, isFeatured: boolean): Promise<void> {
  await requireAdmin();
  if (!UUID.test(id)) return;
  const db = await createSessionClient();
  const { error } = await db.from("products").update({ is_featured: Boolean(isFeatured) }).eq("id", id);
  if (error) throw new Error(`Could not change the featured flag: ${error.message}`);
  updateTag(CATALOG_TAG);
}

/* ------------------------------------------------------------------ */
/* Looks                                                               */
/* ------------------------------------------------------------------ */

export interface LookInput {
  id: string;
  name: string;
  modelImagePath: string | null;
  isPublished: boolean;
  sortOrder: number;
  productIds: string[];
}

export async function saveLook(input: LookInput): Promise<ActionResult> {
  await requireAdmin();
  if (!input || !UUID.test(input.id ?? "")) return { ok: false, error: "The look id is not valid." };
  const name = typeof input.name === "string" ? input.name.trim() : "";
  if (name.length < 1 || name.length > 60) return { ok: false, error: "Give the look a name of up to 60 characters." };
  if (!isInt(input.sortOrder, 0, 10_000)) return { ok: false, error: "The position must be a whole number." };
  if (!Array.isArray(input.productIds) || input.productIds.length === 0) {
    return { ok: false, error: "Choose at least one product for the look." };
  }
  if (input.productIds.length > 8 || input.productIds.some((id) => !UUID.test(id))) {
    return { ok: false, error: "A look can hold up to 8 products." };
  }
  if (input.modelImagePath !== null) {
    if (
      typeof input.modelImagePath !== "string" ||
      !input.modelImagePath.startsWith(`looks/${input.id}/`) ||
      input.modelImagePath.includes("..")
    ) {
      return { ok: false, error: "The model photo is stored in the wrong place. Upload it again." };
    }
  }

  const db = await createSessionClient();
  const { data: previous } = await db
    .from("looks")
    .select("model_image_path")
    .eq("id", input.id)
    .maybeSingle<{ model_image_path: string | null }>();

  const { error } = await db.from("looks").upsert({
    id: input.id,
    name,
    model_image_path: input.modelImagePath,
    is_published: Boolean(input.isPublished),
    sort_order: input.sortOrder,
  });
  if (error) return { ok: false, error: error.message };

  const { error: clearError } = await db.from("look_items").delete().eq("look_id", input.id);
  if (clearError) return { ok: false, error: clearError.message };
  const { error: itemsError } = await db
    .from("look_items")
    .insert(input.productIds.map((productId, index) => ({ look_id: input.id, product_id: productId, sort_order: index })));
  if (itemsError) return { ok: false, error: itemsError.message };

  // A replaced model photo is deleted from storage.
  if (previous?.model_image_path && previous.model_image_path !== input.modelImagePath) {
    await db.storage.from(IMAGE_BUCKET).remove([previous.model_image_path]);
  }
  updateTag(CATALOG_TAG);
  return { ok: true };
}

export async function deleteLook(id: string): Promise<void> {
  await requireAdmin();
  if (!UUID.test(id)) return;
  const db = await createSessionClient();
  const { data: look } = await db
    .from("looks")
    .select("model_image_path")
    .eq("id", id)
    .maybeSingle<{ model_image_path: string | null }>();
  const { error } = await db.from("looks").delete().eq("id", id);
  if (error) throw new Error(`Could not delete the look: ${error.message}`);
  if (look?.model_image_path) await db.storage.from(IMAGE_BUCKET).remove([look.model_image_path]);
  updateTag(CATALOG_TAG);
}

/* ------------------------------------------------------------------ */
/* Orders                                                              */
/* ------------------------------------------------------------------ */

const ORDER_STATUSES = ["new", "confirmed", "packed", "shipped", "delivered", "cancelled"];
const PAYMENT_STATUSES = ["unpaid", "pending_verification", "paid", "refunded"];

export async function updateOrder(id: string, formData: FormData): Promise<void> {
  await requireAdmin();
  if (!UUID.test(id)) return;
  const status = String(formData.get("status") ?? "");
  const paymentStatus = String(formData.get("payment_status") ?? "");
  if (!ORDER_STATUSES.includes(status) || !PAYMENT_STATUSES.includes(paymentStatus)) return;

  const db = await createSessionClient();
  const { data: current } = await db.from("orders").select("status").eq("id", id).maybeSingle<{ status: string }>();
  if (!current) return;
  // A cancelled order has had its stock returned; it stays cancelled.
  if (current.status === "cancelled") {
    const { error } = await db.from("orders").update({ payment_status: paymentStatus }).eq("id", id);
    if (error) throw new Error(`Could not update the order: ${error.message}`);
    return;
  }

  if (status === "cancelled") {
    // Cancelling goes through the database function, which also puts the stock back.
    const { error } = await db.rpc("cancel_order", { p_order_id: id });
    if (error) throw new Error(`Could not cancel the order: ${error.message}`);
    const { error: payError } = await db.from("orders").update({ payment_status: paymentStatus }).eq("id", id);
    if (payError) throw new Error(`Could not update the payment status: ${payError.message}`);
    updateTag(CATALOG_TAG);
    return;
  }

  const { error } = await db.from("orders").update({ status, payment_status: paymentStatus }).eq("id", id);
  if (error) throw new Error(`Could not update the order: ${error.message}`);
}

/* ------------------------------------------------------------------ */
/* Settings                                                            */
/* ------------------------------------------------------------------ */

const PHONE = /^01[3-9]\d{8}$/;

export async function saveSettings(_previous: ActionResult | null, formData: FormData): Promise<ActionResult> {
  await requireAdmin();
  const inside = Number(formData.get("inside_dhaka_fee"));
  const outside = Number(formData.get("outside_dhaka_fee"));
  const bkash = String(formData.get("bkash_number") ?? "").replace(/[\s-]/g, "");
  const nagad = String(formData.get("nagad_number") ?? "").replace(/[\s-]/g, "");
  if (!isInt(inside, 0, 5000) || !isInt(outside, 0, 5000)) {
    return { ok: false, error: "Enter each delivery fee as a whole number of taka between 0 and 5,000." };
  }
  if (bkash && !PHONE.test(bkash)) return { ok: false, error: "The bKash number should be 11 digits, like 01712345678." };
  if (nagad && !PHONE.test(nagad)) return { ok: false, error: "The Nagad number should be 11 digits, like 01712345678." };

  const db = await createSessionClient();
  const { error } = await db
    .from("shop_settings")
    .update({ inside_dhaka_fee: inside, outside_dhaka_fee: outside, bkash_number: bkash, nagad_number: nagad })
    .eq("id", true);
  if (error) return { ok: false, error: error.message };
  updateTag(SETTINGS_TAG);
  return { ok: true };
}
