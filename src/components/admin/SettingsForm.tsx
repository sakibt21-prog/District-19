"use client";

import { useActionState } from "react";
import { saveSettings } from "@/app/admin/actions";
import type { ShopSettings } from "@/lib/catalog";
import { Notice, helpClass, inputClass, labelClass, primaryButton } from "./ui";

export function SettingsForm({ settings }: { settings: ShopSettings }) {
  const [state, action, pending] = useActionState(saveSettings, null);

  return (
    <form action={action} className="max-w-xl space-y-6" noValidate>
      {state?.error && <Notice tone="bad">{state.error}</Notice>}
      {state?.ok && <Notice tone="good">Settings saved.</Notice>}

      <fieldset className="border border-border bg-paper p-5 md:p-6">
        <legend className="px-1 text-lg font-bold">Delivery charges</legend>
        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label htmlFor="inside_dhaka_fee" className={labelClass}>
              Inside Dhaka (৳)
            </label>
            <input
              id="inside_dhaka_fee"
              name="inside_dhaka_fee"
              type="number"
              inputMode="numeric"
              min={0}
              max={5000}
              step={1}
              defaultValue={settings.insideDhakaFee}
              required
              className={`${inputClass} tabular mt-1`}
            />
          </div>
          <div>
            <label htmlFor="outside_dhaka_fee" className={labelClass}>
              Outside Dhaka (৳)
            </label>
            <input
              id="outside_dhaka_fee"
              name="outside_dhaka_fee"
              type="number"
              inputMode="numeric"
              min={0}
              max={5000}
              step={1}
              defaultValue={settings.outsideDhakaFee}
              required
              className={`${inputClass} tabular mt-1`}
            />
          </div>
        </div>
        <p className={helpClass}>Added to every order at checkout. An address in Dhaka district counts as inside Dhaka.</p>
      </fieldset>

      <fieldset className="border border-border bg-paper p-5 md:p-6">
        <legend className="px-1 text-lg font-bold">Payment numbers</legend>
        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label htmlFor="bkash_number" className={labelClass}>
              bKash number
            </label>
            <input
              id="bkash_number"
              name="bkash_number"
              type="tel"
              inputMode="numeric"
              autoComplete="off"
              placeholder="01XXXXXXXXX"
              defaultValue={settings.bkashNumber}
              className={`${inputClass} tabular mt-1`}
            />
          </div>
          <div>
            <label htmlFor="nagad_number" className={labelClass}>
              Nagad number
            </label>
            <input
              id="nagad_number"
              name="nagad_number"
              type="tel"
              inputMode="numeric"
              autoComplete="off"
              placeholder="01XXXXXXXXX"
              defaultValue={settings.nagadNumber}
              className={`${inputClass} tabular mt-1`}
            />
          </div>
        </div>
        <p className={helpClass}>
          Customers send money to these numbers and enter the transaction ID at checkout. A method with no number is not
          offered at checkout.
        </p>
      </fieldset>

      <button type="submit" disabled={pending} className={primaryButton}>
        {pending ? "Saving…" : "Save settings"}
      </button>
    </form>
  );
}
