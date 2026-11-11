"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useCart } from "@/components/cart/CartProvider";
import { Icon } from "./Icon";

const NAV = [
  { href: "/shirts", label: "Shirts" },
  { href: "/pants", label: "Pants" },
  { href: "/shoes", label: "Shoes" },
];

function subscribeToScroll(onChange: () => void) {
  window.addEventListener("scroll", onChange, { passive: true });
  return () => window.removeEventListener("scroll", onChange);
}

export function Header() {
  const pathname = usePathname();
  const { count, ready } = useCart();
  const reduce = useReducedMotion();
  const scrolled = useSyncExternalStore(
    subscribeToScroll,
    () => window.scrollY > 12,
    () => false,
  );
  // The menu is tied to the page it was opened on, so any navigation closes it.
  const [openPath, setOpenPath] = useState<string | null>(null);
  const open = openPath === pathname;
  const setOpen = (next: boolean) => setOpenPath(next ? pathname : null);
  const menuButton = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpenPath(null);
        menuButton.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  // Over the home hero the bar is clear; everywhere else, and after scrolling, it is solid.
  const solid = scrolled || open || pathname !== "/";

  return (
    <header
      className={`fixed inset-x-0 top-0 z-40 h-(--header-h) transition-colors duration-300 ${
        solid ? "border-b border-border bg-paper" : "border-b border-transparent bg-transparent"
      }`}
    >
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-3 focus:z-50 focus:bg-primary focus:px-4 focus:py-2 focus:text-on-primary"
      >
        Skip to content
      </a>

      <div className="mx-auto flex h-full max-w-[1440px] items-center justify-between px-4 md:px-8">
        <Link
          href="/"
          className="font-display text-lg font-extrabold uppercase tracking-tight md:text-xl"
        >
          DISTRICT 19
        </Link>

        <nav aria-label="Main" className="absolute left-1/2 hidden -translate-x-1/2 md:block">
          <ul className="flex items-center gap-8">
            {NAV.map((item) => {
              const active = pathname === item.href;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className="group relative py-2 text-sm font-medium uppercase tracking-[0.14em]"
                  >
                    {item.label}
                    <span
                      className={`absolute inset-x-0 -bottom-0.5 h-px origin-left bg-foreground transition-transform duration-300 ease-out-expo ${
                        active ? "scale-x-100" : "scale-x-0 group-hover:scale-x-100"
                      }`}
                    />
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="flex items-center gap-1">
          <Link
            href="/search"
            aria-label="Search"
            className="grid size-11 place-items-center transition-opacity hover:opacity-60"
          >
            <Icon name="search" />
          </Link>
          <Link
            href="/cart"
            aria-label={ready && count > 0 ? `Cart, ${count} items` : "Cart"}
            className="relative grid size-11 place-items-center transition-opacity hover:opacity-60"
          >
            <Icon name="bag" />
            {ready && count > 0 && (
              <span className="tabular absolute right-1 top-1.5 grid min-w-4.5 place-items-center rounded-full bg-primary px-1 text-[11px] font-semibold leading-[18px] text-on-primary">
                {count}
              </span>
            )}
          </Link>
          <button
            ref={menuButton}
            type="button"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            aria-controls="mobile-menu"
            onClick={() => setOpen(!open)}
            className="grid size-11 place-items-center md:hidden"
          >
            <Icon name={open ? "close" : "menu"} />
          </button>
        </div>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            id="mobile-menu"
            role="dialog"
            aria-modal="true"
            aria-label="Menu"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduce ? 0.15 : 0.25 }}
            className="fixed inset-x-0 bottom-0 top-(--header-h) bg-paper md:hidden"
          >
            <nav aria-label="Mobile" className="flex h-full flex-col justify-between px-4 pb-10 pt-8">
              <ul className="space-y-1">
                {[...NAV, { href: "/search", label: "Search" }, { href: "/cart", label: "Cart" }].map(
                  (item, index) => (
                    <motion.li
                      key={item.href}
                      initial={reduce ? false : { opacity: 0, y: 24 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{
                        delay: 0.05 + index * 0.04,
                        duration: 0.5,
                        ease: [0.16, 1, 0.3, 1],
                      }}
                    >
                      <Link
                        href={item.href}
                        onClick={() => setOpen(false)}
                        className="block py-2 font-display text-5xl font-extrabold uppercase tracking-tight"
                      >
                        {item.label}
                      </Link>
                    </motion.li>
                  ),
                )}
              </ul>
              <p className="text-sm text-muted-foreground">
                Shirts, pants and shoes. Delivered across Bangladesh.
              </p>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
