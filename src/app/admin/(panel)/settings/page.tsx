import type { Metadata } from "next";
import { SettingsForm } from "@/components/admin/SettingsForm";
import { PageHeader } from "@/components/admin/ui";
import { requireAdmin } from "@/lib/auth";
import { DEFAULT_SETTINGS, type ShopSettings } from "@/lib/catalog";
import { createSessionClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Settings" };

export default async function AdminSettingsPage() {
  await requireAdmin();
  // Read fresh (not from the shop's cache) so the form always shows what is stored.
  const db = await createSessionClient();
  const { data } = await db
    .from("shop_settings")
    .select("inside_dhaka_fee, outside_dhaka_fee, bkash_number, nagad_number")
    .maybeSingle<{ inside_dhaka_fee: number; outside_dhaka_fee: number; bkash_number: string; nagad_number: string }>();
  const settings: ShopSettings = data
    ? {
        insideDhakaFee: data.inside_dhaka_fee,
        outsideDhakaFee: data.outside_dhaka_fee,
        bkashNumber: data.bkash_number,
        nagadNumber: data.nagad_number,
      }
    : DEFAULT_SETTINGS;

  return (
    <div className="space-y-6">
      <PageHeader title="Settings" description="Delivery charges and the numbers customers pay to." />
      <SettingsForm settings={settings} />
    </div>
  );
}
