import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Icon } from "@/components/site/Icon";
import { ORDER_SELECT, PAYMENT_METHOD_LABEL, toOrder } from "@/lib/admin-data";
import { getShopSettings } from "@/lib/catalog";
import { formatBDT } from "@/lib/format";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createServiceClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Order confirmed",
  robots: { index: false, follow: false },
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/*
  The confirmation is reached by the order's id, a random UUID that only the
  buyer receives, so it works without an account. It is read with the server
  key and shows only what the buyer entered themselves.
*/
async function Confirmation({ params }: { params: PageProps<"/order/[id]">["params"] }) {
  const { id } = await params;
  if (!isSupabaseConfigured() || !UUID.test(id)) notFound();

  const { data } = await createServiceClient().from("orders").select(ORDER_SELECT).eq("id", id).maybeSingle();
  if (!data) notFound();
  const order = toOrder(data);
  const settings = await getShopSettings();
  const mobile = order.paymentMethod !== "cod";

  return (
    <>
      <p className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.16em] text-success">
        <Icon name="check" size={18} />
        Order received
      </p>
      <h1 className="mt-3 font-display text-5xl font-extrabold uppercase leading-[0.9] tracking-tighter md:text-7xl">
        Thank you, {order.customerName.split(" ")[0]}.
      </h1>
      <p className="mt-6 max-w-[60ch] text-lg text-secondary">
        Your order number is <span className="tabular font-bold text-foreground">{order.orderNumber}</span>. Keep it for
        reference. We will call <span className="tabular font-semibold text-foreground">{order.phone}</span> to confirm
        delivery.
      </p>

      <div className="mt-8 border border-border bg-background p-5 text-base">
        {order.status === "cancelled" ? (
          <p>
            <span className="font-semibold">This order was cancelled.</span> If that is unexpected, contact us with your
            order number.
          </p>
        ) : mobile ? (
          order.paymentStatus === "paid" ? (
            <p>
              <span className="font-semibold">Payment confirmed.</span> We received your{" "}
              {PAYMENT_METHOD_LABEL[order.paymentMethod]} payment of{" "}
              <span className="tabular font-semibold">{formatBDT(order.total)}</span>.
            </p>
          ) : (
            <p>
              <span className="font-semibold">Payment being verified.</span> You told us you sent{" "}
              <span className="tabular font-semibold">{formatBDT(order.total)}</span> by{" "}
              {PAYMENT_METHOD_LABEL[order.paymentMethod]} with transaction ID{" "}
              <span className="tabular font-semibold">{order.paymentTrxId}</span>. We check each payment by hand before
              the order ships.
              {(order.paymentMethod === "bkash" ? settings.bkashNumber : settings.nagadNumber) && (
                <>
                  {" "}
                  If you have not sent it yet, send it to{" "}
                  <span className="tabular font-semibold">
                    {order.paymentMethod === "bkash" ? settings.bkashNumber : settings.nagadNumber}
                  </span>
                  .
                </>
              )}
            </p>
          )
        ) : (
          <p>
            <span className="font-semibold">Cash on Delivery.</span> Please have{" "}
            <span className="tabular font-semibold">{formatBDT(order.total)}</span> ready for the rider.
          </p>
        )}
      </div>

      <div className="mt-10 grid gap-10 md:grid-cols-2">
        <section aria-labelledby="order-items">
          <h2 id="order-items" className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Items
          </h2>
          <ul className="mt-3 divide-y divide-border border-y border-border">
            {order.items.map((item) => (
              <li key={item.id} className="flex justify-between gap-4 py-3 text-sm">
                <span>
                  <span className="block font-extrabold uppercase tracking-wide">{item.productName}</span>
                  <span className="text-secondary">
                    {item.color} · Size {item.size} · Qty {item.quantity}
                  </span>
                </span>
                <span className="tabular font-semibold">{formatBDT(item.lineTotal)}</span>
              </li>
            ))}
          </ul>
          <dl className="mt-3 space-y-1 text-sm">
            <div className="flex justify-between">
              <dt>Subtotal</dt>
              <dd className="tabular">{formatBDT(order.subtotal)}</dd>
            </div>
            <div className="flex justify-between">
              <dt>Delivery</dt>
              <dd className="tabular">{formatBDT(order.deliveryFee)}</dd>
            </div>
            <div className="flex justify-between pt-2 text-base font-bold">
              <dt>Total</dt>
              <dd className="tabular">{formatBDT(order.total)}</dd>
            </div>
          </dl>
        </section>

        <section aria-labelledby="order-delivery">
          <h2 id="order-delivery" className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Delivering to
          </h2>
          <address className="mt-3 text-base not-italic leading-relaxed">
            {order.customerName}
            <br />
            {order.addressLine}
            <br />
            {order.area}, {order.district}
            <br />
            {order.division} Division
          </address>
          <p className="mt-4 text-sm text-secondary">
            {order.deliveryZone === "inside_dhaka"
              ? "Inside Dhaka: usually 1 to 2 days."
              : "Outside Dhaka: usually 3 to 5 days."}
          </p>
        </section>
      </div>

      <Link
        href="/"
        className="mt-12 inline-flex h-12 items-center gap-2 bg-primary px-6 text-sm font-semibold uppercase tracking-[0.14em] text-on-primary transition-opacity hover:opacity-85"
      >
        Keep shopping
        <Icon name="arrowRight" size={16} />
      </Link>
    </>
  );
}

export default function OrderPage(props: PageProps<"/order/[id]">) {
  return (
    <div className="mx-auto max-w-[1100px] px-4 pb-24 pt-[calc(var(--header-h)+2.5rem)] md:px-8 md:pt-[calc(var(--header-h)+4rem)]">
      <Suspense fallback={<div aria-hidden="true" className="h-64 animate-pulse bg-background" />}>
        <Confirmation params={props.params} />
      </Suspense>
    </div>
  );
}
