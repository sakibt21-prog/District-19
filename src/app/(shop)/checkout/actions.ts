"use server";

import { updateTag } from "next/cache";
import { BD_PHONE, DIVISIONS, normalisePhone, zoneFor } from "@/lib/bd-locations";
import { CATALOG_TAG, getShopSettings } from "@/lib/catalog";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createServiceClient } from "@/lib/supabase/server";

export interface CheckoutInput {
  customerName: string;
  phone: string;
  email: string;
  division: string;
  district: string;
  area: string;
  addressLine: string;
  note: string;
  paymentMethod: "cod" | "bkash" | "nagad";
  paymentSenderNumber: string;
  paymentTrxId: string;
  items: { variantId: string; quantity: number }[];
}

export type CheckoutField = Exclude<keyof CheckoutInput, "items">;

export interface CheckoutResult {
  ok: boolean;
  orderId?: string;
  /** A problem with the order as a whole, e.g. an item sold out. */
  error?: string;
  /** Problems with individual fields, shown next to each one. */
  fieldErrors?: Partial<Record<CheckoutField, string>>;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const text = (value: unknown) => (typeof value === "string" ? value.trim() : "");

/**
 * Places an order. The browser sends only which variants and how many; prices,
 * stock and the delivery fee are taken from the database inside place_order().
 * Nothing is ever marked as paid here: Cash on Delivery starts unpaid, and a
 * bKash or Nagad order waits for an admin to verify the transaction.
 */
export async function placeOrder(input: CheckoutInput): Promise<CheckoutResult> {
  const fieldErrors: Partial<Record<CheckoutField, string>> = {};

  const customerName = text(input?.customerName);
  const phone = normalisePhone(text(input?.phone));
  const email = text(input?.email);
  const division = text(input?.division);
  const district = text(input?.district);
  const area = text(input?.area);
  const addressLine = text(input?.addressLine);
  const note = text(input?.note);
  const paymentMethod = input?.paymentMethod;
  const paymentSenderNumber = normalisePhone(text(input?.paymentSenderNumber));
  const paymentTrxId = text(input?.paymentTrxId).toUpperCase();

  if (customerName.length < 2 || customerName.length > 80) fieldErrors.customerName = "Enter your full name.";
  if (!BD_PHONE.test(phone)) fieldErrors.phone = "Enter an 11-digit mobile number, like 01712345678.";
  if (email && (!EMAIL.test(email) || email.length > 120)) fieldErrors.email = "Enter a valid email address, or leave it empty.";
  if (!DIVISIONS[division]) fieldErrors.division = "Choose your division.";
  if (!DIVISIONS[division]?.includes(district)) fieldErrors.district = "Choose your district.";
  if (area.length < 2 || area.length > 80) fieldErrors.area = "Enter your area or thana.";
  if (addressLine.length < 5 || addressLine.length > 200) {
    fieldErrors.addressLine = "Enter your house, road and any landmark.";
  }
  if (note.length > 300) fieldErrors.note = "Keep the note under 300 characters.";

  const settings = await getShopSettings();
  if (paymentMethod !== "cod" && paymentMethod !== "bkash" && paymentMethod !== "nagad") {
    fieldErrors.paymentMethod = "Choose how you want to pay.";
  } else if (paymentMethod !== "cod") {
    const shopNumber = paymentMethod === "bkash" ? settings.bkashNumber : settings.nagadNumber;
    if (!shopNumber) fieldErrors.paymentMethod = "This payment method is not available right now. Choose another.";
    if (!BD_PHONE.test(paymentSenderNumber)) {
      fieldErrors.paymentSenderNumber = "Enter the 11-digit number you paid from.";
    }
    if (!/^[A-Z0-9]{6,20}$/.test(paymentTrxId)) {
      fieldErrors.paymentTrxId = "Enter the transaction ID from your payment message, letters and numbers only.";
    }
  }

  const items = Array.isArray(input?.items) ? input.items : [];
  const validItems =
    items.length > 0 &&
    items.length <= 40 &&
    items.every(
      (item) =>
        UUID.test(item?.variantId ?? "") &&
        Number.isInteger(item?.quantity) &&
        item.quantity >= 1 &&
        item.quantity <= 20,
    );

  if (Object.keys(fieldErrors).length > 0) return { ok: false, fieldErrors };
  if (!isSupabaseConfigured()) {
    return {
      ok: false,
      error: "Ordering is not switched on yet: the shop is showing sample products and is not connected to its database.",
    };
  }
  if (!validItems) {
    return { ok: false, error: "Your cart could not be read. Go back to the cart, check it, and try again." };
  }

  let db;
  try {
    db = createServiceClient();
  } catch {
    return { ok: false, error: "Ordering is not available right now. Please try again later." };
  }

  const { data, error } = await db.rpc("place_order", {
    payload: {
      customer_name: customerName,
      phone,
      email,
      division,
      district,
      area,
      address_line: addressLine,
      note,
      delivery_zone: zoneFor(district),
      payment_method: paymentMethod,
      payment_sender_number: paymentSenderNumber,
      payment_trx_id: paymentTrxId,
      items: items.map((item) => ({ variant_id: item.variantId, quantity: item.quantity })),
    },
  });

  if (error) {
    const message = error.message ?? "";
    if (message.includes("OUT_OF_STOCK")) {
      const which = message.split("OUT_OF_STOCK:")[1]?.trim();
      return {
        ok: false,
        error: `${which ? `${which} has` : "An item in your cart has"} just sold out or has fewer left than you asked for. Update your cart and try again.`,
      };
    }
    if (message.includes("ITEM_UNAVAILABLE")) {
      return { ok: false, error: "An item in your cart is no longer available. Remove it from your cart and try again." };
    }
    console.error("place_order failed:", message);
    return { ok: false, error: "The order could not be placed. Nothing was charged. Please try again." };
  }

  const orderId = (data as { order_id?: string } | null)?.order_id;
  if (!orderId) return { ok: false, error: "The order could not be placed. Please try again." };

  // Stock changed, so the shop's cached product data is refreshed.
  updateTag(CATALOG_TAG);
  return { ok: true, orderId };
}
