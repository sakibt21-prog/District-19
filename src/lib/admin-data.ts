import "server-only";
import { PRODUCT_SELECT, toProduct, type ProductRow } from "./rows";
import { createSessionClient } from "./supabase/server";
import { publicImageUrl } from "./supabase/env";
import type { Product } from "./types";

/*
  Reads for the admin dashboard. They run as the signed-in administrator, so
  row-level security applies: a non-admin session gets nothing back. Pages call
  requireAdmin() first; these are never cached.
*/

export type ProductStatus = "draft" | "published";
export type OrderStatus = "new" | "confirmed" | "packed" | "shipped" | "delivered" | "cancelled";
export type PaymentStatus = "unpaid" | "pending_verification" | "paid" | "refunded";
export type PaymentMethod = "cod" | "bkash" | "nagad";

export const ORDER_STATUSES: OrderStatus[] = ["new", "confirmed", "packed", "shipped", "delivered", "cancelled"];
export const PAYMENT_STATUSES: PaymentStatus[] = ["unpaid", "pending_verification", "paid", "refunded"];

export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  new: "New",
  confirmed: "Confirmed",
  packed: "Packed",
  shipped: "Shipped",
  delivered: "Delivered",
  cancelled: "Cancelled",
};
export const PAYMENT_STATUS_LABEL: Record<PaymentStatus, string> = {
  unpaid: "Unpaid",
  pending_verification: "Payment being verified",
  paid: "Paid",
  refunded: "Refunded",
};
export const PAYMENT_METHOD_LABEL: Record<PaymentMethod, string> = {
  cod: "Cash on Delivery",
  bkash: "bKash",
  nagad: "Nagad",
};

export interface AdminProduct extends Product {
  status: ProductStatus;
  /** Storage paths by image id, needed when saving or deleting photos. */
  imagePaths: Record<string, string>;
}

function toAdminProduct(row: ProductRow): AdminProduct {
  return {
    ...toProduct(row),
    status: row.status,
    imagePaths: Object.fromEntries((row.product_images ?? []).map((i) => [i.id, i.storage_path])),
  };
}

export async function listAdminProducts(): Promise<AdminProduct[]> {
  const db = await createSessionClient();
  const { data, error } = await db
    .from("products")
    .select(PRODUCT_SELECT)
    .order("created_at", { ascending: false })
    .returns<ProductRow[]>();
  if (error) throw new Error(`Could not load products: ${error.message}`);
  return data.map(toAdminProduct);
}

export async function getAdminProduct(id: string): Promise<AdminProduct | null> {
  const db = await createSessionClient();
  const { data, error } = await db
    .from("products")
    .select(PRODUCT_SELECT)
    .eq("id", id)
    .maybeSingle<ProductRow>();
  if (error) throw new Error(`Could not load the product: ${error.message}`);
  return data ? toAdminProduct(data) : null;
}

export interface AdminLook {
  id: string;
  name: string;
  modelImagePath: string | null;
  modelImageUrl: string | null;
  sortOrder: number;
  isPublished: boolean;
  productIds: string[];
}

export async function listAdminLooks(): Promise<AdminLook[]> {
  const db = await createSessionClient();
  const { data, error } = await db
    .from("looks")
    .select("id, name, model_image_path, sort_order, is_published, look_items(product_id, sort_order)")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true })
    .returns<
      {
        id: string;
        name: string;
        model_image_path: string | null;
        sort_order: number;
        is_published: boolean;
        look_items: { product_id: string; sort_order: number }[];
      }[]
    >();
  if (error) throw new Error(`Could not load looks: ${error.message}`);
  return data.map((look) => ({
    id: look.id,
    name: look.name,
    modelImagePath: look.model_image_path,
    modelImageUrl: look.model_image_path ? publicImageUrl(look.model_image_path) : null,
    sortOrder: look.sort_order,
    isPublished: look.is_published,
    productIds: [...look.look_items].sort((a, b) => a.sort_order - b.sort_order).map((i) => i.product_id),
  }));
}

export interface AdminOrderSummary {
  id: string;
  orderNumber: string;
  customerName: string;
  phone: string;
  district: string;
  total: number;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  status: OrderStatus;
  createdAt: string;
}

export interface AdminOrderItem {
  id: string;
  productName: string;
  size: string;
  color: string;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
}

export interface AdminOrder extends AdminOrderSummary {
  email: string | null;
  division: string;
  area: string;
  addressLine: string;
  note: string | null;
  deliveryZone: "inside_dhaka" | "outside_dhaka";
  deliveryFee: number;
  subtotal: number;
  paymentSenderNumber: string | null;
  paymentTrxId: string | null;
  items: AdminOrderItem[];
}

interface OrderRow {
  id: string;
  order_number: string;
  customer_name: string;
  phone: string;
  email: string | null;
  division: string;
  district: string;
  area: string;
  address_line: string;
  note: string | null;
  delivery_zone: "inside_dhaka" | "outside_dhaka";
  delivery_fee: number;
  subtotal: number;
  total: number;
  payment_method: PaymentMethod;
  payment_status: PaymentStatus;
  payment_sender_number: string | null;
  payment_trx_id: string | null;
  status: OrderStatus;
  created_at: string;
  order_items?: {
    id: string;
    product_name: string;
    size: string;
    color: string;
    unit_price: number;
    quantity: number;
    line_total: number;
  }[];
}

function toSummary(row: OrderRow): AdminOrderSummary {
  return {
    id: row.id,
    orderNumber: row.order_number,
    customerName: row.customer_name,
    phone: row.phone,
    district: row.district,
    total: row.total,
    paymentMethod: row.payment_method,
    paymentStatus: row.payment_status,
    status: row.status,
    createdAt: row.created_at,
  };
}

export function toOrder(row: OrderRow): AdminOrder {
  return {
    ...toSummary(row),
    email: row.email,
    division: row.division,
    area: row.area,
    addressLine: row.address_line,
    note: row.note,
    deliveryZone: row.delivery_zone,
    deliveryFee: row.delivery_fee,
    subtotal: row.subtotal,
    paymentSenderNumber: row.payment_sender_number,
    paymentTrxId: row.payment_trx_id,
    items: (row.order_items ?? []).map((item) => ({
      id: item.id,
      productName: item.product_name,
      size: item.size,
      color: item.color,
      unitPrice: item.unit_price,
      quantity: item.quantity,
      lineTotal: item.line_total,
    })),
  };
}

export const ORDER_SELECT = "*, order_items(id, product_name, size, color, unit_price, quantity, line_total)";

export async function listAdminOrders(status?: OrderStatus, limit = 200): Promise<AdminOrderSummary[]> {
  const db = await createSessionClient();
  let query = db.from("orders").select("*").order("created_at", { ascending: false }).limit(limit);
  if (status) query = query.eq("status", status);
  const { data, error } = await query.returns<OrderRow[]>();
  if (error) throw new Error(`Could not load orders: ${error.message}`);
  return data.map(toSummary);
}

export async function getAdminOrder(id: string): Promise<AdminOrder | null> {
  const db = await createSessionClient();
  const { data, error } = await db.from("orders").select(ORDER_SELECT).eq("id", id).maybeSingle<OrderRow>();
  if (error) throw new Error(`Could not load the order: ${error.message}`);
  return data ? toOrder(data) : null;
}

export interface Overview {
  totalProducts: number;
  publishedProducts: number;
  outOfStockProducts: number;
  totalOrders: number;
  newOrders: number;
  pendingPayments: number;
}

export async function getOverview(): Promise<Overview> {
  const db = await createSessionClient();
  const count = (table: string, filter?: [string, string]) => {
    let query = db.from(table).select("*", { count: "exact", head: true });
    if (filter) query = query.eq(filter[0], filter[1]);
    return query;
  };
  const [products, published, stock, orders, fresh, pending] = await Promise.all([
    count("products"),
    count("products", ["status", "published"]),
    db.from("products").select("id, product_variants(stock_quantity)").returns<
      { id: string; product_variants: { stock_quantity: number }[] }[]
    >(),
    count("orders"),
    count("orders", ["status", "new"]),
    count("orders", ["payment_status", "pending_verification"]),
  ]);
  const failed = [products, published, stock, orders, fresh, pending].find((r) => r.error);
  if (failed?.error) throw new Error(`Could not load the overview: ${failed.error.message}`);
  return {
    totalProducts: products.count ?? 0,
    publishedProducts: published.count ?? 0,
    outOfStockProducts: (stock.data ?? []).filter(
      (p) => p.product_variants.reduce((sum, v) => sum + v.stock_quantity, 0) === 0,
    ).length,
    totalOrders: orders.count ?? 0,
    newOrders: fresh.count ?? 0,
    pendingPayments: pending.count ?? 0,
  };
}
