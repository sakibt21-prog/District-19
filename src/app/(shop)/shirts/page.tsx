import type { Metadata } from "next";
import { CategoryPage } from "@/components/catalog/CategoryPage";

export const metadata: Metadata = {
  title: "Shirts",
  description: "Shop DISTRICT 19 shirts. Filter by size, colour and availability.",
};

export default function ShirtsPage() {
  return <CategoryPage category="shirt" />;
}
