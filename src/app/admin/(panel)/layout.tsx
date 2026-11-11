import type { Metadata } from "next";
import { Suspense } from "react";
import { AdminNav } from "@/components/admin/AdminNav";
import { requireAdmin } from "@/lib/auth";

export const metadata: Metadata = {
  title: { default: "Admin", template: "%s — DISTRICT 19 Admin" },
  robots: { index: false, follow: false },
};

// The dashboard reads the session on every request, so it is never prerendered.
export const instant = false;

async function Panel({ children }: { children: React.ReactNode }) {
  // Verified on the server for every admin request. Each page and each action checks again.
  const admin = await requireAdmin();
  return (
    <div className="min-h-svh bg-background">
      <AdminNav email={admin.email} />
      <main id="main" className="mx-auto max-w-[1280px] px-4 py-8 md:px-8 md:py-10">
        {children}
      </main>
    </div>
  );
}

export default function AdminPanelLayout({ children }: LayoutProps<"/admin">) {
  return (
    <Suspense fallback={<p className="p-8 text-sm text-muted-foreground">Checking your sign-in…</p>}>
      <Panel>{children}</Panel>
    </Suspense>
  );
}
