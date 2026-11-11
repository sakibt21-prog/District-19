import type { Metadata } from "next";
import { SizeTable } from "@/components/product/SizeGuide";
import { CATEGORIES, CATEGORY_LABEL } from "@/lib/types";

export const metadata: Metadata = {
  title: "Help",
  description: "Delivery, payment, returns and size guides for DISTRICT 19 orders in Bangladesh.",
};

function Topic({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section
      id={id}
      aria-labelledby={`${id}-title`}
      className="grid scroll-mt-24 gap-4 border-t border-border py-10 md:grid-cols-[1fr_2fr] md:gap-10 md:py-14"
    >
      <h2 id={`${id}-title`} className="text-2xl font-extrabold uppercase tracking-tight md:text-3xl">
        {title}
      </h2>
      <div className="min-w-0 max-w-[65ch] space-y-4 text-base leading-relaxed text-secondary">
        {children}
      </div>
    </section>
  );
}

export default function HelpPage() {
  return (
    <div className="mx-auto max-w-[1100px] px-4 pb-24 pt-[calc(var(--header-h)+2.5rem)] md:px-8 md:pt-[calc(var(--header-h)+4rem)]">
      <h1 className="pb-10 font-display text-6xl font-extrabold uppercase leading-[0.9] tracking-tighter md:text-8xl">
        Help
      </h1>

      <Topic id="delivery" title="Delivery">
        <p>
          We deliver to every district in Bangladesh. Orders inside Dhaka usually
          arrive in 1 to 2 days, and orders outside Dhaka in 3 to 5 days.
        </p>
        <p>
          The delivery charge depends on whether the address is inside or outside
          Dhaka. It is shown at checkout before you place the order.
        </p>
      </Topic>

      <Topic id="payment" title="Payment">
        <p>
          <strong className="text-foreground">Cash on Delivery.</strong> Pay the
          rider in cash when the parcel arrives.
        </p>
        <p>
          <strong className="text-foreground">bKash or Nagad.</strong> Send the
          order total to the number shown at checkout, then enter the number you
          paid from and the transaction ID. We check every payment by hand, so
          the order shows as “payment being verified” until we confirm it.
        </p>
      </Topic>

      <Topic id="returns" title="Returns">
        <p>
          Check the parcel when it arrives. If an item is damaged, the wrong
          size or not what you ordered, tell us within 3 days and we will
          exchange it. Items must be unworn with tags attached.
        </p>
      </Topic>

      <Topic id="sizing" title="Size guide">
        {CATEGORIES.map((category) => (
          <div key={category} className="pb-6">
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-[0.14em] text-foreground">
              {CATEGORY_LABEL[category]}
            </h3>
            <SizeTable category={category} />
          </div>
        ))}
      </Topic>
    </div>
  );
}
