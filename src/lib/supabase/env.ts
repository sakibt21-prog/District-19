/* Values that are safe on both server and browser. The service-role key is never read here. */

export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

export const IMAGE_BUCKET = "product-images";
export const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
export const IMAGE_TYPES = ["image/png", "image/webp", "image/jpeg", "image/avif"];

/** False until the Supabase project URL and anon key are set in .env.local. */
export function isSupabaseConfigured(): boolean {
  return Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
}

/** Public URL of a file in the product-images bucket. */
export function publicImageUrl(storagePath: string): string {
  const safe = storagePath.split("/").map(encodeURIComponent).join("/");
  return `${SUPABASE_URL}/storage/v1/object/public/${IMAGE_BUCKET}/${safe}`;
}
