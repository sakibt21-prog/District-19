import type { Metadata } from "next";
import Link from "next/link";
import { Badge, EmptyState, PageHeader, formatDateTime } from "@/components/admin/ui";
import {
  ORDER_STATUSES,
  ORDER_STATUS_LABEL,
  PAYMENT_METHOD_LABEL,
  PAYMENT_STATUS_LABEL,
  listAdminOrders,
  type OrderStatus,
  type PaymentStatus,
} from "@/lib/admin-data";
import { requireAdmin } from "@/lib/auth";
import { formatBDT } from "@/lib/format";

export const metadata: Metadata = { title: "Orders" };

const STATUS_TONE: Record<OrderStatus, "warn" | "info" | "good" | "bad" | "neutral"> = {
  new: "warn",
  confirmed: "info",
  packed: "info",
  shipped: "info",
  delivered: "good",
  cancelled: "bad",
};
const PAYMENT_TONE: Record<PaymentStatus, "warn" | "good" | "neutral" | "bad"> = {
  unpaid: "neutral",
  pending_verification: "warn",
  paid: "good",
  refunded: "bad",
};

export default async function AdminOrdersPage(props: PageProps<"/admin/orders">) {
  await requireAdmin();
  const { status: raw } = await props.searchParams;
  const status = ORDER_STATUSES.find((s) => s === raw);
  const orders = await listAdminOrders(status);

  return (
    <div className="space-y-6">
      <PageHeader title="Orders" description="Newest first. Open an order to see the customer, items and payment details." />

      <nav aria-label="Filter by status">
        <ul className="flex flex-wrap gap-2">
          {[undefined, ...ORDER_STATUSES].map((option) => {
            const active = option === status;
            return (
              <li key={option ?? "all"}>
                <Link
                  href={option ? `/admin/orders?status=${option}` : "/admin/orders"}
                  aria-current={active ? "page" : undefined}
                  className={`inline-flex h-11 items-center border px-4 text-sm font-semibold transition-colors ${
                    active ? "border-foreground bg-foreground text-paper" : "border-border bg-paper hover:border-foreground"
                  }`}
                >
                  {option ? ORDER_STATUS_LABEL[option] : "All"}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {orders.length === 0 ? (
        <EmptyState title={status ? `No ${ORDER_STATUS_LABEL[status].toLowerCase()} orders` : "No orders yet"}>
          {status ? "Try another status." : "Orders appear here as soon as customers check out."}
        </EmptyState>
      ) : (
        <div className="overflow-x-auto border border-border bg-paper">
          <table className="w-full min-w-[820px] border-collapse text-left text-sm">
            <caption className="sr-only">Orders</caption>
            <thead>
              <tr className="border-b border-border text-xs uppercase tracking-[0.1em] text-muted-foreground">
                <th scope="col" className="px-4 py-3 font-semibold">Order</th>
                <th scope="col" className="px-4 py-3 font-semibold">Placed</th>
                <th scope="col" className="px-4 py-3 font-semibold">Customer</th>
                <th scope="col" className="px-4 py-3 font-semibold">Payment</th>
                <th scope="col" className="px-4 py-3 font-semibold">Status</th>
                <th scope="col" className="px-4 py-3 text-right font-semibold">Total</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.id} className="border-b border-border last:border-0 hover:bg-background">
                  <th scope="row" className="px-4 py-3 font-semibold">
                    <Link href={`/admin/orders/${order.id}`} className="tabular underline underline-offset-4">
                      {order.orderNumber}
                    </Link>
                  </th>
                  <td className="whitespace-nowrap px-4 py-3 text-secondary">{formatDateTime(order.createdAt)}</td>
                  <td className="px-4 py-3">
                    {order.customerName}
                    <span className="tabular block text-secondary">
                      {order.phone} · {order.district}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {PAYMENT_METHOD_LABEL[order.paymentMethod]}
                    <span className="mt-1 block">
                      <Badge tone={PAYMENT_TONE[order.paymentStatus]}>{PAYMENT_STATUS_LABEL[order.paymentStatus]}</Badge>
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <Badge tone={STATUS_TONE[order.status]}>{ORDER_STATUS_LABEL[order.status]}</Badge>
                  </td>
                  <td className="tabular px-4 py-3 text-right font-semibold">{formatBDT(order.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
