import type { Metadata } from "next";
import Link from "next/link";
import { LoginForm } from "@/components/admin/LoginForm";
import { Notice } from "@/components/admin/ui";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export const metadata: Metadata = {
  title: "Admin sign in — DISTRICT 19",
  robots: { index: false, follow: false },
};

export default function AdminLoginPage() {
  const configured = isSupabaseConfigured();
  return (
    <main className="grid min-h-svh place-items-center bg-background px-4 py-12">
      <div className="w-full max-w-sm">
        <p className="font-display text-2xl font-extrabold uppercase tracking-tight">DISTRICT 19</p>
        <h1 className="mt-6 text-2xl font-extrabold tracking-tight">Admin sign in</h1>
        <p className="mt-1 text-secondary">For shop administrators only.</p>

        <div className="mt-6">
          {configured ? (
            <LoginForm />
          ) : (
            <Notice>
              <p className="font-semibold text-foreground">The shop is not connected to Supabase yet.</p>
              <p className="mt-1">
                Add the project URL and keys to <code>.env.local</code>, run the migration, and create
                the first administrator. The steps are in <code>README.md</code>.
              </p>
            </Notice>
          )}
        </div>

        <p className="mt-8 text-sm">
          <Link href="/" className="underline underline-offset-4">
            Back to the shop
          </Link>
        </p>
      </div>
    </main>
  );
}
