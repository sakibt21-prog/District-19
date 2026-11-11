import type { Metadata } from "next";
import Link from "next/link";
import { deleteProduct, setProductFeatured, setProductStatus } from "@/app/admin/actions";
import { ConfirmButton, SubmitButton } from "@/components/admin/ConfirmButton";
import { Badge, EmptyState, PageHeader, dangerButton, primaryButton, secondaryButton } from "@/components/admin/ui";
import { ProductVisual } from "@/components/product/ProductVisual";
import { Icon } from "@/components/site/Icon";
import { listAdminProducts } from "@/lib/admin-data";
import { requireAdmin } from "@/lib/auth";
import { formatBDT } from "@/lib/format";
import { CATEGORY_LABEL, effectivePrice, isOnSale, totalStock } from "@/lib/types";

export const metadata: Metadata = { title: "Products" };

export default async function AdminProductsPage() {
  await requireAdmin();
  const products = await listAdminProducts();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Products"
        description="Published products appear on the shop straight away. Drafts are visible only here."
        action={
          <Link href="/admin/products/new" className={primaryButton}>
            <Icon name="plus" size={16} />
            Add product
          </Link>
        }
      />

      {products.length === 0 ? (
        <EmptyState title="No products yet">
          <p>Add your first release with its photos, sizes and stock.</p>
          <Link href="/admin/products/new" className={`${primaryButton} mt-4`}>
            Add product
          </Link>
        </EmptyState>
      ) : (
        <ul className="divide-y divide-border border border-border bg-paper">
          {products.map((product) => {
            const stock = totalStock(product);
            const published = product.status === "published";
            return (
              <li key={product.id} className="flex flex-col gap-4 p-4 lg:flex-row lg:items-center">
                <div className="flex min-w-0 flex-1 items-center gap-4">
                  <span className="grid size-20 shrink-0 place-items-center bg-background p-2">
                    <ProductVisual product={product} labelled={false} sizes="80px" className="w-full" />
                  </span>
                  <div className="min-w-0">
                    <Link
                      href={`/admin/products/${product.id}`}
                      className="font-bold underline-offset-4 hover:underline"
                    >
                      {product.name}
                    </Link>
                    <p className="mt-0.5 text-sm text-secondary">
                      {CATEGORY_LABEL[product.category]} ·{" "}
                      <span className="tabular">
                        {formatBDT(effectivePrice(product))}
                        {isOnSale(product) && (
                          <span className="ml-1 line-through">{formatBDT(product.price)}</span>
                        )}
                      </span>{" "}
                      · {product.images.length} {product.images.length === 1 ? "photo" : "photos"}
                    </p>
                    <p className="mt-2 flex flex-wrap gap-1.5">
                      <Badge tone={published ? "good" : "neutral"}>{published ? "Published" : "Draft"}</Badge>
                      <Badge tone={stock === 0 ? "bad" : stock <= 5 ? "warn" : "neutral"}>
                        {stock === 0 ? "Out of stock" : `${stock} in stock`}
                      </Badge>
                      {product.isFeatured && <Badge tone="info">Featured</Badge>}
                      {product.isNew && <Badge tone="info">New release</Badge>}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Link href={`/admin/products/${product.id}`} className={secondaryButton}>
                    Edit
                  </Link>
                  <form action={setProductStatus.bind(null, product.id, published ? "draft" : "published")}>
                    <SubmitButton className={secondaryButton}>{published ? "Unpublish" : "Publish"}</SubmitButton>
                  </form>
                  <form action={setProductFeatured.bind(null, product.id, !product.isFeatured)}>
                    <SubmitButton className={secondaryButton}>
                      {product.isFeatured ? "Remove from featured" : "Feature"}
                    </SubmitButton>
                  </form>
                  <form action={deleteProduct.bind(null, product.id)}>
                    <ConfirmButton
                      message={`Delete "${product.name}" and all its photos? This cannot be undone.`}
                      className={dangerButton}
                    >
                      Delete
                    </ConfirmButton>
                  </form>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
