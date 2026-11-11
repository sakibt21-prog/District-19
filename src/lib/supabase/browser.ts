"use client";

import { createBrowserClient } from "@supabase/ssr";
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "./env";

let client: ReturnType<typeof createBrowserClient> | null = null;

/**
 * Browser client carrying the signed-in admin's session. The admin forms use
 * it to upload photos straight to storage; the storage policies only accept
 * uploads from administrators.
 */
export function getBrowserClient() {
  client ??= createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  return client;
}
