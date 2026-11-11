import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";

const sql = readFileSync(process.argv[2], "utf8");
const db = new PGlite();
const ok = (name, cond, extra = "") => console.log(`${cond ? "PASS" : "FAIL"}  ${name}${extra ? "  -> " + extra : ""}`);
const fails = async (fn) => {
  try {
    await fn();
    return null;
  } catch (e) {
    return e.message;
  }
};

// Minimal stand-ins for what Supabase provides.
await db.exec(`
  create role anon; create role authenticated; create role service_role;
  create schema auth;
  create table auth.users (id uuid primary key default gen_random_uuid(), email text);
  create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
  create schema storage;
  create table storage.buckets (id text primary key, name text, public boolean, file_size_limit bigint, allowed_mime_types text[]);
  create table storage.objects (id uuid default gen_random_uuid(), bucket_id text, name text);
  alter table storage.objects enable row level security;
  grant usage on schema public, auth, storage to anon, authenticated, service_role;
`);

const err = await fails(() => db.exec(sql));
ok("migration runs", !err, err ?? "");
if (err) process.exit(1);
await db.exec(`grant select, insert, update, delete on all tables in schema public to anon, authenticated, service_role;`);

// Seed: one admin, one published product (2 variants), one draft.
const admin = (await db.query(`insert into auth.users (email) values ('a@x.y') returning id`)).rows[0].id;
const other = (await db.query(`insert into auth.users (email) values ('b@x.y') returning id`)).rows[0].id;
await db.query(`insert into public.admin_users (user_id, role) values ($1, 'owner')`, [admin]);
const pub = (
  await db.query(
    `insert into public.products (slug, name, category, price, sale_price, status) values ('tee','Tee','shirt',1500,1200,'published') returning id, published_at`,
  )
).rows[0];
ok("published_at stamped on insert", pub.published_at !== null);
const draft = (
  await db.query(
    `insert into public.products (slug, name, category, price, status) values ('draft','Draft','pant',3000,'draft') returning id, published_at`,
  )
).rows[0];
ok("draft has no published_at", draft.published_at === null);
const variant = async (productId, size, color, stock) =>
  (
    await db.query(
      `insert into public.product_variants (product_id,size,color,color_hex,stock_quantity) values ($1,$2,$3,'#000000',$4) returning id`,
      [productId, size, color, stock],
    )
  ).rows[0].id;
const vM = await variant(pub.id, "M", "Black", 3);
const vL = await variant(pub.id, "L", "Black", 1);
const vD = await variant(draft.id, "32", "Blue", 5);

const base = {
  customer_name: "Rahim Uddin",
  phone: "01712345678",
  email: "",
  division: "Dhaka",
  district: "Gazipur",
  area: "Tongi",
  address_line: "House 1, Road 2",
  note: "",
  delivery_zone: "outside_dhaka",
  payment_method: "cod",
  payment_sender_number: "",
  payment_trx_id: "",
};
const place = (extra) => db.query(`select public.place_order($1::jsonb) as r`, [JSON.stringify({ ...base, ...extra })]);
const stockOf = async (id) =>
  (await db.query(`select stock_quantity from public.product_variants where id=$1`, [id])).rows[0].stock_quantity;
const count = async (table) => (await db.query(`select count(*)::int c from ${table}`)).rows[0].c;

// 1. COD order: price from DB (sale price), fee by zone, stock reduced.
const r1 = (await place({ items: [{ variant_id: vM, quantity: 2 }, { variant_id: vL, quantity: 1 }] })).rows[0].r;
ok("COD order total = 3*1200 + 130", r1.total === 3730, String(r1.total));
ok("order number format", /^D19-\d{6}-[0-9A-F]{6}$/.test(r1.order_number), r1.order_number);
const o1 = (await db.query(`select payment_status, status from public.orders where id=$1`, [r1.order_id])).rows[0];
ok("COD starts unpaid/new", o1.payment_status === "unpaid" && o1.status === "new");
ok("stock reduced (M:1, L:0)", (await stockOf(vM)) === 1 && (await stockOf(vL)) === 0);
const items1 = (
  await db.query(`select sum(line_total)::int s from public.order_items where order_id=$1`, [r1.order_id])
).rows[0].s;
ok("order items written", items1 === 3600, String(items1));

// 2. Over-ordering fails and changes nothing.
const e2 = await fails(() => place({ items: [{ variant_id: vM, quantity: 2 }] }));
ok("out of stock rejected", /OUT_OF_STOCK/.test(e2 ?? ""), e2 ?? "no error");
ok("stock untouched after rejection", (await stockOf(vM)) === 1);

// 3. Draft product cannot be ordered.
const e3 = await fails(() => place({ items: [{ variant_id: vD, quantity: 1 }] }));
ok("draft item rejected", /ITEM_UNAVAILABLE/.test(e3 ?? ""), e3 ?? "no error");

// 4. bKash needs details; with them it waits for verification. Inside-Dhaka fee.
const e4 = await fails(() => place({ payment_method: "bkash", items: [{ variant_id: vM, quantity: 1 }] }));
ok("bKash without trx rejected", /PAYMENT_DETAILS_REQUIRED/.test(e4 ?? ""), e4 ?? "no error");
const r5 = (
  await place({
    payment_method: "bkash",
    payment_sender_number: "01812345678",
    payment_trx_id: "9BG4K2XQ7L",
    district: "Dhaka",
    delivery_zone: "inside_dhaka",
    items: [{ variant_id: vM, quantity: 1 }],
  })
).rows[0].r;
const o5 = (
  await db.query(`select payment_status, payment_trx_id, delivery_fee, total from public.orders where id=$1`, [r5.order_id])
).rows[0];
ok("bKash order pending verification, never paid", o5.payment_status === "pending_verification" && o5.payment_trx_id === "9BG4K2XQ7L");
ok("inside Dhaka fee 70, total 1270", o5.delivery_fee === 70 && o5.total === 1270, JSON.stringify(o5));
ok("same phone reuses one customer", (await count("public.customers")) === 1);
const e6 = await fails(() => place({ items: [] }));
ok("empty cart rejected", /EMPTY_CART/.test(e6 ?? ""), e6 ?? "no error");

// 5. Row-level security as an anonymous visitor.
await db.exec(`set role anon;`);
const slugs = (await db.query(`select slug from public.products`)).rows.map((r) => r.slug).join();
ok("anon sees only published products", slugs === "tee", slugs);
ok("anon sees only published variants", (await count("public.product_variants")) === 2);
ok("anon cannot read orders", (await count("public.orders")) === 0);
ok("anon cannot read order items", (await count("public.order_items")) === 0);
ok("anon cannot read customers", (await count("public.customers")) === 0);
ok("anon cannot read admin list", (await count("public.admin_users")) === 0);
ok(
  "anon cannot insert a product",
  !!(await fails(() => db.query(`insert into public.products (slug,name,category,price) values ('x','X','shoe',1)`))),
);
ok(
  "anon update of price changes nothing",
  (await db.query(`update public.products set price = 1 where slug='tee' returning id`)).rows.length === 0,
);
ok("anon cannot call place_order", !!(await fails(() => place({ items: [{ variant_id: vM, quantity: 1 }] }))));
ok("anon can read shop settings", (await db.query(`select inside_dhaka_fee from public.shop_settings`)).rows[0].inside_dhaka_fee === 70);
ok(
  "anon cannot change shop settings",
  (await db.query(`update public.shop_settings set inside_dhaka_fee = 0 returning id`)).rows.length === 0,
);
ok("best_seller_ids works for anon", (await db.query(`select public.best_seller_ids(8) as id`)).rows[0]?.id === pub.id);

// 6. A signed-in user who is not an admin.
await db.exec(`reset role; select set_config('request.jwt.claim.sub', '${other}', false); set role authenticated;`);
ok("non-admin sees no drafts", (await count("public.products")) === 1);
ok("non-admin cannot read orders", (await count("public.orders")) === 0);
const e7 = await fails(() => db.query(`select public.cancel_order($1)`, [r1.order_id]));
ok("non-admin cannot cancel an order", /NOT_AUTHORISED/.test(e7 ?? ""), e7 ?? "no error");
ok(
  "non-admin cannot make themselves admin",
  !!(await fails(() => db.query(`insert into public.admin_users (user_id) values ($1)`, [other]))),
);
ok("non-admin cannot call place_order", !!(await fails(() => place({ items: [{ variant_id: vM, quantity: 1 }] }))));

// 7. The admin.
await db.exec(`reset role; select set_config('request.jwt.claim.sub', '${admin}', false); set role authenticated;`);
ok("admin sees drafts", (await count("public.products")) === 2);
ok("admin sees orders", (await count("public.orders")) === 2);
await db.query(`update public.products set status='published' where id=$1`, [draft.id]);
ok(
  "publishing a draft stamps published_at",
  (await db.query(`select published_at from public.products where id=$1`, [draft.id])).rows[0].published_at !== null,
);
await db.query(`select public.cancel_order($1)`, [r1.order_id]);
ok("cancel returns stock (M:2, L:1)", (await stockOf(vM)) === 2 && (await stockOf(vL)) === 1);
await db.query(`select public.cancel_order($1)`, [r1.order_id]);
ok("cancelling twice does not double the stock", (await stockOf(vM)) === 2);
ok(
  "admin can update settings",
  (await db.query(`update public.shop_settings set bkash_number='01700000000' where id returning id`)).rows.length === 1,
);
await db.exec(`reset role;`);
ok(
  "sale price must be below price",
  !!(await fails(() => db.query(`update public.products set sale_price = 2000 where slug='tee'`))),
);
ok(
  "second primary photo rejected",
  !!(await fails(() =>
    db.exec(
      `insert into public.product_images (product_id, storage_path, is_primary) values ('${pub.id}','a',true), ('${pub.id}','b',true)`,
    ),
  )),
);
