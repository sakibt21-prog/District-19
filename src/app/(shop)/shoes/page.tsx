import type { Metadata } from "next";
import { CategoryPage } from "@/components/catalog/CategoryPage";

export const metadata: Metadata = {
  title: "Shoes",
  description: "Shop DISTRICT 19 shoes. Filter by size, colour and availability.",
};

export default function ShoesPage() {
  return <CategoryPage category="shoe" />;
}
