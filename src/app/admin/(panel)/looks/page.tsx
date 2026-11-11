import type { Metadata } from "next";
import { randomUUID } from "node:crypto";
import { deleteLook } from "@/app/admin/actions";
import { ConfirmButton } from "@/components/admin/ConfirmButton";
import { LookEditor, type LookEditorProduct } from "@/components/admin/LookEditor";
import { Badge, EmptyState, PageHeader, dangerButton } from "@/components/admin/ui";
import { listAdminLooks, listAdminProducts } from "@/lib/admin-data";
import { requireAdmin } from "@/lib/auth";

export const metadata: Metadata = { title: "Looks" };

export default async function AdminLooksPage() {
  await requireAdmin();
  const [looks, allProducts] = await Promise.all([listAdminLooks(), listAdminProducts()]);
  const products: LookEditorProduct[] = allProducts.map((p) => ({
    id: p.id,
    name: p.name,
    category: p.category,
    published: p.status === "published",
  }));
  const nextPosition = looks.reduce((max, look) => Math.max(max, look.sortOrder + 1), 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Looks"
        description="Outfits for the “Try the Look” row on the home page: a model photo and the products worn in it."
      />

      <details className="border border-border bg-paper" open={looks.length === 0}>
        <summary className="flex min-h-12 items-center px-5 font-bold">Add a look</summary>
        <div className="border-t border-border p-5">
          {products.length === 0 ? (
            <EmptyState title="Add products first">A look is built from products, so create at least one product.</EmptyState>
          ) : (
            <LookEditor
              // A fresh id each time the page loads, so a saved look is never overwritten by the next one.
              key={`new-${looks.length}`}
              products={products}
              initial={{
                id: randomUUID(),
                isExisting: false,
                name: `Look ${String(looks.length + 1).padStart(2, "0")}`,
                modelImagePath: null,
                modelImageUrl: null,
                isPublished: true,
                sortOrder: nextPosition,
                productIds: [],
              }}
            />
          )}
        </div>
      </details>

      {looks.length === 0 ? (
        <EmptyState title="No looks yet">
          Until a look is published, the “Try the Look” row stays hidden on the shop.
        </EmptyState>
      ) : (
        <ul className="space-y-3">
          {looks.map((look) => (
            <li key={look.id}>
              <details className="border border-border bg-paper">
                <summary className="flex min-h-12 flex-wrap items-center gap-3 px-5 py-2">
                  <span className="font-bold">{look.name}</span>
                  <Badge tone={look.isPublished ? "good" : "neutral"}>{look.isPublished ? "On the shop" : "Hidden"}</Badge>
                  <span className="text-sm text-secondary">
                    {look.productIds.length} {look.productIds.length === 1 ? "product" : "products"}
                  </span>
                </summary>
                <div className="space-y-5 border-t border-border p-5">
                  <LookEditor
                    products={products}
                    initial={{
                      id: look.id,
                      isExisting: true,
                      name: look.name,
                      modelImagePath: look.modelImagePath,
                      modelImageUrl: look.modelImageUrl,
                      isPublished: look.isPublished,
                      sortOrder: look.sortOrder,
                      productIds: look.productIds,
                    }}
                  />
                  <form action={deleteLook.bind(null, look.id)} className="border-t border-border pt-5">
                    <ConfirmButton
                      message={`Delete "${look.name}" and its model photo? This cannot be undone.`}
                      className={dangerButton}
                    >
                      Delete look
                    </ConfirmButton>
                  </form>
                </div>
              </details>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
