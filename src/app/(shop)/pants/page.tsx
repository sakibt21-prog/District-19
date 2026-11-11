import type { Metadata } from "next";
import { CategoryPage } from "@/components/catalog/CategoryPage";

export const metadata: Metadata = {
  title: "Pants",
  description: "Shop DISTRICT 19 pants. Filter by size, colour and availability.",
};

export default function PantsPage() {
  return <CategoryPage category="pant" />;
}
