"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { placeOrder, type CheckoutField, type CheckoutInput } from "@/app/(shop)/checkout/actions";
import { useCart } from "@/components/cart/CartProvider";
import { LineThumb } from "@/components/cart/CartView";
import { Icon } from "@/components/site/Icon";
import { BD_PHONE, DIVISIONS, DIVISION_NAMES, normalisePhone, zoneFor } from "@/lib/bd-locations";
import type { ShopSettings } from "@/lib/catalog";
import { formatBDT } from "@/lib/format";

type Fields = Omit<CheckoutInput, "items">;
type Errors = Partial<Record<CheckoutField, string>>;

const EMPTY: Fields = {
  customerName: "",
  phone: "",
  email: "",
  division: "",
  district: "",
  area: "",
  addressLine: "",
  note: "",
  paymentMethod: "cod",
  paymentSenderNumber: "",
  paymentTrxId: "",
};

const LABELS: Record<CheckoutField, string> = {
  customerName: "Full name",
  phone: "Mobile number",
  email: "Email",
  division: "Division",
  district: "District",
  area: "Area or thana",
  addressLine: "House, road and landmark",
  note: "Order note",
  paymentMethod: "Payment method",
  paymentSenderNumber: "Number you paid from",
  paymentTrxId: "Transaction ID",
};

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** The same rules the server applies, so most mistakes are caught before sending. */
function validate(fields: Fields): Errors {
  const errors: Errors = {};
  if (fields.customerName.trim().length < 2) errors.customerName = "Enter your full name.";
  if (!BD_PHONE.test(normalisePhone(fields.phone))) errors.phone = "Enter an 11-digit mobile number, like 01712345678.";
  if (fields.email.trim() && !EMAIL.test(fields.email.trim())) {
    errors.email = "Enter a valid email address, or leave it empty.";
  }
  if (!DIVISIONS[fields.division]) errors.division = "Choose your division.";
  if (!DIVISIONS[fields.division]?.includes(fields.district)) errors.district = "Choose your district.";
  if (fields.area.trim().length < 2) errors.area = "Enter your area or thana.";
  if (fields.addressLine.trim().length < 5) errors.addressLine = "Enter your house, road and any landmark.";
  if (fields.note.length > 300) errors.note = "Keep the note under 300 characters.";
  if (fields.paymentMethod !== "cod") {
    if (!BD_PHONE.test(normalisePhone(fields.paymentSenderNumber))) {
      errors.paymentSenderNumber = "Enter the 11-digit number you paid from.";
    }
    if (!/^[A-Za-z0-9]{6,20}$/.test(fields.paymentTrxId.trim())) {
      errors.paymentTrxId = "Enter the transaction ID from your payment message, letters and numbers only.";
    }
  }
  return errors;
}

const inputClass =
  "h-12 w-full border bg-paper px-3 text-base placeholder:text-muted-foreground focus:border-foreground";

export function CheckoutForm({ settings, demo }: { settings: ShopSettings; demo: boolean }) {
  const router = useRouter();
  const cart = useCart();
  const [fields, setFields] = useState<Fields>(EMPTY);
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [placed, setPlaced] = useState(false);
  const summary = useRef<HTMLDivElement>(null);
  // Bumped whenever the error summary should take focus; the effect runs once it is on screen.
  const [focusTick, setFocusTick] = useState(0);
  useEffect(() => {
    if (focusTick > 0) summary.current?.focus();
  }, [focusTick]);

  const set = <K extends keyof Fields>(key: K, value: Fields[K]) =>
    setFields((current) => ({ ...current, [key]: value }));

  /** Re-check one field when the shopper leaves it. */
  function blur(key: CheckoutField) {
    const message = validate(fields)[key];
    setErrors((current) => {
      const next = { ...current };
      if (message) next[key] = message;
      else delete next[key];
      return next;
    });
  }

  const districts = DIVISIONS[fields.division] ?? [];
  const zone = fields.district ? zoneFor(fields.district) : null;
  const deliveryFee = zone === null ? null : zone === "inside_dhaka" ? settings.insideDhakaFee : settings.outsideDhakaFee;
  const total = cart.subtotal + (deliveryFee ?? 0);

  const methods = [
    { value: "cod" as const, label: "Cash on Delivery", help: "Pay the rider in cash when your parcel arrives.", number: "" },
    ...(settings.bkashNumber
      ? [{ value: "bkash" as const, label: "bKash", help: "Send money, then enter the transaction ID.", number: settings.bkashNumber }]
      : []),
    ...(settings.nagadNumber
      ? [{ value: "nagad" as const, label: "Nagad", help: "Send money, then enter the transaction ID.", number: settings.nagadNumber }]
      : []),
  ];
  const chosen = methods.find((m) => m.value === fields.paymentMethod) ?? methods[0];

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    const found = validate(fields);
    setErrors(found);
    if (Object.keys(found).length > 0) {
      // Several problems: focus the summary, which links to each field.
      setFocusTick((n) => n + 1);
      return;
    }

    setSubmitting(true);
    try {
      const result = await placeOrder({
        ...fields,
        items: cart.lines.map((line) => ({ variantId: line.variantId, quantity: line.quantity })),
      });
      if (result.ok && result.orderId) {
        setPlaced(true);
        cart.clear();
        router.push(`/order/${result.orderId}`);
        return;
      }
      setSubmitting(false);
      if (result.fieldErrors && Object.keys(result.fieldErrors).length > 0) setErrors(result.fieldErrors);
      setFormError(result.error ?? (result.fieldErrors ? null : "The order could not be placed. Please try again."));
      setFocusTick((n) => n + 1);
    } catch {
      setSubmitting(false);
      setFormError("The order could not be sent. Check your connection and try again. Nothing was charged.");
      setFocusTick((n) => n + 1);
    }
  }

  if (!cart.ready || placed) {
    return <div aria-hidden="true" className="mt-10 h-64 animate-pulse bg-background" />;
  }

  if (cart.lines.length === 0) {
    return (
      <div className="mt-10 border-t border-border py-20 text-center">
        <p className="text-2xl font-extrabold uppercase tracking-tight">Your cart is empty</p>
        <p className="mt-2 text-secondary">Add something before checking out.</p>
        <Link
          href="/"
          className="mt-6 inline-flex h-12 items-center gap-2 bg-primary px-6 text-sm font-semibold uppercase tracking-[0.14em] text-on-primary transition-opacity hover:opacity-85"
        >
          Back to the shop
          <Icon name="arrowRight" size={16} />
        </Link>
      </div>
    );
  }

  const errorKeys = Object.keys(errors) as CheckoutField[];

  /** Shared props for a text input bound to one field. */
  const bind = (key: Exclude<CheckoutField, "paymentMethod">) => ({
    id: `checkout-${key}`,
    name: key,
    value: fields[key],
    onBlur: () => blur(key),
    "aria-invalid": errors[key] ? true : undefined,
    "aria-describedby": errors[key] ? `checkout-${key}-error` : undefined,
    className: `${inputClass} mt-1 ${errors[key] ? "border-destructive" : "border-border"}`,
  });

  const fieldError = (name: CheckoutField) =>
    errors[name] ? (
      <p id={`checkout-${name}-error`} className="mt-1 flex items-start gap-1.5 text-sm text-destructive">
        <Icon name="alert" size={16} className="mt-0.5 shrink-0" />
        {errors[name]}
      </p>
    ) : null;

  const label = (name: CheckoutField, required = false) => (
    <label htmlFor={`checkout-${name}`} className="block text-sm font-semibold">
      {LABELS[name]} {required ? <span aria-hidden="true">*</span> : <span className="font-normal text-muted-foreground">(optional)</span>}
    </label>
  );

  return (
    <form onSubmit={onSubmit} noValidate className="mt-10 grid gap-10 lg:grid-cols-[minmax(0,1fr)_24rem] lg:gap-16">
      <div className="min-w-0 space-y-10">
        {demo && (
          <p className="border border-border bg-background px-4 py-3 text-sm text-secondary">
            The shop is showing sample products and is not connected to its database yet, so orders cannot be placed.
          </p>
        )}

        {(formError || errorKeys.length > 0) && (
          <div
            ref={summary}
            tabIndex={-1}
            role="alert"
            className="border border-destructive/40 bg-red-50 px-4 py-3 text-sm text-red-900 outline-none"
          >
            {formError && <p className="font-semibold">{formError}</p>}
            {errorKeys.length > 0 && (
              <>
                <p className="font-semibold">
                  {errorKeys.length === 1 ? "There is 1 problem to fix:" : `There are ${errorKeys.length} problems to fix:`}
                </p>
                <ul className="mt-1 list-disc pl-5">
                  {errorKeys.map((key) => (
                    <li key={key}>
                      <a href={`#checkout-${key}`} className="underline underline-offset-2">
                        {LABELS[key]}: {errors[key]}
                      </a>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        )}

        <fieldset>
          <legend className="text-xl font-extrabold uppercase tracking-tight">1. Your details</legend>
          <div className="mt-5 grid gap-5 sm:grid-cols-2">
            <div className="sm:col-span-2">
              {label("customerName", true)}
              <input {...bind("customerName")} onChange={(e) => set("customerName", e.target.value)} autoComplete="name" required />
              {fieldError("customerName")}
            </div>
            <div>
              {label("phone", true)}
              <input
                {...bind("phone")}
                onChange={(e) => set("phone", e.target.value)}
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                placeholder="01XXXXXXXXX"
                required
              />
              {fieldError("phone")}
              {!errors.phone && <p className="mt-1 text-sm text-muted-foreground">We call this number to confirm delivery.</p>}
            </div>
            <div>
              {label("email")}
              <input {...bind("email")} onChange={(e) => set("email", e.target.value)} type="email" autoComplete="email" />
              {fieldError("email")}
            </div>
          </div>
        </fieldset>

        <fieldset>
          <legend className="text-xl font-extrabold uppercase tracking-tight">2. Delivery address</legend>
          <div className="mt-5 grid gap-5 sm:grid-cols-2">
            <div>
              {label("division", true)}
              <select
                {...bind("division")}
                onChange={(e) => setFields((current) => ({ ...current, division: e.target.value, district: "" }))}
                autoComplete="address-level1"
                required
              >
                <option value="">Choose division</option>
                {DIVISION_NAMES.map((division) => (
                  <option key={division} value={division}>
                    {division}
                  </option>
                ))}
              </select>
              {fieldError("division")}
            </div>
            <div>
              {label("district", true)}
              <select
                {...bind("district")}
                onChange={(e) => set("district", e.target.value)}
                disabled={districts.length === 0}
                autoComplete="address-level2"
                required
              >
                <option value="">{districts.length ? "Choose district" : "Choose a division first"}</option>
                {districts.map((district) => (
                  <option key={district} value={district}>
                    {district}
                  </option>
                ))}
              </select>
              {fieldError("district")}
            </div>
            <div className="sm:col-span-2">
              {label("area", true)}
              <input
                {...bind("area")}
                onChange={(e) => set("area", e.target.value)}
                autoComplete="address-level3"
                placeholder="e.g. Dhanmondi, Mirpur 10, Agrabad"
                required
              />
              {fieldError("area")}
            </div>
            <div className="sm:col-span-2">
              {label("addressLine", true)}
              <input
                {...bind("addressLine")}
                onChange={(e) => set("addressLine", e.target.value)}
                autoComplete="street-address"
                placeholder="House 12, Road 5, near the mosque"
                required
              />
              {fieldError("addressLine")}
            </div>
            <div className="sm:col-span-2">
              {label("note")}
              <textarea
                {...bind("note")}
                onChange={(e) => set("note", e.target.value)}
                rows={2}
                maxLength={300}
                className={`${inputClass} mt-1 h-auto py-2 ${errors.note ? "border-destructive" : "border-border"}`}
              />
              {fieldError("note")}
            </div>
          </div>
        </fieldset>

        <fieldset>
          <legend id="checkout-paymentMethod" className="text-xl font-extrabold uppercase tracking-tight">
            3. Payment
          </legend>
          <div className="mt-5 space-y-2">
            {methods.map((method) => (
              <label
                key={method.value}
                className={`flex cursor-pointer items-start gap-3 border p-4 transition-colors ${
                  fields.paymentMethod === method.value ? "border-foreground" : "border-border hover:border-muted-foreground"
                }`}
              >
                <input
                  type="radio"
                  name="paymentMethod"
                  value={method.value}
                  checked={fields.paymentMethod === method.value}
                  onChange={() => set("paymentMethod", method.value)}
                  className="mt-1 size-4 accent-black"
                />
                <span>
                  <span className="block font-semibold">{method.label}</span>
                  <span className="block text-sm text-secondary">{method.help}</span>
                </span>
              </label>
            ))}
          </div>
          {fieldError("paymentMethod")}

          {chosen.value !== "cod" && (
            <div className="mt-5 border border-border bg-background p-4">
              <p className="font-semibold">How to pay with {chosen.label}</p>
              <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-secondary">
                <li>
                  Open {chosen.label} and choose Send Money to{" "}
                  <span className="tabular font-semibold text-foreground">{chosen.number}</span>.
                </li>
                <li>
                  Send exactly{" "}
                  <span className="tabular font-semibold text-foreground">
                    {deliveryFee === null ? "the order total (choose your district first)" : formatBDT(total)}
                  </span>
                  .
                </li>
                <li>Enter the number you paid from and the transaction ID below.</li>
              </ol>
              <p className="mt-2 text-sm text-secondary">
                We check every payment by hand. Your order shows as “payment being verified” until we confirm it.
              </p>
              <div className="mt-4 grid gap-5 sm:grid-cols-2">
                <div>
                  {label("paymentSenderNumber", true)}
                  <input
                    {...bind("paymentSenderNumber")}
                    onChange={(e) => set("paymentSenderNumber", e.target.value)}
                    type="tel"
                    inputMode="tel"
                    placeholder="01XXXXXXXXX"
                    required
                  />
                  {fieldError("paymentSenderNumber")}
                </div>
                <div>
                  {label("paymentTrxId", true)}
                  <input
                    {...bind("paymentTrxId")}
                    onChange={(e) => set("paymentTrxId", e.target.value)}
                    autoComplete="off"
                    autoCapitalize="characters"
                    spellCheck={false}
                    placeholder="e.g. 9BG4K2XQ7L"
                    required
                  />
                  {fieldError("paymentTrxId")}
                </div>
              </div>
            </div>
          )}
        </fieldset>
      </div>

      <aside aria-label="Order summary" className="h-fit bg-background p-6 lg:sticky lg:top-[calc(var(--header-h)+1.5rem)]">
        <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Your order</h2>
        <ul className="mt-4 divide-y divide-border">
          {cart.lines.map((line) => (
            <li key={line.variantId} className="flex gap-3 py-3">
              <LineThumb line={line} className="size-16 bg-paper" />
              <div className="min-w-0 flex-1 text-sm">
                <p className="font-extrabold uppercase leading-tight tracking-wide">{line.name}</p>
                <p className="text-secondary">
                  {line.color} · Size {line.size} · Qty {line.quantity}
                </p>
              </div>
              <p className="tabular text-sm font-semibold">{formatBDT(line.unitPrice * line.quantity)}</p>
            </li>
          ))}
        </ul>
        <dl className="mt-4 space-y-2 border-t border-border pt-4 text-sm">
          <div className="flex justify-between">
            <dt>Subtotal</dt>
            <dd className="tabular">{formatBDT(cart.subtotal)}</dd>
          </div>
          <div className="flex justify-between">
            <dt>Delivery{zone ? ` (${zone === "inside_dhaka" ? "inside Dhaka" : "outside Dhaka"})` : ""}</dt>
            <dd className="tabular">{deliveryFee === null ? "Choose your district" : formatBDT(deliveryFee)}</dd>
          </div>
          <div className="flex justify-between border-t border-border pt-3 text-base font-bold">
            <dt>Total</dt>
            <dd className="tabular" aria-live="polite">
              {formatBDT(total)}
            </dd>
          </div>
        </dl>
        <button
          type="submit"
          disabled={submitting || demo}
          className="mt-6 flex h-14 w-full items-center justify-center gap-2 bg-primary px-6 text-sm font-semibold uppercase tracking-[0.14em] text-on-primary transition-opacity hover:opacity-85 disabled:bg-muted disabled:text-muted-foreground disabled:opacity-100"
        >
          {submitting ? "Placing order…" : "Place order"}
        </button>
        <p className="mt-3 text-center text-xs text-secondary">
          <Link href="/cart" className="underline underline-offset-4">
            Edit cart
          </Link>
        </p>
      </aside>
    </form>
  );
}
