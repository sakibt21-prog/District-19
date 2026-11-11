"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "@/app/admin/actions";
import { Icon } from "@/components/site/Icon";

const LINKS = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/products", label: "Products" },
  { href: "/admin/looks", label: "Looks" },
  { href: "/admin/orders", label: "Orders" },
  { href: "/admin/settings", label: "Settings" },
];

export function AdminNav({ email }: { email: string }) {
  const pathname = usePathname();
  const isActive = (href: string) => (href === "/admin" ? pathname === href : pathname.startsWith(href));

  return (
    <header className="border-b border-border bg-paper">
      <div className="mx-auto flex max-w-[1280px] flex-wrap items-center justify-between gap-x-6 gap-y-2 px-4 py-3 md:px-8">
        <div className="flex items-baseline gap-3">
          <Link href="/admin" className="font-display text-lg font-extrabold uppercase tracking-tight">
            DISTRICT 19
          </Link>
          <span className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Admin</span>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <span className="hidden text-secondary sm:inline">{email}</span>
          <Link href="/" className="inline-flex min-h-11 items-center gap-1 underline underline-offset-4">
            View shop
            <Icon name="arrowUpRight" size={14} />
          </Link>
          <form action={signOut}>
            <button
              type="submit"
              className="inline-flex min-h-11 items-center gap-2 border border-border px-3 font-semibold transition-colors hover:border-foreground"
            >
              <Icon name="logout" size={16} />
              Sign out
            </button>
          </form>
        </div>
      </div>
      <nav aria-label="Admin" className="mx-auto max-w-[1280px] overflow-x-auto px-4 md:px-8">
        <ul className="flex gap-1">
          {LINKS.map((link) => (
            <li key={link.href}>
              <Link
                href={link.href}
                aria-current={isActive(link.href) ? "page" : undefined}
                className={`inline-flex min-h-11 items-center border-b-2 px-3 text-sm font-semibold transition-colors ${
                  isActive(link.href)
                    ? "border-foreground text-foreground"
                    : "border-transparent text-secondary hover:text-foreground"
                }`}
              >
                {link.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </header>
  );
}
