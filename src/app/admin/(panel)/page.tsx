import Link from "next/link";
import { Badge, EmptyState, PageHeader, formatDateTime, primaryButton } from "@/components/admin/ui";
import { Icon } from "@/components/site/Icon";
import {
  ORDER_STATUS_LABEL,
  PAYMENT_METHOD_LABEL,
  getOverview,
  listAdminOrders,
} from "@/lib/admin-data";
import { requireAdmin } from "@/lib/auth";
import { formatBDT } from "@/lib/format";

function Stat({ label, value, href, alert }: { label: string; value: number; href: string; alert?: boolean }) {
  return (
    <Link
      href={href}
      className="group block border border-border bg-paper p-5 transition-colors hover:border-foreground"
    >
      <p className="text-sm text-secondary">{label}</p>
      <p className={`tabular mt-2 text-4xl font-extrabold tracking-tight ${alert && value > 0 ? "text-accent" : ""}`}>
        {value}
      </p>
    </Link>
  );
}

export default async function AdminOverviewPage() {
  await requireAdmin();
  const [overview, recent] = await Promise.all([getOverview(), listAdminOrders(undefined, 6)]);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Overview"
        description="Where the shop stands right now."
        action={
          <Link href="/admin/products/new" className={primaryButton}>
            <Icon name="plus" size={16} />
            Add product
          </Link>
        }
      />

      <section aria-label="Counts" className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
        <Stat label="Total products" value={overview.totalProducts} href="/admin/products" />
        <Stat label="Published products" value={overview.publishedProducts} href="/admin/products" />
        <Stat label="Out-of-stock products" value={overview.outOfStockProducts} href="/admin/products" alert />
        <Stat label="Total orders" value={overview.totalOrders} href="/admin/orders" />
        <Stat label="New orders" value={overview.newOrders} href="/admin/orders?status=new" alert />
        <Stat label="Payments to verify" value={overview.pendingPayments} href="/admin/orders" alert />
      </section>

      <section aria-labelledby="recent-orders">
        <div className="flex items-center justify-between">
          <h2 id="recent-orders" className="text-xl font-bold">
            Latest orders
          </h2>
          <Link href="/admin/orders" className="text-sm font-semibold underline underline-offset-4">
            All orders
          </Link>
        </div>
        {recent.length === 0 ? (
          <div className="mt-4">
            <EmptyState title="No orders yet">Orders appear here as soon as customers check out.</EmptyState>
          </div>
        ) : (
          <ul className="mt-4 divide-y divide-border border border-border bg-paper">
            {recent.map((order) => (
              <li key={order.id}>
                <Link
                  href={`/admin/orders/${order.id}`}
                  className="flex flex-wrap items-center justify-between gap-x-6 gap-y-1 px-4 py-3 transition-colors hover:bg-background"
                >
                  <span className="min-w-0">
                    <span className="tabular font-semibold">{order.orderNumber}</span>
                    <span className="ml-3 text-secondary">{order.customerName}</span>
                  </span>
                  <span className="flex items-center gap-3 text-sm">
                    <span className="text-secondary">{formatDateTime(order.createdAt)}</span>
                    <span className="text-secondary">{PAYMENT_METHOD_LABEL[order.paymentMethod]}</span>
                    <Badge tone={order.status === "new" ? "warn" : order.status === "cancelled" ? "bad" : "neutral"}>
                      {ORDER_STATUS_LABEL[order.status]}
                    </Badge>
                    <span className="tabular font-semibold">{formatBDT(order.total)}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
