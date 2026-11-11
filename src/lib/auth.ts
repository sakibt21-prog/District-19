import "server-only";
import { redirect } from "next/navigation";
import { isSupabaseConfigured } from "./supabase/env";
import { createSessionClient } from "./supabase/server";

export interface AdminUser {
  id: string;
  email: string;
  role: "owner" | "admin";
}

/**
 * The signed-in administrator, or null. The user is verified with Supabase
 * (not just read from the cookie) and must have a row in admin_users.
 */
export async function getAdminUser(): Promise<AdminUser | null> {
  if (!isSupabaseConfigured()) return null;
  const db = await createSessionClient();
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user) return null;
  const { data } = await db
    .from("admin_users")
    .select("role")
    .eq("user_id", user.id)
    .maybeSingle<{ role: "owner" | "admin" }>();
  if (!data) return null;
  return { id: user.id, email: user.email ?? "", role: data.role };
}

/** For admin pages and every admin server action: sends anyone else to the login page. */
export async function requireAdmin(): Promise<AdminUser> {
  const admin = await getAdminUser();
  if (!admin) redirect("/admin/login");
  return admin;
}
