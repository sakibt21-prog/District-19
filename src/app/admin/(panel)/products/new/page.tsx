import type { Metadata } from "next";
import { randomUUID } from "node:crypto";
import { ProductForm } from "@/components/admin/ProductForm";
import { PageHeader } from "@/components/admin/ui";
import { requireAdmin } from "@/lib/auth";

export const metadata: Metadata = { title: "Add product" };

export default async function NewProductPage() {
  await requireAdmin();
  return (
    <div className="space-y-6">
      <PageHeader title="Add product" description="Save as a draft to keep working on it, or publish to put it on the shop." />
      <ProductForm
        initial={{
          // The id is fixed up front so photos can be uploaded into the product's own folder before the first save.
          id: randomUUID(),
          isExisting: false,
          name: "",
          category: "shirt",
          description: "",
          price: null,
          salePrice: null,
          status: "draft",
          isFeatured: false,
          isNew: true,
          cut: "tee",
          sizes: ["S", "M", "L", "XL", "XXL"],
          colors: [{ name: "Black", hex: "#1b1b1d" }],
          stock: {},
          images: [],
        }}
      />
    </div>
  );
}
