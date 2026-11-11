import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { updateOrder } from "@/app/admin/actions";
import { SubmitButton } from "@/components/admin/ConfirmButton";
import { Notice, PageHeader, formatDateTime, helpClass, inputClass, labelClass, primaryButton } from "@/components/admin/ui";
import { Icon } from "@/components/site/Icon";
import {
  ORDER_STATUSES,
  ORDER_STATUS_LABEL,
  PAYMENT_METHOD_LABEL,
  PAYMENT_STATUSES,
  PAYMENT_STATUS_LABEL,
  getAdminOrder,
} from "@/lib/admin-data";
import { requireAdmin } from "@/lib/auth";
import { formatBDT } from "@/lib/format";

export const metadata: Metadata = { title: "Order" };

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[9rem_minmax(0,1fr)] gap-4 py-2">
      <dt className="text-secondary">{label}</dt>
      <dd className="min-w-0 break-words">{children}</dd>
    </div>
  );
}

export default async function AdminOrderPage(props: PageProps<"/admin/orders/[id]">) {
  await requireAdmin();
  const { id } = await props.params;
  const order = await getAdminOrder(id);
  if (!order) notFound();
  const cancelled = order.status === "cancelled";
  const mobilePayment = order.paymentMethod !== "cod";

  return (
    <div className="space-y-6">
      <Link href="/admin/orders" className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold">
        <Icon name="arrowLeft" size={16} />
        All orders
      </Link>
      <PageHeader title={`Order ${order.orderNumber}`} description={`Placed ${formatDateTime(order.createdAt)}`} />

      {mobilePayment && order.paymentStatus === "pending_verification" && (
        <Notice>
          <p className="font-semibold text-foreground">This payment has not been verified.</p>
          <p className="mt-1">
            Check your {PAYMENT_METHOD_LABEL[order.paymentMethod]} account for transaction{" "}
            <span className="tabular font-semibold text-foreground">{order.paymentTrxId}</span> of{" "}
            <span className="tabular font-semibold text-foreground">{formatBDT(order.total)}</span> from{" "}
            <span className="tabular font-semibold text-foreground">{order.paymentSenderNumber}</span>. Mark it Paid only
            after you have seen the money arrive.
          </p>
        </Notice>
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="min-w-0 space-y-6">
          <section aria-labelledby="items-title" className="border border-border bg-paper p-5 md:p-6">
            <h2 id="items-title" className="text-lg font-bold">
              Items
            </h2>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[480px] border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-border text-xs uppercase tracking-[0.1em] text-muted-foreground">
                    <th scope="col" className="py-2 pr-4 font-semibold">Product</th>
                    <th scope="col" className="py-2 pr-4 font-semibold">Size</th>
                    <th scope="col" className="py-2 pr-4 font-semibold">Colour</th>
                    <th scope="col" className="py-2 pr-4 text-right font-semibold">Price</th>
                    <th scope="col" className="py-2 pr-4 text-right font-semibold">Qty</th>
                    <th scope="col" className="py-2 text-right font-semibold">Total</th>
                  </tr>
                </thead>
                <tbody className="tabular">
                  {order.items.map((item) => (
                    <tr key={item.id} className="border-b border-border">
                      <th scope="row" className="py-2 pr-4 font-semibold">{item.productName}</th>
                      <td className="py-2 pr-4">{item.size}</td>
                      <td className="py-2 pr-4">{item.color}</td>
                      <td className="py-2 pr-4 text-right">{formatBDT(item.unitPrice)}</td>
                      <td className="py-2 pr-4 text-right">{item.quantity}</td>
                      <td className="py-2 text-right">{formatBDT(item.lineTotal)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="tabular">
                  <tr>
                    <td colSpan={5} className="pt-3 pr-4 text-right text-secondary">Subtotal</td>
                    <td className="pt-3 text-right">{formatBDT(order.subtotal)}</td>
                  </tr>
                  <tr>
                    <td colSpan={5} className="py-1 pr-4 text-right text-secondary">
                      Delivery ({order.deliveryZone === "inside_dhaka" ? "inside Dhaka" : "outside Dhaka"})
                    </td>
                    <td className="py-1 text-right">{formatBDT(order.deliveryFee)}</td>
                  </tr>
                  <tr className="text-base font-bold">
                    <td colSpan={5} className="pr-4 text-right">Total</td>
                    <td className="text-right">{formatBDT(order.total)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </section>

          <section aria-labelledby="customer-title" className="border border-border bg-paper p-5 md:p-6">
            <h2 id="customer-title" className="text-lg font-bold">
              Customer and delivery
            </h2>
            <dl className="mt-3 divide-y divide-border text-sm">
              <Row label="Name">{order.customerName}</Row>
              <Row label="Phone">
                <a href={`tel:${order.phone}`} className="tabular underline underline-offset-4">
                  {order.phone}
                </a>
              </Row>
              {order.email && (
                <Row label="Email">
                  <a href={`mailto:${order.email}`} className="underline underline-offset-4">
                    {order.email}
                  </a>
                </Row>
              )}
              <Row label="Address">
                {order.addressLine}
                <br />
                {order.area}, {order.district}
                <br />
                {order.division} Division
              </Row>
              {order.note && <Row label="Customer note">{order.note}</Row>}
            </dl>
          </section>

          <section aria-labelledby="payment-title" className="border border-border bg-paper p-5 md:p-6">
            <h2 id="payment-title" className="text-lg font-bold">
              Payment
            </h2>
            <dl className="mt-3 divide-y divide-border text-sm">
              <Row label="Method">{PAYMENT_METHOD_LABEL[order.paymentMethod]}</Row>
              <Row label="Status">{PAYMENT_STATUS_LABEL[order.paymentStatus]}</Row>
              {mobilePayment && (
                <>
                  <Row label="Paid from">
                    <span className="tabular">{order.paymentSenderNumber ?? "Not given"}</span>
                  </Row>
                  <Row label="Transaction ID">
                    <span className="tabular">{order.paymentTrxId ?? "Not given"}</span>
                  </Row>
                </>
              )}
            </dl>
          </section>
        </div>

        <aside className="h-fit border border-border bg-paper p-5 md:p-6 lg:sticky lg:top-6">
          <h2 className="text-lg font-bold">Update order</h2>
          <form action={updateOrder.bind(null, order.id)} className="mt-4 space-y-5">
            <div>
              <label htmlFor="status" className={labelClass}>
                Order status
              </label>
              <select id="status" name="status" defaultValue={order.status} disabled={cancelled} className={`${inputClass} mt-1`}>
                {ORDER_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {ORDER_STATUS_LABEL[status]}
                  </option>
                ))}
              </select>
              {/* A disabled select is not submitted, so send the value separately. */}
              {cancelled && <input type="hidden" name="status" value="cancelled" />}
              <p className={helpClass}>
                {cancelled
                  ? "This order was cancelled and its stock was returned. It cannot be reopened."
                  : "Choosing Cancelled returns the items to stock and cannot be undone."}
              </p>
            </div>
            <div>
              <label htmlFor="payment_status" className={labelClass}>
                Payment status
              </label>
              <select
                id="payment_status"
                name="payment_status"
                defaultValue={order.paymentStatus}
                className={`${inputClass} mt-1`}
              >
                {PAYMENT_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {PAYMENT_STATUS_LABEL[status]}
                  </option>
                ))}
              </select>
            </div>
            <SubmitButton className={`${primaryButton} w-full`}>Save changes</SubmitButton>
          </form>
        </aside>
      </div>
    </div>
  );
}
