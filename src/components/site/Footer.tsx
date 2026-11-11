import Link from "next/link";

const COLUMNS = [
  {
    title: "Shop",
    links: [
      { href: "/shirts", label: "Shirts" },
      { href: "/pants", label: "Pants" },
      { href: "/shoes", label: "Shoes" },
      { href: "/search", label: "Search" },
    ],
  },
  {
    title: "Help",
    links: [
      { href: "/help#delivery", label: "Delivery" },
      { href: "/help#payment", label: "Payment" },
      { href: "/help#returns", label: "Returns" },
      { href: "/help#sizing", label: "Size guide" },
    ],
  },
];

export function Footer() {
  return (
    <footer className="border-t border-border bg-primary text-on-primary">
      <div className="mx-auto max-w-[1440px] px-4 py-16 md:px-8 md:py-24">
        <div className="grid gap-12 md:grid-cols-[2fr_1fr_1fr]">
          <div>
            <p className="max-w-md text-lg leading-relaxed text-stone-300">
              Shirts, pants and shoes released in small runs. Designed in Dhaka,
              delivered across Bangladesh.
            </p>
            <p className="mt-6 text-sm text-stone-400">
              Cash on Delivery, bKash and Nagad accepted.
            </p>
          </div>
          {COLUMNS.map((column) => (
            <nav key={column.title} aria-label={column.title}>
              <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-400">
                {column.title}
              </h2>
              <ul className="mt-4 space-y-1">
                {column.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="inline-block py-1.5 text-base transition-opacity hover:opacity-60"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        <p
          aria-hidden="true"
          className="mt-16 select-none whitespace-nowrap font-display text-[8.4vw] font-extrabold uppercase leading-[0.9] tracking-tighter md:mt-24 md:text-[8.9vw]"
        >
          DISTRICT 19
        </p>

        <div className="mt-8 flex flex-col gap-2 border-t border-stone-700 pt-6 text-sm text-stone-400 md:flex-row md:justify-between">
          <p>© 2026 DISTRICT 19. All rights reserved.</p>
          <p>Prices in Bangladeshi taka, VAT included.</p>
        </div>
      </div>
    </footer>
  );
}
