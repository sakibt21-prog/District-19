# DISTRICT 19

Online shop for the DISTRICT 19 label: shirts, pants and shoes, with an admin dashboard for releases and orders. Built for Bangladesh (prices in taka, Cash on Delivery, bKash and Nagad).

- **Stack:** Next.js 16 (App Router, Cache Components), TypeScript, Tailwind CSS 4, Framer Motion, Supabase (Postgres, Storage, Auth).
- **Design:** `design-system/district-19/MASTER.md`, with the shop overrides in `design-system/district-19/pages/storefront.md`.
- **Plan and decisions:** `docs/PLAN.md`.

## Run it locally

Needs Node.js 20.9 or newer.

```bash
npm install
npm run dev
```

Open http://localhost:3000. Without a `.env.local` file the shop runs on a built-in sample catalogue with drawn placeholders, so every page can be seen. In that mode the admin dashboard and ordering are switched off.

## Connect Supabase

1. Create a project at https://supabase.com.
2. In the project's **SQL Editor**, paste the whole of `supabase/migrations/0001_init.sql` and run it. It creates the tables, the security policies, the `product-images` storage bucket and the order functions.
3. Copy `.env.example` to `.env.local` and fill in the three values from **Project Settings → API**:

   | Variable | Where it is used |
   |---|---|
   | `NEXT_PUBLIC_SUPABASE_URL` | Browser and server |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Browser and server |
   | `SUPABASE_SERVICE_ROLE_KEY` | Server only: placing orders, order confirmation, creating admins |

   Never commit `.env.local`, and never put the service-role key in a variable that starts with `NEXT_PUBLIC_`.
4. Create the first administrator. You are asked for a password in the terminal:

   ```bash
   node --env-file=.env.local scripts/create-admin.mjs you@example.com
   ```

5. Restart `npm run dev`, then sign in at http://localhost:3000/admin/login.
6. In **Admin → Settings**, enter your bKash and Nagad numbers and check the delivery charges. A payment method with no number is not offered at checkout.

Once Supabase is connected the sample catalogue is no longer shown; the shop shows only what is published from the dashboard.

## Using the admin dashboard

| Page | What it does |
|---|---|
| **Overview** | Counts of products, published products, out-of-stock products, orders, new orders and payments waiting to be verified. |
| **Products** | Add, edit, delete, publish, unpublish and feature products. |
| **Looks** | Outfits for the "Try the Look" row: a model photo plus the products worn in it. |
| **Orders** | Every order with customer, address, items and payment details. Change order and payment status. |
| **Settings** | Delivery charges and the bKash and Nagad numbers. |

### Adding a product

1. **Products → Add product.** Enter name, category, description, price and, if on sale, a discounted price.
2. **Photos.** Upload up to 12. Cut-outs with a transparent background suit the design best. Mark one photo **Front** and one **Back**: those are the two sides of the turning product on its page. The rest are **Gallery** shots. Choose the primary photo and reorder with the arrows.
3. **Sizes, colours and stock.** Pick sizes, add colours, and enter the stock for each size and colour.
4. Choose **Published** and save. The product is on the shop immediately. **Draft** keeps it visible only in the dashboard.

### bKash and Nagad payments

Payments are manual, not a gateway integration. The customer sends money to your number and enters the number they paid from and the transaction ID. The order is stored as **Payment being verified**. Open the order, check the transaction in your bKash or Nagad account, and only then set the payment status to **Paid**. Nothing is ever marked paid automatically.

### Cancelling an order

Setting an order to **Cancelled** returns its items to stock. A cancelled order cannot be reopened.

## How security works

- **No public sign-up.** Administrators exist only as rows in `admin_users`, created with `scripts/create-admin.mjs`.
- **Three server-side checks** on everything under `/admin`: `src/proxy.ts` turns away requests with no session; the admin layout and every admin page call `requireAdmin()`; every admin server action calls `requireAdmin()` again before it touches data. None of this depends on the admin address being secret.
- **Row-level security** in Postgres enforces the same rules a second time: the public can read published products only; products, photos, looks, settings and orders can be written only by administrators; the storage bucket accepts uploads only from administrators.
- **Orders** are created by the `place_order` database function, callable only with the service-role key from the checkout server action. Prices, stock and delivery fee come from the database, never from the browser, and stock is reduced in the same transaction with the rows locked.
- The **service-role key** is read only in `src/lib/supabase/server.ts`, which is marked server-only.

## Project layout

```
src/app/(shop)/          Public shop: home, category pages, product, cart, checkout, order confirmation, help
src/app/admin/           Dashboard: login, overview, products, looks, orders, settings, server actions
src/components/scenes/   The three scenes from the reference reel: rail, floating shoes, Try the Look
src/components/product/  Product card, turning product view, size guide
src/components/admin/    Dashboard forms, including photo upload
src/lib/catalog.ts       Cached reads for the shop (Supabase, or the sample catalogue)
src/lib/admin-data.ts    Uncached reads for the dashboard
src/lib/auth.ts          requireAdmin()
src/proxy.ts             Session refresh and first gate for /admin
supabase/migrations/     Database schema, policies and functions
scripts/create-admin.mjs Creates an administrator
```

## Deploy to Vercel

1. Push the repository to GitHub and import it in Vercel.
2. In **Project Settings → Environment Variables**, add the four variables from `.env.example`. Set `NEXT_PUBLIC_SITE_URL` to the live address.
3. Deploy. No other configuration is needed; product photos are served from Supabase Storage through `next/image`.
4. In Supabase, under **Authentication → URL Configuration**, set the Site URL to the live address.

## Commands

| Command | What it does |
|---|---|
| `npm run dev` | Development server |
| `npm run build` | Production build |
| `npm start` | Run the production build |
| `npm run lint` | Lint |
| `npm run typecheck` | Type-check |
| `npm run test:db` | Runs the migration in an in-memory Postgres and checks ordering, stock and the security policies (41 checks) |

`test:db` uses stand-ins for Supabase's `auth` and `storage` schemas, so it proves the SQL and the policies, not the Supabase project itself. Run it after any change to the migration.
